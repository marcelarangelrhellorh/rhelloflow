import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get link details with vaga info
    const { data: link, error } = await supabase
      .from('candidate_form_links')
      .select(`
        id,
        token,
        active,
        expires_at,
        max_submissions,
        submissions_count,
        password_hash,
        revoked,
        vaga:vagas(id, titulo, empresa, cidade, estado, formato_trabalho, modelo_contratacao)
      `)
      .eq('token', token)
      .eq('revoked', false)
      .single();

    if (error || !link) {
      console.error('Error fetching candidate form link:', error);
      return new Response(JSON.stringify({ error: 'Link não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if link is active
    if (!link.active) {
      return new Response(JSON.stringify({ error: 'Link desativado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Link expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check submission limit
    if (link.max_submissions && link.submissions_count >= link.max_submissions) {
      return new Response(JSON.stringify({ error: 'Limite de candidaturas atingido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log view event
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const urlParams = new URL(req.url);
    
    await supabase.from('candidate_form_link_events').insert({
      link_id: link.id,
      event_type: 'view',
      ip_address: ipAddress,
      user_agent: userAgent,
      utm_source: urlParams.searchParams.get('utm_source'),
      utm_medium: urlParams.searchParams.get('utm_medium'),
      utm_campaign: urlParams.searchParams.get('utm_campaign'),
    });

    console.log(`Candidate form link viewed: ${link.id}`);

    return new Response(JSON.stringify({
      id: link.id,
      active: link.active,
      expires_at: link.expires_at,
      max_submissions: link.max_submissions,
      submissions_count: link.submissions_count,
      requires_password: !!link.password_hash,
      vaga: link.vaga,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-candidate-form-link:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
