import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const candidateSchema = z.object({
  nome_completo: z.string().trim().min(2, 'Nome muito curto').max(255, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  telefone: z.string().trim().min(8, 'Telefone inválido').max(50, 'Telefone muito longo'),
  cidade: z.string().trim().max(100).nullable().optional().transform(val => val || null),
  estado: z.string().trim().max(2).nullable().optional().transform(val => val || null),
  linkedin: z.string().trim().max(500).nullable().optional().transform(val => val || null),
  pretensao_salarial: z.union([z.number().positive(), z.string().transform((val) => {
    if (!val || val === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  })]).nullable().optional(),
  area: z.string().max(100).nullable().optional().transform(val => val || null),
  nivel: z.string().max(50).nullable().optional().transform(val => val || null),
  disponibilidade_mudanca: z.string().trim().max(500).nullable().optional().transform(val => val || null),
  mensagem: z.string().trim().max(2000).nullable().optional().transform(val => val || null),
  // Honeypot field
  company: z.string().max(0).optional(),
});

const applicationSchema = z.object({
  token: z.string().min(1, 'Token inválido'),
  candidate: candidateSchema,
  password: z.string().optional(),
  utm: z.object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
  }).optional(),
  files: z.object({
    resume: z.object({
      data: z.string(),
      name: z.string(),
    }).optional(),
    portfolio: z.object({
      data: z.string(),
      name: z.string(),
    }).optional(),
  }).optional(),
  formStartTime: z.number().optional(),
});

// Rate limiting
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

function sanitizeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return firstError?.message || 'Dados inválidos';
  }
  
  if (error instanceof Error) {
    const safeMessages = [
      'Link inválido',
      'Link expirado',
      'Link desativado',
      'Senha incorreta',
      'Senha necessária',
      'Limite de inscrições atingido',
      'Muitas submissões',
      'Campos obrigatórios',
    ];
    
    if (safeMessages.some(msg => error.message.includes(msg))) {
      return error.message;
    }
  }
  
  return 'Erro ao processar candidatura. Tente novamente.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    
    // Validate with Zod
    const validatedData = applicationSchema.parse(payload);
    
    const { token, candidate, password, utm, files, formStartTime } = validatedData;
    
    // Honeypot check
    if (candidate.company && candidate.company.length > 0) {
      console.log(`Honeypot triggered for token: ${token}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          protocol: generateProtocol(),
          message: 'Candidatura enviada com sucesso!' 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Timing check
    if (formStartTime) {
      const submissionTime = Date.now() - formStartTime;
      if (submissionTime < 3000) {
        console.log(`Suspicious fast submission, time: ${submissionTime}ms`);
        return new Response(
          JSON.stringify({ error: 'Submissão muito rápida. Por favor, revise seus dados.' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    // Get share link
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
      throw new Error('Link inválido ou expirado');
    }

    if (!shareLink.active) {
      throw new Error('Este link foi desativado');
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      throw new Error('Este link expirou');
    }

    if (shareLink.max_submissions && shareLink.submissions_count >= shareLink.max_submissions) {
      throw new Error('Limite de inscrições atingido');
    }

    // Verify password
    if (shareLink.password_hash && password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const inputHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (inputHash !== shareLink.password_hash) {
        throw new Error('Senha incorreta');
      }
    } else if (shareLink.password_hash && !password) {
      throw new Error('Senha necessária');
    }

    // Handle file uploads
    let curriculo_url = null;
    let portfolio_url = null;

    if (files?.resume) {
      try {
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

    // Get recruiter name
    let recrutadorNome = null;
    if (shareLink.vagas?.recrutador_id) {
      const { data: recrutadorData } = await supabase
        .from('users')
        .select('name')
        .eq('id', shareLink.vagas.recrutador_id)
        .single();
      
      recrutadorNome = recrutadorData?.name || null;
    }

    // Prepare sanitized candidate data
    const sanitizedCandidate = {
      nome_completo: sanitizeText(candidate.nome_completo),
      email: sanitizeText(candidate.email),
      telefone: sanitizeText(candidate.telefone),
      cidade: candidate.cidade ? sanitizeText(candidate.cidade) : null,
      estado: candidate.estado ? sanitizeText(candidate.estado) : null,
      linkedin: candidate.linkedin ? sanitizeText(candidate.linkedin) : null,
      pretensao_salarial: candidate.pretensao_salarial || null,
      area: candidate.area || null,
      nivel: candidate.nivel || null,
      disponibilidade_mudanca: candidate.disponibilidade_mudanca ? sanitizeText(candidate.disponibilidade_mudanca) : null,
      curriculo_url,
      portfolio_url,
      feedback: candidate.mensagem ? sanitizeText(candidate.mensagem) : null,
      vaga_relacionada_id: shareLink.vaga_id,
      source_link_id: shareLink.id,
      utm: utm || null,
      status: 'Selecionado',
      origem: 'Link de Divulgação',
      recrutador: recrutadorNome,
    };

    // Create candidate
    const { data: newCandidate, error: candidateError } = await supabase
      .from('candidatos')
      .insert(sanitizedCandidate)
      .select()
      .single();

    if (candidateError) {
      console.error('Error creating candidate:', candidateError);
      throw new Error('Erro ao processar candidatura');
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
    const errorMessage = sanitizeError(error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
