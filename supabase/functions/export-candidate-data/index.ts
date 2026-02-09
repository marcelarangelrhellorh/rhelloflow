import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  candidatoId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for reading all data
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

    // Check if user is admin or recrutador
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'recrutador'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas admins e recrutadores podem exportar dados.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { candidatoId }: ExportRequest = await req.json();

    if (!candidatoId) {
      return new Response(
        JSON.stringify({ error: 'ID do candidato é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[LGPD Export] Iniciando exportação para candidato: ${candidatoId}`);

    // Fetch candidate data
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

    // Fetch all related data in parallel
    const [
      feedbacksResult,
      historicoResult,
      scorecardsResult,
      scoresResult,
      consentsResult,
      whatsappResult,
      notesResult,
      tagsResult
    ] = await Promise.all([
      supabaseAdmin.from('feedbacks').select('*').eq('candidato_id', candidatoId),
      supabaseAdmin.from('historico_candidatos').select('*').eq('candidato_id', candidatoId),
      supabaseAdmin.from('candidate_scorecards').select('*').eq('candidate_id', candidatoId),
      supabaseAdmin.from('scorecard_scores').select('*, scorecard:candidate_scorecards(id)').eq('scorecard_id', candidatoId),
      supabaseAdmin.from('data_processing_consents').select('*').eq('candidato_id', candidatoId),
      supabaseAdmin.from('whatsapp_messages').select('*').eq('candidato_id', candidatoId),
      supabaseAdmin.from('candidate_notes').select('*').eq('candidate_id', candidatoId),
      supabaseAdmin.from('candidate_tags').select('*, tag:tags(*)').eq('candidate_id', candidatoId),
    ]);

    // Build export object
    const exportData = {
      export_metadata: {
        export_date: new Date().toISOString(),
        export_version: '1.0',
        lgpd_article: 'Art. 18, V - Portabilidade de dados',
        exported_by: user.email,
      },
      candidato: {
        ...candidato,
        // Remove soft-delete fields from export
        deleted_at: undefined,
        deleted_by: undefined,
        deleted_reason: undefined,
        deletion_type: undefined,
      },
      feedbacks: feedbacksResult.data || [],
      historico_processos: historicoResult.data || [],
      avaliacoes_scorecards: scorecardsResult.data || [],
      consentimentos_lgpd: consentsResult.data || [],
      mensagens_whatsapp: whatsappResult.data || [],
      anotacoes: notesResult.data || [],
      tags: tagsResult.data?.map(t => t.tag) || [],
    };

    // Update candidate to mark export was requested
    await supabaseAdmin
      .from('candidatos')
      .update({ lgpd_export_requested_at: new Date().toISOString() })
      .eq('id', candidatoId);

    // Log audit event
    const correlationId = crypto.randomUUID();
    await supabaseAdmin.from('audit_events').insert({
      action: 'LGPD_DATA_EXPORT',
      actor: { user_id: user.id, email: user.email },
      resource: { type: 'candidato', id: candidatoId, name: candidato.nome_completo },
      correlation_id: correlationId,
      event_hash: crypto.randomUUID(),
      payload: { 
        tables_exported: ['candidatos', 'feedbacks', 'historico_candidatos', 'candidate_scorecards', 'data_processing_consents', 'whatsapp_messages', 'candidate_notes', 'candidate_tags'],
        record_counts: {
          feedbacks: feedbacksResult.data?.length || 0,
          historico: historicoResult.data?.length || 0,
          scorecards: scorecardsResult.data?.length || 0,
          consents: consentsResult.data?.length || 0,
          whatsapp: whatsappResult.data?.length || 0,
          notes: notesResult.data?.length || 0,
          tags: tagsResult.data?.length || 0,
        }
      },
    });

    console.log(`[LGPD Export] Exportação concluída para candidato: ${candidatoId}`);

    return new Response(
      JSON.stringify(exportData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="lgpd_export_${candidatoId}_${new Date().toISOString().split('T')[0]}.json"`
        } 
      }
    );

  } catch (error) {
    console.error('[LGPD Export] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao exportar dados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
