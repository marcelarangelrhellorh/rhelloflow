import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENCRYPTION_KEY = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || "default-key-for-dev";

// AES-GCM encryption for tokens
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

serve(async (req) => {
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

    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build update data with encrypted tokens
    const updateData: Record<string, unknown> = {
      google_calendar_connected: true,
      google_access_token: await encryptToken(access_token),
      google_token_expires_at: expiresAt,
      google_calendar_last_sync: new Date().toISOString(),
    };

    // Handle refresh token
    if (refresh_token) {
      updateData.google_refresh_token = await encryptToken(refresh_token);
      console.log('[google-calendar-callback] Saving new refresh_token with AES-GCM encryption');
    } else {
      // Check if existing token needs migration from legacy format
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', user.id)
        .single();
      
      if (existingProfile?.google_refresh_token) {
        // Migrate existing token to new encryption format
        try {
          const decrypted = await decryptToken(existingProfile.google_refresh_token);
          updateData.google_refresh_token = await encryptToken(decrypted);
          console.log('[google-calendar-callback] Migrated existing refresh_token to AES-GCM');
        } catch {
          console.log('[google-calendar-callback] Keeping existing refresh_token as-is');
        }
      } else {
        console.warn('[google-calendar-callback] No refresh_token available');
      }
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

    console.log(`Google Calendar connected for user ${user.id} with AES-GCM encryption`);

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
