import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const publicJobSchema = z.object({
  titulo: z.string().trim().min(3, 'Título muito curto').max(200, 'Título muito longo'),
  empresa: z.string().trim().min(2, 'Nome da empresa muito curto').max(200, 'Nome da empresa muito longo'),
  cnpj: z.string()
    .transform(s => s.replace(/\D/g, ''))
    .refine(s => s.length === 14, 'CNPJ deve ter 14 dígitos'),
  resumo_empresa: z.string().trim().max(2000, 'Resumo muito longo').nullable().optional(),
  endereco_empresa: z.string().trim().max(500, 'Endereço muito longo').nullable().optional(),
  contato_email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  contato_nome: z.string().trim().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  contato_telefone: z.string().trim().max(50).nullable().optional(),
  salario_min: z.number().positive().nullable().optional(),
  salario_max: z.number().positive().nullable().optional(),
  salario_modalidade: z.enum(['FAIXA', 'A_PARTIR_DE', 'A_COMBINAR']).nullable().optional(),
  modelo_trabalho: z.string().max(50).nullable().optional(),
  tipo_contratacao: z.string().max(50).nullable().optional(),
  horario_inicio: z.string().max(10).nullable().optional(),
  horario_fim: z.string().max(10).nullable().optional(),
  dias_semana: z.array(z.string()).nullable().optional(),
  beneficios: z.array(z.string()).nullable().optional(),
  beneficios_outros: z.string().trim().max(500).nullable().optional(),
  requisitos_obrigatorios: z.string().trim().max(5000).nullable().optional(),
  requisitos_desejaveis: z.string().trim().min(10, 'Requisitos desejáveis muito curtos').max(5000),
  habilidades_comportamentais: z.string().trim().min(10, 'Descreva as habilidades comportamentais').max(5000),
  quantidade_vagas: z.number().int().min(1).max(100).default(1),
  responsabilidades: z.string().trim().max(5000).nullable().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
  confidencial: z.boolean().nullable().optional(),
  motivo_confidencial: z.string().trim().max(500).nullable().optional(),
  motivo_contratacao: z.enum(['aumento_quadro', 'substituicao', 'reposicao']).nullable().optional(),
  // Honeypot field - should always be empty
  website: z.string().max(0).optional(),
  // Timing check - submission should take at least 3 seconds
  formStartTime: z.number().optional(),
});

// Persistent rate limiting using database
async function checkRateLimit(supabaseAdmin: any, identifier: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  // Count submissions from this IP in the last hour
  const { count, error } = await supabaseAdmin
    .from('public_job_submissions_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', identifier)
    .gte('submitted_at', oneHourAgo)
    .eq('blocked', false);
  
  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error to not block legitimate users
  }
  
  return (count ?? 0) < 3;
}

// Check for duplicate content
async function checkDuplicateContent(supabaseAdmin: any, contentHash: string): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  
  const { data, error } = await supabaseAdmin
    .from('public_job_submissions_log')
    .select('id')
    .eq('content_hash', contentHash)
    .gte('submitted_at', oneDayAgo)
    .limit(1);
  
  if (error) {
    console.error('Duplicate check error:', error);
    return false; // Allow on error
  }
  
  return data && data.length > 0;
}

