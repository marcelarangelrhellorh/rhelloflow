import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[refresh-kpis] Starting KPIs refresh...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceKey) {
      console.error('[refresh-kpis] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[refresh-kpis] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Refresh das materialized views usando RPC
    console.log('[refresh-kpis] Refreshing mv_recruitment_kpis...');
    const { error: kpisError } = await supabase.rpc('refresh_recruitment_kpis');
    if (kpisError) {
      console.error('[refresh-kpis] Error refreshing recruitment kpis:', kpisError);
      throw kpisError;
    }

    console.log('[refresh-kpis] Refreshing mv_dashboard_overview...');
    const { error: dashboardError } = await supabase.rpc('refresh_dashboard_overview');
    if (dashboardError) {
      console.error('[refresh-kpis] Error refreshing dashboard overview:', dashboardError);
      throw dashboardError;
    }

    const refreshedAt = new Date().toISOString();
    console.log('[refresh-kpis] Refresh completed at:', refreshedAt);

    return new Response(
      JSON.stringify({ 
        success: true, 
        refreshed_at: refreshedAt,
        message: 'KPIs atualizados com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar KPIs';
    console.error('[refresh-kpis] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
