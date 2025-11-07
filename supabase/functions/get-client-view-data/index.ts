import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from request body
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching client view data for token: ${token}`);

    // Validate token and get link
    const { data: link, error: linkError } = await supabase
      .from('client_view_links')
      .select('*')
      .eq('token', token)
      .eq('deleted', false)
      .single();

    if (linkError || !link) {
      console.error('Invalid token:', linkError);
      return new Response(
        JSON.stringify({ error: 'Link not found or invalid' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if link is active
    if (!link.active) {
      return new Response(
        JSON.stringify({ error: 'This link has been deactivated' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This link has expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get vaga details
    const { data: vaga, error: vagaError } = await supabase
      .from('vagas')
      .select(`
        id,
        titulo,
        empresa,
        status,
        status_slug,
        criado_em,
        status_changed_at,
        salario_min,
        salario_max,
        tipo_contratacao,
        modelo_trabalho
      `)
      .eq('id', link.vaga_id)
      .is('deleted_at', null)
      .single();

    if (vagaError || !vaga) {
      console.error('Vaga not found:', vagaError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count active candidates
    const { count: candidatosCount } = await supabase
      .from('candidatos')
      .select('*', { count: 'exact', head: true })
      .eq('vaga_relacionada_id', vaga.id)
      .is('deleted_at', null);

    // Get stage history for timeline
    const { data: stageHistory } = await supabase
      .from('job_stage_history')
      .select('from_status, to_status, changed_at')
      .eq('job_id', vaga.id)
      .order('changed_at', { ascending: false })
      .limit(10);

    // Calculate process duration
    const startDate = new Date(vaga.criado_em);
    const now = new Date();
    const durationDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Update last accessed timestamp
    await supabase
      .from('client_view_links')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', link.id);

    console.log('Client view data fetched successfully');

    return new Response(
      JSON.stringify({
        vaga: {
          titulo: vaga.titulo,
          empresa: vaga.empresa,
          status: vaga.status,
          statusSlug: vaga.status_slug,
          salarioMin: vaga.salario_min,
          salarioMax: vaga.salario_max,
          tipoContratacao: vaga.tipo_contratacao,
          modeloTrabalho: vaga.modelo_trabalho,
          criadoEm: vaga.criado_em,
          candidatosAtivos: candidatosCount || 0,
          duracaoDias: durationDays
        },
        timeline: stageHistory || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-client-view-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
