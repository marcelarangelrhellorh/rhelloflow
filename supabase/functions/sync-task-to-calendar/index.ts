import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decrypt token (reverse of encryption in callback)
function decryptToken(encryptedToken: string): string {
  try {
    return atob(encryptedToken).split('').reverse().join('');
  } catch {
    return encryptedToken;
  }
}

// Encrypt token for storage
function encryptToken(token: string): string {
  return btoa(token.split('').reverse().join(''));
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Google credentials not configured');
    return null;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.error) {
    console.error('Token refresh error:', data.error);
    return null;
  }

  return { access_token: data.access_token, expires_in: data.expires_in };
}

async function getValidAccessToken(supabaseAdmin: any, userId: string): Promise<string | null> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at, google_calendar_connected')
    .eq('id', userId)
    .single();

  if (error || !profile?.google_calendar_connected) {
    console.error('Profile not found or calendar not connected');
    return null;
  }

  const accessToken = decryptToken(profile.google_access_token);
  const refreshToken = profile.google_refresh_token ? decryptToken(profile.google_refresh_token) : null;
  const expiresAt = new Date(profile.google_token_expires_at);

  // Check if token is expired (with 5 minute buffer)
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000 && refreshToken) {
    console.log('Token expired, refreshing...');
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens) {
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();
      await supabaseAdmin
        .from('profiles')
        .update({
          google_access_token: encryptToken(newTokens.access_token),
          google_token_expires_at: newExpiresAt,
        })
        .eq('id', userId);
      return newTokens.access_token;
    }
    return null;
  }

  return accessToken;
}

function taskToCalendarEvent(task: any) {
  const dueDate = task.due_date ? new Date(task.due_date) : new Date();
  const dateStr = dueDate.toISOString().split('T')[0];
  
  const startTime = task.start_time || '09:00:00';
  const endTime = task.end_time || (() => {
    const [h, m, s] = startTime.split(':');
    return `${String(parseInt(h) + 1).padStart(2, '0')}:${m}:${s}`;
  })();

  const startDateTime = `${dateStr}T${startTime}`;
  const endDateTime = `${dateStr}T${endTime}`;

  const priorityColors: Record<string, string> = {
    'urgent': '11', // Red
    'high': '6', // Orange  
    'medium': '5', // Yellow
    'low': '2', // Green
  };

  return {
    summary: task.title,
    description: task.description || '',
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    status: task.status === 'done' ? 'cancelled' : 'confirmed',
    colorId: priorityColors[task.priority] || '5',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: task.reminder_minutes || 30 },
      ],
    },
    extendedProperties: {
      private: {
        task_id: task.id,
        source: 'rhello-flow',
        priority: task.priority || 'medium',
      },
    },
  };
}

async function createCalendarEvent(accessToken: string, event: any, calendarId: string = 'primary'): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create event');
  }

  return response.json();
}

async function updateCalendarEvent(accessToken: string, eventId: string, event: any, calendarId: string = 'primary'): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update event');
  }

  return response.json();
}

async function deleteCalendarEvent(accessToken: string, eventId: string, calendarId: string = 'primary'): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  // 404 or 410 means event already deleted - not an error
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete event');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { task_id, action } = await req.json();

    if (!task_id || !action) {
      return new Response(
        JSON.stringify({ error: 'task_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id);
    if (!accessToken) {
      // Log the error
      await supabaseAdmin.from('sync_logs').insert({
        user_id: user.id,
        task_id,
        action,
        status: 'error',
        error_message: 'Google Calendar não conectado ou token inválido',
      });

      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected', connected: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get task data
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if sync is enabled for this task
    if (!task.sync_enabled && action !== 'delete') {
      return new Response(
        JSON.stringify({ success: true, message: 'Sync disabled for this task' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarId = task.calendar_id || 'primary';
    let result: any = null;
    let googleEventId: string | null = task.google_calendar_event_id;

    try {
      if (action === 'create') {
        const event = taskToCalendarEvent(task);
        result = await createCalendarEvent(accessToken, event, calendarId);
        googleEventId = result.id;

        // Update task with event ID
        await supabaseAdmin
          .from('tasks')
          .update({
            google_calendar_event_id: googleEventId,
            google_calendar_synced: true,
            google_calendar_last_sync: new Date().toISOString(),
          })
          .eq('id', task_id);

      } else if (action === 'update') {
        if (!task.google_calendar_event_id) {
          // Create new event if doesn't exist
          const event = taskToCalendarEvent(task);
          result = await createCalendarEvent(accessToken, event, calendarId);
          googleEventId = result.id;
        } else {
          // Update existing event
          const event = taskToCalendarEvent(task);
          result = await updateCalendarEvent(accessToken, task.google_calendar_event_id, event, calendarId);
        }

        // Update task sync status
        await supabaseAdmin
          .from('tasks')
          .update({
            google_calendar_event_id: googleEventId,
            google_calendar_synced: true,
            google_calendar_last_sync: new Date().toISOString(),
          })
          .eq('id', task_id);

      } else if (action === 'delete') {
        if (task.google_calendar_event_id) {
          await deleteCalendarEvent(accessToken, task.google_calendar_event_id, calendarId);
        }

        // Clear sync fields
        await supabaseAdmin
          .from('tasks')
          .update({
            google_calendar_event_id: null,
            google_calendar_synced: false,
          })
          .eq('id', task_id);
      }

      // Log success
      await supabaseAdmin.from('sync_logs').insert({
        user_id: user.id,
        task_id,
        action,
        status: 'success',
        google_event_id: googleEventId,
        details: { event_link: result?.htmlLink },
      });

      console.log(`Task ${task_id} synced successfully (${action})`);

      return new Response(
        JSON.stringify({
          success: true,
          action,
          google_event_id: googleEventId,
          event_link: result?.htmlLink,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (syncError: any) {
      console.error('Sync error:', syncError);

      // Log error
      await supabaseAdmin.from('sync_logs').insert({
        user_id: user.id,
        task_id,
        action,
        status: 'error',
        error_message: syncError.message,
        google_event_id: googleEventId,
      });

      // Mark task as not synced
      await supabaseAdmin
        .from('tasks')
        .update({ google_calendar_synced: false })
        .eq('id', task_id);

      return new Response(
        JSON.stringify({ error: syncError.message, success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
