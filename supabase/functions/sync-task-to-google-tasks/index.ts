import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    console.error('Profile not found or Google not connected');
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

function taskToGoogleTask(task: any) {
  const googleTask: any = {
    title: task.title,
    notes: task.description || '',
    status: task.status === 'done' ? 'completed' : 'needsAction',
  };

  // Add due date if exists
  if (task.due_date) {
    // Google Tasks API expects RFC 3339 timestamp
    googleTask.due = new Date(task.due_date).toISOString();
  }

  return googleTask;
}

async function createGoogleTask(accessToken: string, task: any, taskListId: string = '@default'): Promise<any> {
  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google Tasks API error: ${response.status}`);
  }

  return response.json();
}

async function updateGoogleTask(accessToken: string, googleTaskId: string, task: any, taskListId: string = '@default'): Promise<any> {
  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(googleTaskId)}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google Tasks API error: ${response.status}`);
  }

  return response.json();
}

async function deleteGoogleTask(accessToken: string, googleTaskId: string, taskListId: string = '@default'): Promise<void> {
  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(googleTaskId)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  // 404 or 410 means task already deleted - not an error
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google Tasks API error: ${response.status}`);
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
      await supabaseAdmin.from('sync_logs').insert({
        user_id: user.id,
        task_id,
        action,
        status: 'error',
        error_message: 'Google não conectado ou token inválido',
      });

      return new Response(
        JSON.stringify({ error: 'Google not connected', connected: false }),
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

    const taskListId = task.google_task_list_id || '@default';
    let result: any = null;
    let googleTaskId: string | null = task.google_task_id;

    try {
      if (action === 'create') {
        const googleTask = taskToGoogleTask(task);
        result = await createGoogleTask(accessToken, googleTask, taskListId);
        googleTaskId = result.id;

        // Update task with Google Task ID
        await supabaseAdmin
          .from('tasks')
          .update({
            google_task_id: googleTaskId,
            google_task_synced: true,
            google_task_last_sync: new Date().toISOString(),
          })
          .eq('id', task_id);

      } else if (action === 'update') {
        if (!task.google_task_id) {
          // Create new task if doesn't exist
          const googleTask = taskToGoogleTask(task);
          result = await createGoogleTask(accessToken, googleTask, taskListId);
          googleTaskId = result.id;
        } else {
          // Update existing task
          const googleTask = taskToGoogleTask(task);
          result = await updateGoogleTask(accessToken, task.google_task_id, googleTask, taskListId);
          googleTaskId = task.google_task_id;
        }

        // Update task sync status
        await supabaseAdmin
          .from('tasks')
          .update({
            google_task_id: googleTaskId,
            google_task_synced: true,
            google_task_last_sync: new Date().toISOString(),
          })
          .eq('id', task_id);

      } else if (action === 'delete') {
        if (task.google_task_id) {
          await deleteGoogleTask(accessToken, task.google_task_id, taskListId);
        }

        // Clear sync fields
        await supabaseAdmin
          .from('tasks')
          .update({
            google_task_id: null,
            google_task_synced: false,
          })
          .eq('id', task_id);
      }

      // Log success
      await supabaseAdmin.from('sync_logs').insert({
        user_id: user.id,
        task_id,
        action,
        status: 'success',
        google_event_id: googleTaskId,
        details: { api: 'google_tasks' },
      });

      console.log(`Task ${task_id} synced to Google Tasks successfully (${action})`);

      return new Response(
        JSON.stringify({
          success: true,
          action,
          google_task_id: googleTaskId,
          task_link: 'https://tasks.google.com/',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (syncError: any) {
      console.error('Google Tasks sync error:', syncError);

      // Log error
      await supabaseAdmin.from('sync_logs').insert({
        user_id: user.id,
        task_id,
        action,
        status: 'error',
        error_message: syncError.message,
        google_event_id: googleTaskId,
      });

      // Mark task as not synced
      await supabaseAdmin
        .from('tasks')
        .update({ google_task_synced: false })
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
