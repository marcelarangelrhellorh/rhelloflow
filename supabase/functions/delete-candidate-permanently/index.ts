import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteRequest {
  candidatoId: string;
  reason: string;
  confirmationCode: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin ONLY
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas administradores podem executar exclusão permanente LGPD.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { candidatoId, reason, confirmationCode }: DeleteRequest = await req.json();

    // Validate confirmation code
    if (confirmationCode !== 'CONFIRMAR-EXCLUSAO-LGPD') {
      return new Response(
        JSON.stringify({ error: 'Código de confirmação inválido. Use: CONFIRMAR-EXCLUSAO-LGPD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!candidatoId || !reason) {
      return new Response(
        JSON.stringify({ error: 'ID do candidato e motivo são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[LGPD Delete] Iniciando exclusão permanente para candidato: ${candidatoId}`);

    // Fetch candidate data for snapshot
    const { data: candidato, error: candidatoError } = await supabaseAdmin
      .from('candidatos')
      .select('*')
      .eq('id', candidatoId)
      .single();

    if (candidatoError || !candidato) {
      return new Response(
        JSON.stringify({ error: 'Candidato não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const correlationId = crypto.randomUUID();

    // Create pre-delete snapshot for audit
    await supabaseAdmin.from('audit_events').insert({
      action: 'LGPD_PRE_DELETE_SNAPSHOT',
      actor: { user_id: user.id, email: user.email },
      resource: { type: 'candidato', id: candidatoId, name: candidato.nome_completo },
      correlation_id: correlationId,
      event_hash: crypto.randomUUID(),
      payload: { 
        snapshot: candidato,
        reason,
        lgpd_article: 'Art. 18, VI - Eliminação de dados'
      },
    });

    // Delete physical files if they exist
    if (candidato.curriculo_url) {
      try {
        const filePath = candidato.curriculo_url.split('/').pop();
        if (filePath) {
          await supabaseAdmin.storage.from('curriculos').remove([filePath]);
          console.log(`[LGPD Delete] Currículo removido: ${filePath}`);
        }
      } catch (fileError) {
        console.error('[LGPD Delete] Erro ao remover currículo:', fileError);
      }
    }

    // Anonymize candidate data instead of hard delete
    // This preserves statistical integrity while removing PII
    const anonymizedEmail = `anonimizado_${candidatoId.substring(0, 8)}@removed.lgpd`;
    
    const { error: updateError } = await supabaseAdmin
      .from('candidatos')
      .update({
        nome_completo: '[DADOS REMOVIDOS - LGPD]',
        email: anonymizedEmail,
        telefone: null,
        cpf: null,
        cidade: null,
        estado: null,
        linkedin: null,
        curriculo_link: null,
        curriculo_url: null,
        portfolio_url: null,
        disc_url: null,
        gravacao_entrevista_url: null,
        idade: null,
        pontos_fortes: null,
        pontos_desenvolver: null,
        parecer_final: null,
        feedback: null,
        experiencia_profissional: null,
        historico_experiencia: null,
        idiomas: null,
        fit_cultural: null,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deleted_reason: `LGPD Art. 18, VI: ${reason}`,
        deletion_type: 'LGPD_ERASURE',
        lgpd_deletion_requested_at: new Date().toISOString(),
      })
      .eq('id', candidatoId);

    if (updateError) {
      throw updateError;
    }

    // Anonymize feedbacks content
    await supabaseAdmin
      .from('feedbacks')
      .update({ 
        conteudo: '[CONTEÚDO REMOVIDO - LGPD]',
        sender_name: null,
        sender_email: null,
      })
      .eq('candidato_id', candidatoId);

    // Delete notes
    await supabaseAdmin
      .from('candidate_notes')
      .delete()
      .eq('candidate_id', candidatoId);

    // Delete WhatsApp messages
    await supabaseAdmin
      .from('whatsapp_messages')
      .delete()
      .eq('candidato_id', candidatoId);

    // Log final audit event
    await supabaseAdmin.from('audit_events').insert({
      action: 'LGPD_DATA_ERASURE_COMPLETED',
      actor: { user_id: user.id, email: user.email },
      resource: { type: 'candidato', id: candidatoId, name: '[ANONIMIZADO]' },
      correlation_id: correlationId,
      event_hash: crypto.randomUUID(),
      payload: { 
        reason,
        lgpd_article: 'Art. 18, VI - Eliminação de dados',
        anonymized_fields: [
          'nome_completo', 'email', 'telefone', 'cpf', 'cidade', 'estado',
          'linkedin', 'curriculo_link', 'curriculo_url', 'portfolio_url',
          'disc_url', 'gravacao_entrevista_url', 'idade', 'pontos_fortes',
          'pontos_desenvolver', 'parecer_final', 'feedback', 'experiencia_profissional',
          'historico_experiencia', 'idiomas', 'fit_cultural'
        ],
        deleted_tables: ['candidate_notes', 'whatsapp_messages'],
        anonymized_tables: ['feedbacks'],
      },
    });

    console.log(`[LGPD Delete] Exclusão permanente concluída para candidato: ${candidatoId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Dados do candidato foram anonimizados conforme LGPD Art. 18, VI',
        correlation_id: correlationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[LGPD Delete] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar exclusão' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
