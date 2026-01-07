import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENCRYPTION_KEY = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || "default-key-for-dev";

// AES-GCM encryption
async function encryptToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );
  return btoa(JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  }));
}

// AES-GCM decryption with legacy fallback
async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const data = JSON.parse(atob(encryptedToken));
    if (data.iv && data.data) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(data.iv) },
        key,
        new Uint8Array(data.data)
      );
      return new TextDecoder().decode(decrypted);
    }
    throw new Error("Not AES-GCM format");
  } catch {
    // Legacy fallback
    try {
      return atob(encryptedToken).split('').reverse().join('');
    } catch {
      return encryptedToken;
    }
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.error) return null;
  return { access_token: data.access_token, expires_in: data.expires_in };
}

async function getValidAccessToken(supabaseAdmin: any, userId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at, google_calendar_connected')
    .eq('id', userId)
    .single();

  if (!profile?.google_calendar_connected) return null;

  const accessToken = await decryptToken(profile.google_access_token);
  const refreshToken = profile.google_refresh_token ? await decryptToken(profile.google_refresh_token) : null;
  const expiresAt = new Date(profile.google_token_expires_at);

  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000 && refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens) {
      await supabaseAdmin
        .from('profiles')
        .update({
          google_access_token: await encryptToken(newTokens.access_token),
          google_token_expires_at: new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString(),
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

  return {
    summary: task.title,
    description: task.description || '',
    start: { dateTime: `${dateStr}T${startTime}`, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: `${dateStr}T${endTime}`, timeZone: 'America/Sao_Paulo' },
    status: task.status === 'done' ? 'cancelled' : 'confirmed',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: task.reminder_minutes || 30 }] },
    extendedProperties: { private: { task_id: task.id, source: 'rhello-flow', priority: task.priority || 'medium' } },
  };
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { sync_direction = 'to_calendar' } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = await getValidAccessToken(supabaseAdmin, user.id);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected', connected: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('assignee_id', user.id)
      .eq('sync_enabled', true)
      .or('google_calendar_synced.eq.false,google_calendar_event_id.is.null')
      .not('status', 'eq', 'done');

    if (tasksError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results = { synced: 0, errors: 0, skipped: 0 };
    const errors: string[] = [];

    for (const task of tasks || []) {
      try {
        const event = taskToCalendarEvent(task);
        const calendarId = task.calendar_id || 'primary';

        let response;
        if (task.google_calendar_event_id) {
          response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${task.google_calendar_event_id}`,
            {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(event),
            }
          );
        } else {
          response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(event),
            }
          );
        }

        if (response.ok) {
          const data = await response.json();
          await supabaseAdmin.from('tasks').update({
            google_calendar_event_id: data.id,
            google_calendar_synced: true,
            google_calendar_last_sync: new Date().toISOString(),
          }).eq('id', task.id);
          results.synced++;
        } else {
          const errorData = await response.json();
          errors.push(`Task ${task.id}: ${errorData.error?.message || 'Unknown error'}`);
          results.errors++;
        }
      } catch (err: any) {
        errors.push(`Task ${task.id}: ${err.message}`);
        results.errors++;
      }
    }

    await supabaseAdmin.from('sync_logs').insert({
      user_id: user.id,
      action: 'bulk_sync',
      status: results.errors === 0 ? 'success' : 'error',
      error_message: errors.length > 0 ? errors.join('; ') : null,
      details: results,
    });

    console.log(`Bulk sync completed for user ${user.id}: ${JSON.stringify(results)}`);

    return new Response(
      JSON.stringify({ success: true, results, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Bulk sync error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
