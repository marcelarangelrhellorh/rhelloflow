import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decrypt token
function decryptToken(encrypted: string): string {
  return atob(encrypted).split('').reverse().join('');
}

// Encrypt token
function encryptToken(token: string): string {
  return btoa(token.split('').reverse().join(''));
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Google credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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

    const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
    return { accessToken: data.access_token, expiresAt };
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();

    // Get user's Google Calendar credentials
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_calendar_connected, google_access_token, google_refresh_token, google_token_expires_at, google_calendar_last_sync')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle disconnect action
    if (action === 'disconnect') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          google_calendar_connected: false,
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_calendar_last_sync: null,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to disconnect:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Google Calendar disconnected for user ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Google Calendar disconnected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle status action
    if (action === 'status') {
      return new Response(
        JSON.stringify({
          connected: profile.google_calendar_connected || false,
          lastSync: profile.google_calendar_last_sync || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other actions, check if connected
    if (!profile.google_calendar_connected || !profile.google_access_token) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected', connected: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = decryptToken(profile.google_access_token);
    const refreshToken = profile.google_refresh_token ? decryptToken(profile.google_refresh_token) : null;
    const tokenExpiresAt = new Date(profile.google_token_expires_at);

    // Check if token needs refresh (5 minutes buffer)
    if (tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      if (!refreshToken) {
        console.error('Token expired and no refresh token available');
        // Mark as disconnected
        await supabaseAdmin
          .from('profiles')
          .update({ google_calendar_connected: false })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ error: 'Session expired. Please reconnect.', connected: false }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Refreshing token for user ${user.id}`);
      const newTokens = await refreshAccessToken(refreshToken);

      if (!newTokens) {
        // Mark as disconnected
        await supabaseAdmin
          .from('profiles')
          .update({ google_calendar_connected: false })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ error: 'Failed to refresh token. Please reconnect.', connected: false }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update tokens in database
      await supabaseAdmin
        .from('profiles')
        .update({
          google_access_token: encryptToken(newTokens.accessToken),
          google_token_expires_at: newTokens.expiresAt,
        })
        .eq('id', user.id);

      accessToken = newTokens.accessToken;
    }

    // Execute the requested action
    const calendarApiBase = 'https://www.googleapis.com/calendar/v3';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let response: Response;
    let result: unknown;

    switch (action) {
      case 'getEvents': {
        const { startDate, endDate, maxResults = 50 } = params;
        const url = new URL(`${calendarApiBase}/calendars/primary/events`);
        url.searchParams.set('timeMin', startDate);
        url.searchParams.set('timeMax', endDate);
        url.searchParams.set('maxResults', maxResults.toString());
        url.searchParams.set('singleEvents', 'true');
        url.searchParams.set('orderBy', 'startTime');

        response = await fetch(url.toString(), { headers });
        result = await response.json();
        break;
      }

      case 'createEvent': {
        const { eventData } = params;
        response = await fetch(`${calendarApiBase}/calendars/primary/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify(eventData),
        });
        result = await response.json();

        // Update last sync
        await supabaseAdmin
          .from('profiles')
          .update({ google_calendar_last_sync: new Date().toISOString() })
          .eq('id', user.id);
        break;
      }

      case 'updateEvent': {
        const { eventId, eventData } = params;
        response = await fetch(`${calendarApiBase}/calendars/primary/events/${eventId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(eventData),
        });
        result = await response.json();

        // Update last sync
        await supabaseAdmin
          .from('profiles')
          .update({ google_calendar_last_sync: new Date().toISOString() })
          .eq('id', user.id);
        break;
      }

      case 'deleteEvent': {
        const { eventId } = params;
        response = await fetch(`${calendarApiBase}/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers,
        });
        
        if (response.status === 204) {
          result = { success: true };
        } else {
          result = await response.json();
        }

        // Update last sync
        await supabaseAdmin
          .from('profiles')
          .update({ google_calendar_last_sync: new Date().toISOString() })
          .eq('id', user.id);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!response.ok && response.status !== 204) {
      console.error(`Calendar API error for action ${action}:`, result);
      return new Response(
        JSON.stringify({ error: 'Calendar API error', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
