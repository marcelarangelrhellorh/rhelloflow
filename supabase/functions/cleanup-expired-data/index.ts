import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Data retention policy: 2 years for inactive candidates without consent
const RETENTION_YEARS = 2;

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role for bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify cron secret or admin authorization
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    const cronHeader = req.headers.get('x-cron-secret');
    
    let isAuthorized = false;
    let executedBy = 'cron';

    // Check cron secret
    if (cronHeader && cronSecret && cronHeader === cronSecret) {
      isAuthorized = true;
      executedBy = 'cron-job';
    }

    // Or check admin auth
    if (!isAuthorized && authHeader) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (user) {
        const { data: userRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (userRole?.role === 'admin') {
          isAuthorized = true;
          executedBy = user.email || user.id;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[LGPD Cleanup] Iniciando limpeza de dados expirados. Executado por: ${executedBy}`);

    // Calculate retention cutoff date
    const retentionCutoff = new Date();
    retentionCutoff.setFullYear(retentionCutoff.getFullYear() - RETENTION_YEARS);

    // Find candidates eligible for cleanup:
    // - Created more than 2 years ago
    // - Not linked to any active job (in talent pool)
    // - Not already anonymized
    // - No valid consent for talent pool inclusion
    const { data: expiredCandidates, error: queryError } = await supabaseAdmin
      .from('candidatos')
      .select('id, nome_completo, email, criado_em')
      .is('deleted_at', null)
      .is('vaga_relacionada_id', null)
      .eq('status', 'Banco de Talentos')
      .lt('criado_em', retentionCutoff.toISOString())
      .limit(100); // Process in batches

    if (queryError) {
      throw queryError;
    }

    console.log(`[LGPD Cleanup] Candidatos encontrados para verificação: ${expiredCandidates?.length || 0}`);

    let processed = 0;
    let skipped = 0;
    const results: { id: string; action: string }[] = [];

    for (const candidato of expiredCandidates || []) {
      // Check if candidate has valid consent for talent pool
      const { data: consent } = await supabaseAdmin
        .from('data_processing_consents')
        .select('*')
        .eq('candidato_id', candidato.id)
        .eq('consent_type', 'talent_pool_inclusion')
        .eq('consent_given', true)
        .is('consent_withdrawn_at', null)
        .single();

      if (consent) {
        // Has valid consent, skip
        skipped++;
        results.push({ id: candidato.id, action: 'skipped_has_consent' });
        continue;
      }

      // No valid consent - anonymize
      const anonymizedEmail = `expired_${candidato.id.substring(0, 8)}@retention.lgpd`;

      await supabaseAdmin
        .from('candidatos')
        .update({
          nome_completo: '[DADOS EXPIRADOS - LGPD]',
          email: anonymizedEmail,
          telefone: null,
          cpf: null,
          cidade: null,
          estado: null,
          linkedin: null,
          curriculo_link: null,
          curriculo_url: null,
          portfolio_url: null,
          idade: null,
          pontos_fortes: null,
          pontos_desenvolver: null,
          parecer_final: null,
          feedback: null,
          experiencia_profissional: null,
          idiomas: null,
          fit_cultural: null,
          deleted_at: new Date().toISOString(),
          deleted_reason: `LGPD: Retenção expirada após ${RETENTION_YEARS} anos sem consentimento`,
          deletion_type: 'RETENTION_EXPIRED',
        })
        .eq('id', candidato.id);

      // Delete personal notes
      await supabaseAdmin
        .from('candidate_notes')
        .delete()
        .eq('candidate_id', candidato.id);

      processed++;
      results.push({ id: candidato.id, action: 'anonymized' });

      console.log(`[LGPD Cleanup] Candidato anonimizado: ${candidato.id}`);
    }

    // Log cleanup execution
    const correlationId = crypto.randomUUID();
    await supabaseAdmin.from('audit_events').insert({
      action: 'LGPD_RETENTION_CLEANUP',
      actor: { system: 'cleanup-cron', executed_by: executedBy },
      resource: { type: 'system', id: 'retention-policy' },
      correlation_id: correlationId,
      event_hash: crypto.randomUUID(),
      payload: {
        retention_years: RETENTION_YEARS,
        cutoff_date: retentionCutoff.toISOString(),
        candidates_checked: expiredCandidates?.length || 0,
        candidates_anonymized: processed,
        candidates_skipped: skipped,
        results,
      },
    });

    console.log(`[LGPD Cleanup] Limpeza concluída. Anonimizados: ${processed}, Pulados: ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          retention_years: RETENTION_YEARS,
          cutoff_date: retentionCutoff.toISOString(),
          candidates_checked: expiredCandidates?.length || 0,
          candidates_anonymized: processed,
          candidates_skipped_with_consent: skipped,
        },
        correlation_id: correlationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[LGPD Cleanup] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar limpeza' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
