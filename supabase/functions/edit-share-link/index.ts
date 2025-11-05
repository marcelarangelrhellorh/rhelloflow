import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { link_id, expires_in_days, password, max_submissions, note } = await req.json();

    if (!link_id) {
      return new Response(
        JSON.stringify({ error: 'link_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing link
    const { data: existingLink, error: fetchError } = await supabase
      .from('share_links')
      .select('*')
      .eq('id', link_id)
      .single();

    if (fetchError || !existingLink) {
      return new Response(
        JSON.stringify({ error: 'Share link not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare updates
    const updates: any = { updated_at: new Date().toISOString() };
    const changes: any = {};

    // Handle expiration
    if (expires_in_days !== undefined) {
      if (expires_in_days === null || expires_in_days === 0) {
        updates.expires_at = null;
        changes.expires_at = { from: existingLink.expires_at, to: null };
      } else {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expires_in_days);
        updates.expires_at = expiryDate.toISOString();
        changes.expires_at = { from: existingLink.expires_at, to: updates.expires_at };
      }
    }

    // Handle password
    if (password !== undefined) {
      if (password === null || password.trim() === '') {
        updates.password_hash = null;
        changes.password = { from: existingLink.password_hash ? 'set' : 'none', to: 'none' };
      } else {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        updates.password_hash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        changes.password = { from: existingLink.password_hash ? 'set' : 'none', to: 'set' };
      }
    }

    // Handle max_submissions
    if (max_submissions !== undefined) {
      updates.max_submissions = max_submissions;
      changes.max_submissions = { from: existingLink.max_submissions, to: max_submissions };
    }

    // Handle note
    if (note !== undefined) {
      updates.note = note;
      changes.note = { from: existingLink.note, to: note };
    }

    // Update share link
    const { data: updatedLink, error: updateError } = await supabase
      .from('share_links')
      .update(updates)
      .eq('id', link_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating share link:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update share link' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit entry
    await supabase
      .from('share_link_audit')
      .insert({
        share_link_id: link_id,
        action: 'edited',
        changes,
        performed_by: user.id,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    return new Response(
      JSON.stringify(updatedLink), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in edit-share-link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
