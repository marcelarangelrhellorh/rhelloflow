import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { link_id } = await req.json();

    if (!link_id) {
      return new Response(
        JSON.stringify({ error: 'link_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing link
    const { data: oldLink, error: fetchError } = await supabase
      .from('share_links')
      .select('*')
      .eq('id', link_id)
      .single();

    if (fetchError || !oldLink) {
      return new Response(
        JSON.stringify({ error: 'Share link not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new token
    const newToken = generateToken(24);

    // Create new link with same settings
    const { data: newLink, error: insertError } = await supabase
      .from('share_links')
      .insert({
        vaga_id: oldLink.vaga_id,
        token: newToken,
        password_hash: oldLink.password_hash,
        expires_at: oldLink.expires_at,
        max_submissions: oldLink.max_submissions,
        active: true,
        created_by: user.id,
        note: oldLink.note
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new share link:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create new share link' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark old link as revoked
    await supabase
      .from('share_links')
      .update({
        active: false,
        revoked: true,
        revoked_by: user.id,
        revoked_at: new Date().toISOString()
      })
      .eq('id', link_id);

    // Log audit for old link (revoked)
    await supabase
      .from('share_link_audit')
      .insert({
        share_link_id: link_id,
        action: 'revoked_by_regeneration',
        changes: { new_link_id: newLink.id, new_token: newToken },
        performed_by: user.id,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    // Log audit for new link (created)
    await supabase
      .from('share_link_audit')
      .insert({
        share_link_id: newLink.id,
        action: 'created_by_regeneration',
        changes: { old_link_id: link_id, reason: 'regenerated' },
        performed_by: user.id,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    // Return new link with URL
    const shareUrl = `${req.headers.get('origin') || 'https://app.rhello.com'}/share/${newToken}`;

    return new Response(
      JSON.stringify({ 
        ...newLink, 
        url: shareUrl 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in regenerate-share-link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
