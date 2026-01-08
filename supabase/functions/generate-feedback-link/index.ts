import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  vaga_id: string;
  candidato_id: string;
  allow_multiple?: boolean;
  expires_in_days?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    const body: RequestBody = await req.json();
    const { vaga_id, candidato_id, allow_multiple = false, expires_in_days = 14 } = body;

    if (!vaga_id || !candidato_id) {
      throw new Error('vaga_id e candidato_id são obrigatórios');
    }

    // Gerar token único e seguro
    const feedbackToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Criar registro de feedback request
    const { data: request, error: insertError } = await supabase
      .from('feedback_requests')
      .insert({
        vaga_id,
        candidato_id,
        recrutador_id: user.id,
        token: feedbackToken,
        allow_multiple,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar request:', insertError);
      throw new Error('Erro ao criar requisição de feedback');
    }

    // Gerar link completo
    const baseUrl = req.headers.get('origin') || Deno.env.get('SUPABASE_URL');
    const feedbackLink = `${baseUrl}/feedback/${feedbackToken}`;

    console.log('Link de feedback gerado:', { request_id: request.id, vaga_id, candidato_id });

    return new Response(
      JSON.stringify({
        request_id: request.id,
        feedback_link: feedbackLink,
        expires_at: expiresAt.toISOString(),
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
