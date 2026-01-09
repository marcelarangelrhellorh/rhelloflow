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

    // Get link details using the secure function
    const { data: links, error } = await supabase
      .rpc('get_candidate_registration_link_by_token', { p_token: token });

    if (error) {
      console.error('Error fetching candidate registration link:', error);
      return new Response(JSON.stringify({ error: 'Erro ao buscar link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const link = links?.[0];

    if (!link) {
      return new Response(JSON.stringify({ error: 'Link não encontrado ou expirado' }), {
        status: 404,
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
    
    await supabase.from('candidate_registration_link_events').insert({
      link_id: link.id,
      event_type: 'view',
      ip_address: ipAddress,
      user_agent: userAgent,
      utm_source: urlParams.searchParams.get('utm_source'),
      utm_medium: urlParams.searchParams.get('utm_medium'),
      utm_campaign: urlParams.searchParams.get('utm_campaign'),
    });

    console.log(`Candidate registration link viewed: ${link.id}`);

    return new Response(JSON.stringify({
      id: link.id,
      active: link.active,
      expires_at: link.expires_at,
      max_submissions: link.max_submissions,
      submissions_count: link.submissions_count,
      requires_password: link.requires_password,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-candidate-registration-link:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
