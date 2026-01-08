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

    const { link_id, active } = await req.json();

    if (!link_id || active === undefined) {
      return new Response(
        JSON.stringify({ error: 'link_id and active are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update share link
    const { data: updatedLink, error: updateError } = await supabase
      .from('share_links')
      .update({ 
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', link_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error toggling share link:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to toggle share link' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit entry
    await supabase
      .from('share_link_audit')
      .insert({
        share_link_id: link_id,
        action: active ? 'activated' : 'deactivated',
        changes: { active: { from: !active, to: active } },
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
    console.error('Error in toggle-share-link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
