import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Validation schema - FASE 1.3
const feedbackSchema = z.object({
  token: z.string().trim().min(1, 'Token inválido'),
  rating: z.number().int().min(1, 'Avaliação deve ser no mínimo 1').max(5, 'Avaliação deve ser no máximo 5'),
  disposition: z.string().max(100).optional(),
  quick_tags: z.array(z.string().max(50)).max(10, 'Máximo 10 tags').optional(),
  comment: z.string().trim().min(10, 'Comentário muito curto (mínimo 10 caracteres)').max(2000, 'Comentário muito longo (máximo 2000 caracteres)'),
  sender_name: z.string().trim().max(200).optional(),
  sender_email: z.string().trim().email('Email inválido').max(255).optional(),
});

function sanitizeText(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

function sanitizeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return firstError?.message || 'Dados inválidos';
  }
  
  if (error instanceof Error) {
    const safeMessages = [
      'Token inválido',
      'Link inválido',
      'Link expirou',
      'Feedback já enviado',
      'Avaliação deve ser',
      'Comentário',
    ];
    
    if (safeMessages.some(msg => error.message.includes(msg))) {
      return error.message;
    }
  }
  
  return 'Erro ao processar feedback. Tente novamente.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    // Validate with Zod - FASE 1.3
    const validatedData = feedbackSchema.parse(body);
    const { token, rating, disposition, quick_tags, comment, sender_name, sender_email } = validatedData;

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

    // Criar feedback com dados sanitizados - FASE 1.3
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedbacks')
      .insert({
        request_id: request.id,
        candidato_id: request.candidato_id,
        vaga_id: request.vaga_id,
        author_user_id: request.recrutador_id,
        tipo: 'cliente',
        origem: 'cliente',
        avaliacao: rating,
        disposicao: disposition || null,
        quick_tags: quick_tags || [],
        conteudo: sanitizeText(comment),
        sender_name: sender_name ? sanitizeText(sender_name) : null,
        sender_email: sender_email ? sanitizeText(sender_email) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (feedbackError) {
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
    const errorMessage = sanitizeError(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
