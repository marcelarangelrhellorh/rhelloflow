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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get share link with vaga details
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select(`
        *,
        vagas (
          id,
          titulo,
          empresa,
          confidencial,
          responsabilidades,
          requisitos_obrigatorios,
          requisitos_desejaveis,
          beneficios,
          beneficios_outros,
          modelo_trabalho,
          horario_inicio,
          horario_fim,
          dias_semana,
          salario_min,
          salario_max,
          salario_modalidade
        )
      `)
      .eq('token', token)
      .single();

    if (linkError || !shareLink) {
      return new Response(
        JSON.stringify({ error: 'Link inválido' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if active
    if (!shareLink.active) {
      return new Response(
        JSON.stringify({ error: 'Link desativado', status: 'inactive' }), 
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Link expirado', status: 'expired' }), 
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max submissions
    if (shareLink.max_submissions && shareLink.submissions_count >= shareLink.max_submissions) {
      return new Response(
        JSON.stringify({ error: 'Limite de inscrições atingido', status: 'limit_reached' }), 
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log view event
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                req.headers.get('x-real-ip') || 
                'unknown';

    await supabase.from('share_link_events').insert({
      share_link_id: shareLink.id,
      event_type: 'view',
      ip_address: ip,
      user_agent: req.headers.get('user-agent'),
    });

    // Return sanitized data (no password_hash)
    const { password_hash, ...safeLinkData } = shareLink;

    // Ensure share_config has default values if not set
    const finalShareConfig = safeLinkData.share_config || {
      exibir_sobre: true,
      exibir_responsabilidades: true,
      exibir_requisitos: true,
      exibir_beneficios: true,
      exibir_localizacao: true,
      exibir_salario: true,
      empresa_confidencial: false,
      exibir_observacoes: true,
    };

    return new Response(
      JSON.stringify({ 
        ...safeLinkData,
        share_config: finalShareConfig,
        requires_password: !!password_hash 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-share-link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
