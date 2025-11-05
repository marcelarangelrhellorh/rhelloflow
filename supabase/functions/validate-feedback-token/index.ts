import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Token não fornecido');
    }

    // Buscar feedback request
    const { data: request, error: requestError } = await supabase
      .from('feedback_requests')
      .select('id, vaga_id, candidato_id, allow_multiple, expires_at')
      .eq('token', token)
      .single();

    if (requestError || !request) {
      console.error('Token inválido:', requestError);
      return new Response(
        JSON.stringify({ error: 'Link inválido. Peça ao recrutador um novo link.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Buscar dados do candidato
    const { data: candidato, error: candidatoError } = await supabase
      .from('candidatos')
      .select('id, nome_completo')
      .eq('id', request.candidato_id)
      .single();

    if (candidatoError) {
      console.error('Erro ao buscar candidato:', candidatoError);
    }

    // Buscar dados da vaga
    const { data: vaga, error: vagaError } = await supabase
      .from('vagas')
      .select('id, titulo, empresa')
      .eq('id', request.vaga_id)
      .single();

    if (vagaError) {
      console.error('Erro ao buscar vaga:', vagaError);
    }

    // Verificar expiração
    const expiresAt = new Date(request.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Este link expirou. Solicite novo link ao recrutador.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 410,
        }
      );
    }

    // Verificar se já foi enviado feedback (se allow_multiple = false)
    let already_submitted = false;
    if (!request.allow_multiple) {
      const { data: existingFeedback } = await supabase
        .from('feedbacks')
        .select('id')
        .eq('request_id', request.id)
        .maybeSingle();

      already_submitted = !!existingFeedback;
    }

    console.log('Token validado com sucesso:', { 
      request_id: request.id,
      candidato: candidato,
      vaga: vaga,
      candidate_name: candidato?.nome_completo,
      already_submitted 
    });

    return new Response(
      JSON.stringify({
        request_id: request.id,
        candidate_name: candidato?.nome_completo || 'Candidato não identificado',
        vacancy_title: vaga?.titulo || 'Vaga não identificada',
        company_name: vaga?.empresa || '',
        expires_at: request.expires_at,
        allow_multiple: request.allow_multiple,
        already_submitted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
