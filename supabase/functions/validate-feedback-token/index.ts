import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
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
      throw new Error('Token não fornecido');
    }

    // Buscar feedback request com informações da vaga e candidato
    const { data: request, error: requestError } = await supabase
      .from('feedback_requests')
      .select(`
        id,
        vaga_id,
        candidato_id,
        allow_multiple,
        expires_at,
        vagas!feedback_requests_vaga_id_fkey (
          id,
          titulo,
          empresa
        ),
        candidatos!feedback_requests_candidato_id_fkey (
          id,
          nome_completo
        )
      `)
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
    if (!request.allow_multiple) {
      const { data: existingFeedback } = await supabase
        .from('feedbacks')
        .select('id')
        .eq('request_id', request.id)
        .maybeSingle();

      if (existingFeedback) {
        return new Response(
          JSON.stringify({ error: 'Feedback já enviado para este link.' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          }
        );
      }
    }

    const candidato = Array.isArray(request.candidatos) ? request.candidatos[0] : request.candidatos;
    const vaga = Array.isArray(request.vagas) ? request.vagas[0] : request.vagas;

    console.log('Token validado com sucesso:', { 
      request_id: request.id,
      candidato: candidato,
      vaga: vaga,
      candidate_name: candidato?.nome_completo 
    });

    return new Response(
      JSON.stringify({
        request_id: request.id,
        candidate_name: candidato?.nome_completo,
        vacancy_title: vaga?.titulo,
        company_name: vaga?.empresa,
        expires_at: request.expires_at,
        allow_multiple: request.allow_multiple,
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