// Generate content hash for duplicate detection
function generateContentHash(data: any): string {
  const contentString = JSON.stringify({
    titulo: data.titulo,
    empresa: data.empresa,
    requisitos: data.requisitos_obrigatorios,
    responsabilidades: data.responsabilidades,
  });
  
  // Simple hash function (for production, consider using crypto.subtle)
  let hash = 0;
  for (let i = 0; i < contentString.length; i++) {
    const char = contentString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function sanitizeText(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

function sanitizeError(error: unknown): string {
  // Return user-friendly messages without technical details
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return firstError?.message || 'Dados inválidos';
  }
  
  if (error instanceof Error) {
    // Only return safe error messages
    const safeMessages = [
      'Título inválido',
      'Email inválido',
      'Nome inválido',
      'Salário mínimo não pode ser maior que o máximo',
      'Limite de envios atingido',
    ];
    
    if (safeMessages.some(msg => error.message.includes(msg))) {
      return error.message;
    }
  }
  
  // Generic error for production
  return 'Erro ao processar solicitação. Tente novamente.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // Initialize Supabase admin client early for rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Persistent rate limiting check
    const rateLimitOk = await checkRateLimit(supabaseAdmin, clientIp);
    if (!rateLimitOk) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: 'Limite de envios atingido. Tente novamente em 1 hora.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload = await req.json();
    
    // Honeypot check - if website field is filled, it's likely a bot
    if (payload.website && payload.website.length > 0) {
      console.log(`Honeypot triggered for IP: ${clientIp}`);
      // Return success to not alert the bot
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Vaga criada com sucesso!' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Timing check - submission should take at least 2 seconds
    if (payload.formStartTime) {
      const submissionTime = Date.now() - payload.formStartTime;
      if (submissionTime < 2000) {
        console.log(`Suspicious fast submission from IP: ${clientIp}, time: ${submissionTime}ms`);
        return new Response(
          JSON.stringify({ 
            error: 'Submissão muito rápida. Por favor, revise seus dados.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Validate with Zod
    const validatedData = publicJobSchema.parse(payload);
    
    // Additional salary validation
    if (validatedData.salario_min && validatedData.salario_max) {
      if (validatedData.salario_min > validatedData.salario_max) {
        throw new Error('Salário mínimo não pode ser maior que o máximo');
      }
    }
    
    // Generate content hash for duplicate detection
    const contentHash = generateContentHash(validatedData);
    
    // Check for duplicate content
    const isDuplicate = await checkDuplicateContent(supabaseAdmin, contentHash);
    if (isDuplicate) {
      console.log(`Duplicate content detected from IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: 'Esta vaga já foi submetida recentemente. Aguarde 24 horas para reenviar.' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Vincular ou criar empresa com base no CNPJ
    let empresaId = null;
    const sanitizedEmpresa = sanitizeText(validatedData.empresa);
    const sanitizedContatoNome = sanitizeText(validatedData.contato_nome);
    const sanitizedContatoEmail = sanitizeText(validatedData.contato_email);
    const sanitizedContatoTelefone = validatedData.contato_telefone ? sanitizeText(validatedData.contato_telefone) : null;

    // Verificar se empresa já existe
    const { data: empresaExistente } = await supabaseAdmin
      .from('empresas')
      .select('id, nome')
      .eq('cnpj', validatedData.cnpj)
      .maybeSingle();

    if (empresaExistente) {
      // Vincular à empresa existente
      empresaId = empresaExistente.id;
      console.log(`Vaga vinculada à empresa existente: ${empresaExistente.nome} (${empresaExistente.id})`);
    } else {
      // Criar empresa básica com dados fornecidos
      const sanitizedResumo = validatedData.resumo_empresa ? sanitizeText(validatedData.resumo_empresa) : null;
      const sanitizedEndereco = validatedData.endereco_empresa ? sanitizeText(validatedData.endereco_empresa) : null;
      
      const { data: novaEmpresa, error: empresaError } = await supabaseAdmin
        .from('empresas')
        .insert([{
          nome: sanitizedEmpresa,
          cnpj: validatedData.cnpj,
          status: 'Lead',
          contato_principal_nome: sanitizedContatoNome,
          contato_principal_email: sanitizedContatoEmail,
          contato_principal_telefone: sanitizedContatoTelefone,
          endereco: sanitizedEndereco, // Copiar endereço para empresa
          observacoes: sanitizedResumo, // Copiar resumo para observações
        }])
        .select('id, nome')
        .single();
      
      if (!empresaError && novaEmpresa) {
        empresaId = novaEmpresa.id;
        console.log(`Nova empresa criada automaticamente: ${novaEmpresa.nome} (${novaEmpresa.id})`);
      } else {
        console.error('Erro ao criar empresa:', empresaError);
        // Continua sem vincular empresa - não bloqueia criação da vaga
      }
    }

    // Prepare sanitized data for insertion
    const sanitizedData = {
      titulo: sanitizeText(validatedData.titulo),
      empresa: sanitizedEmpresa,
      empresa_id: empresaId,
      resumo_empresa: validatedData.resumo_empresa ? sanitizeText(validatedData.resumo_empresa) : null,
      endereco_empresa: validatedData.endereco_empresa ? sanitizeText(validatedData.endereco_empresa) : null,
      contato_nome: sanitizedContatoNome,
      contato_email: sanitizedContatoEmail,
      contato_telefone: sanitizedContatoTelefone,
      salario_min: validatedData.salario_min || null,
      salario_max: validatedData.salario_max || null,
      salario_modalidade: validatedData.salario_modalidade || 'FAIXA',
      modelo_trabalho: validatedData.modelo_trabalho || null,
      tipo_contratacao: validatedData.tipo_contratacao || null,
      horario_inicio: validatedData.horario_inicio || null,
      horario_fim: validatedData.horario_fim || null,
      dias_semana: validatedData.dias_semana || null,
      beneficios: validatedData.beneficios || null,
      beneficios_outros: validatedData.beneficios_outros ? sanitizeText(validatedData.beneficios_outros) : null,
      requisitos_obrigatorios: validatedData.requisitos_obrigatorios ? sanitizeText(validatedData.requisitos_obrigatorios) : null,
      requisitos_desejaveis: sanitizeText(validatedData.requisitos_desejaveis),
      habilidades_comportamentais: sanitizeText(validatedData.habilidades_comportamentais),
      quantidade_vagas: validatedData.quantidade_vagas,
      responsabilidades: validatedData.responsabilidades ? sanitizeText(validatedData.responsabilidades) : null,
      observacoes: validatedData.observacoes ? sanitizeText(validatedData.observacoes) : null,
      confidencial: validatedData.confidencial || false,
      motivo_confidencial: validatedData.motivo_confidencial ? sanitizeText(validatedData.motivo_confidencial) : null,
      motivo_contratacao: validatedData.motivo_contratacao || null,
      source: 'externo',
      status: 'Discovery',
      status_slug: 'discovery',
      status_order: 1,
    };

    // Insert job into database
    const { data, error } = await supabaseAdmin
      .from('vagas')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Erro ao criar vaga');
    }

    // Log submission for rate limiting and duplicate detection
    await supabaseAdmin
      .from('public_job_submissions_log')
      .insert([{
        ip_address: clientIp,
        company_name: sanitizedData.empresa,
        job_title: sanitizedData.titulo,
        content_hash: contentHash,
        blocked: false,
      }]);

    console.log(`Job submission successful from IP ${clientIp}: ${data.id}, empresa_id: ${empresaId}`);

    // Notify admins about new external job (non-blocking)
    try {
      const { data: admins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins?.length) {
        for (const admin of admins) {
          // Create notification
          await supabaseAdmin.rpc('create_notification', {
            p_user_id: admin.user_id,
            p_kind: 'vaga_externa',
            p_title: 'Nova vaga recebida',
            p_body: `${sanitizedData.empresa} enviou a vaga: ${sanitizedData.titulo}`,
            p_job_id: data.id,
          });
          
          // Send email
          await supabaseAdmin.functions.invoke('send-notification-email', {
            body: {
              user_id: admin.user_id,
              kind: 'vaga_externa',
              title: 'Nova vaga recebida',
              body: `${sanitizedData.empresa} enviou a vaga: ${sanitizedData.titulo}`,
              job_id: data.id,
            },
          });
        }
        console.log(`Notifications sent to ${admins.length} admins`);
      }
    } catch (notifyErr) {
      console.error('Error notifying admins:', notifyErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Vaga criada com sucesso!',
        id: data.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in submit-public-job:', error);
    
    const errorMessage = sanitizeError(error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
