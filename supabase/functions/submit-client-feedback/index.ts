import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  token: string;
  rating: number;
  disposition?: string;
  quick_tags?: string[];
  comment: string;
  sender_name?: string;
  sender_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { token, rating, disposition, quick_tags, comment, sender_name, sender_email } = body;

    // Validações
    if (!token || !rating || !comment) {
      throw new Error('Token, avaliação e comentário são obrigatórios');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Avaliação deve ser entre 1 e 5');
    }

    // Buscar feedback request
    const { data: request, error: requestError } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('token', token)
      .single();

    if (requestError || !request) {
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

    // Verificar duplicação
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

    // Capturar informações de auditoria
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Criar feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedbacks')
      .insert({
        request_id: request.id,
        candidato_id: request.candidato_id,
        vaga_id: request.vaga_id,
        author_user_id: request.recrutador_id, // Para manter consistência com a estrutura existente
        tipo: 'cliente',
        origem: 'cliente',
        avaliacao: rating,
        disposicao: disposition,
        quick_tags: quick_tags || [],
        conteudo: comment,
        sender_name,
        sender_email,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Erro ao salvar feedback:', feedbackError);
      throw new Error('Erro ao salvar feedback');
    }

    // Buscar informações para notificação
    const { data: candidato } = await supabase
      .from('candidatos')
      .select('nome_completo')
      .eq('id', request.candidato_id)
      .single();

    // Criar notificação para o recrutador
    await supabase.rpc('create_notification', {
      p_user_id: request.recrutador_id,
      p_kind: 'feedback_cliente',
      p_title: 'Novo feedback do cliente',
      p_body: `Feedback recebido sobre ${candidato?.nome_completo || 'candidato'} - ⭐ ${rating}/5`,
      p_job_id: request.vaga_id,
    });

    console.log('Feedback do cliente salvo:', { feedback_id: feedback.id, rating });

    return new Response(
      JSON.stringify({
        feedback_id: feedback.id,
        message: 'Feedback recebido. Obrigado!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
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
