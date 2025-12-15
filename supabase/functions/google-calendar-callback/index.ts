import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption for tokens (in production, use a proper encryption library)
function encryptToken(token: string): string {
  // Base64 encode with a simple transformation
  return btoa(token.split('').reverse().join(''));
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

    const { code, redirectUri, state } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate state
    try {
      const decodedState = JSON.parse(atob(state));
      if (decodedState.userId !== user.id) {
        console.error('State mismatch: userId does not match');
        return new Response(
          JSON.stringify({ error: 'Invalid state parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      console.error('Failed to decode state');
      return new Response(
        JSON.stringify({ error: 'Invalid state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Google Calendar not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      return new Response(
        JSON.stringify({ error: tokenData.error_description || 'Failed to exchange code for tokens' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    console.log('[google-calendar-callback] Tokens received:', {
      has_access_token: !!access_token,
      has_refresh_token: !!refresh_token,
      expires_in
    });

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Use service role to update profile (bypassing RLS for this specific update)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If Google didn't return a new refresh_token, preserve the existing one
    let finalRefreshToken = refresh_token;
    if (!refresh_token) {
      console.log('[google-calendar-callback] No refresh_token received, checking for existing one...');
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', user.id)
        .single();
      
      if (existingProfile?.google_refresh_token) {
        console.log('[google-calendar-callback] Preserving existing refresh_token');
        // Keep existing encrypted token as-is (don't re-encrypt)
        finalRefreshToken = null; // Will be handled below
      } else {
        console.warn('[google-calendar-callback] No existing refresh_token found - user may need to disconnect and reconnect');
      }
    }

    // Update user profile with encrypted tokens
    const updateData: Record<string, unknown> = {
      google_calendar_connected: true,
      google_access_token: encryptToken(access_token),
      google_token_expires_at: expiresAt,
      google_calendar_last_sync: new Date().toISOString(),
    };

    // Only update refresh_token if we received a new one from Google
    if (refresh_token) {
      updateData.google_refresh_token = encryptToken(refresh_token);
      console.log('[google-calendar-callback] Saving new refresh_token');
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Google Calendar connected for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Google Calendar connected successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
