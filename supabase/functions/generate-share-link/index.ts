import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate secure random token
function generateToken(length: number = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(x => chars[x % chars.length])
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { vaga_id, password, expires_in_days, max_submissions } = await req.json();

    if (!vaga_id) {
      return new Response(
        JSON.stringify({ error: 'vaga_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify vaga exists
    const { data: vaga, error: vagaError } = await supabase
      .from('vagas')
      .select('id')
      .eq('id', vaga_id)
      .single();

    if (vagaError || !vaga) {
      return new Response(
        JSON.stringify({ error: 'Vaga not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token
    const token = generateToken(24);

    // Calculate expiration
    let expires_at = null;
    if (expires_in_days && expires_in_days > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expires_in_days);
      expires_at = expiryDate.toISOString();
    }

    // Hash password if provided
    let password_hash = null;
    if (password && password.trim()) {
      // Simple hash for demonstration - in production use bcrypt
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      password_hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Create share link
    const { data: shareLink, error: insertError } = await supabase
      .from('share_links')
      .insert({
        vaga_id,
        token,
        password_hash,
        expires_at,
        max_submissions: max_submissions || null,
        created_by: user.id,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating share link:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create share link' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return share link with URL
    const shareUrl = `${req.headers.get('origin') || 'https://app.rhello.com'}/share/${token}`;

    return new Response(
      JSON.stringify({ 
        ...shareLink, 
        url: shareUrl 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-share-link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
