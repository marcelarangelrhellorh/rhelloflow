import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const { link_id } = await req.json();

    if (!link_id) {
      return new Response(
        JSON.stringify({ error: 'link_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Soft delete: mark as deleted instead of removing
    const { data: deletedLink, error: deleteError } = await supabase
      .from('share_links')
      .update({ 
        deleted: true,
        deleted_by: user.id,
        deleted_at: new Date().toISOString(),
        active: false
      })
      .eq('id', link_id)
      .select()
      .single();

    if (deleteError) {
      console.error('Error deleting share link:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete share link' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit entry
    await supabase
      .from('share_link_audit')
      .insert({
        share_link_id: link_id,
        action: 'deleted',
        changes: { deleted: true },
        performed_by: user.id,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Share link deleted successfully' }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-share-link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
