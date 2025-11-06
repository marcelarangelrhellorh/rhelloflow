import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting map (in-memory, resets on restart)
const submissionTracker = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxPerHour: number = 3): boolean {
  const now = Date.now();
  const existing = submissionTracker.get(identifier);
  
  if (!existing || now > existing.resetAt) {
    submissionTracker.set(identifier, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  
  if (existing.count >= maxPerHour) {
    return false;
  }
  
  existing.count++;
  return true;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

function generateProtocol(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RHL-${timestamp}-${random}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token, candidate, password, utm, files } = await req.json();

    if (!token || !candidate) {
      return new Response(
        JSON.stringify({ error: 'Token and candidate data are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                req.headers.get('x-real-ip') || 
                'unknown';

    // Rate limiting
    if (!checkRateLimit(`${token}-${ip}`)) {
      return new Response(
        JSON.stringify({ error: 'Muitas submissões. Tente novamente mais tarde.' }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get share link with job and recruiter info
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select(`
        *, 
        vagas(
          id, 
          titulo, 
          empresa, 
          recrutador_id, 
          cs_id
        )
      `)
      .eq('token', token)
      .single();

    if (linkError || !shareLink) {
      return new Response(
        JSON.stringify({ error: 'Link inválido ou expirado' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if link is active
    if (!shareLink.active) {
      return new Response(
        JSON.stringify({ error: 'Este link foi desativado' }), 
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Este link expirou' }), 
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max submissions
    if (shareLink.max_submissions && shareLink.submissions_count >= shareLink.max_submissions) {
      return new Response(
        JSON.stringify({ error: 'Limite de inscrições atingido' }), 
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password if required
    if (shareLink.password_hash && password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const inputHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (inputHash !== shareLink.password_hash) {
        return new Response(
          JSON.stringify({ error: 'Senha incorreta' }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (shareLink.password_hash && !password) {
      return new Response(
        JSON.stringify({ error: 'Senha necessária' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!candidate.nome_completo || !candidate.email || !candidate.telefone) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle file uploads if present
    let curriculo_url = null;
    let portfolio_url = null;

    if (files?.resume) {
      try {
        // Extract base64 data and decode
        const base64Data = files.resume.data.split(',')[1];
        const fileBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileExt = files.resume.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${shareLink.vaga_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('curriculos')
          .upload(filePath, fileBuffer, {
            contentType: files.resume.data.split(';')[0].split(':')[1],
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('curriculos')
          .getPublicUrl(filePath);

        curriculo_url = publicUrl;
      } catch (error) {
        console.error('Error uploading resume:', error);
      }
    }

    if (files?.portfolio) {
      try {
        const base64Data = files.portfolio.data.split(',')[1];
        const fileBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileExt = files.portfolio.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${shareLink.vaga_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolios')
          .upload(filePath, fileBuffer, {
            contentType: files.portfolio.data.split(';')[0].split(':')[1],
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('portfolios')
          .getPublicUrl(filePath);

        portfolio_url = publicUrl;
      } catch (error) {
        console.error('Error uploading portfolio:', error);
      }
    }

    // Get recruiter name if there's a recruiter assigned to the job
    let recrutadorNome = null;
    if (shareLink.vagas?.recrutador_id) {
      const { data: recrutadorData } = await supabase
        .from('users')
        .select('name')
        .eq('id', shareLink.vagas.recrutador_id)
        .single();
      
      recrutadorNome = recrutadorData?.name || null;
    }

    // Sanitize inputs
    const sanitizedCandidate = {
      nome_completo: sanitizeText(candidate.nome_completo).substring(0, 255),
      email: sanitizeText(candidate.email).substring(0, 255),
      telefone: sanitizeText(candidate.telefone).substring(0, 50),
      cidade: sanitizeText(candidate.cidade || '').substring(0, 100),
      estado: sanitizeText(candidate.estado || '').substring(0, 2),
      linkedin: sanitizeText(candidate.linkedin || '').substring(0, 500),
      pretensao_salarial: candidate.pretensao_salarial || null,
      area: candidate.area || null,
      nivel: candidate.nivel || null,
      disponibilidade_mudanca: sanitizeText(candidate.disponibilidade_mudanca || '').substring(0, 500),
      curriculo_url,
      portfolio_url,
      feedback: sanitizeText(candidate.mensagem || '').substring(0, 2000),
      vaga_relacionada_id: shareLink.vaga_id,
      source_link_id: shareLink.id,
      utm: utm || null,
      status: 'Selecionado',
      origem: 'Link de Divulgação',
      recrutador: recrutadorNome, // Auto-assign recruiter from job
    };

    // Create candidate
    const { data: newCandidate, error: candidateError } = await supabase
      .from('candidatos')
      .insert(sanitizedCandidate)
      .select()
      .single();

    if (candidateError) {
      console.error('Error creating candidate:', candidateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar candidatura' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create history entry
    await supabase.from('historico_candidatos').insert({
      candidato_id: newCandidate.id,
      vaga_id: shareLink.vaga_id,
      resultado: 'Aprovado',
      feedback: 'Candidatura recebida via link de divulgação',
    });

    // Increment submissions count
    await supabase
      .from('share_links')
      .update({ submissions_count: shareLink.submissions_count + 1 })
      .eq('id', shareLink.id);

    // Log event
    await supabase.from('share_link_events').insert({
      share_link_id: shareLink.id,
      event_type: 'submit',
      ip_address: ip,
      user_agent: req.headers.get('user-agent'),
      utm_source: utm?.utm_source || null,
      utm_medium: utm?.utm_medium || null,
      utm_campaign: utm?.utm_campaign || null,
      metadata: { candidate_id: newCandidate.id },
    });

    // Notifications are now handled by database trigger
    // notify_new_share_application() trigger will create notifications automatically

    const protocol = generateProtocol();

    return new Response(
      JSON.stringify({ 
        success: true, 
        protocol,
        message: 'Candidatura enviada com sucesso!' 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in submit-share-application:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
