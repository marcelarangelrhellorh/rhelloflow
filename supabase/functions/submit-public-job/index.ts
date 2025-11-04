import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiting storage (in production, use Redis or similar)
const submissionTracker = new Map<string, { count: number; timestamp: number }>();

function cleanupOldEntries() {
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, value] of submissionTracker.entries()) {
    if (value.timestamp < oneHourAgo) {
      submissionTracker.delete(key);
    }
  }
}

function checkRateLimit(identifier: string): boolean {
  cleanupOldEntries();
  
  const entry = submissionTracker.get(identifier);
  const now = Date.now();
  
  if (!entry) {
    submissionTracker.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  // Reset counter if more than 1 hour has passed
  if (now - entry.timestamp > 3600000) {
    submissionTracker.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  // Check if under limit (3 per hour)
  if (entry.count < 3) {
    entry.count++;
    return true;
  }
  
  return false;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  // Remove HTML tags and trim
  return text.replace(/<[^>]*>/g, '').trim();
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // Rate limiting check
    if (!checkRateLimit(clientIp)) {
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
    
    // Validate required fields
    if (!payload.titulo || payload.titulo.length < 3 || payload.titulo.length > 200) {
      throw new Error('Título inválido (deve ter entre 3 e 200 caracteres)');
    }
    
    if (!payload.empresa || payload.empresa.length < 2 || payload.empresa.length > 200) {
      throw new Error('Nome da empresa inválido (deve ter entre 2 e 200 caracteres)');
    }
    
    if (!payload.contato_email || !validateEmail(payload.contato_email)) {
      throw new Error('Email de contato inválido');
    }
    
    if (!payload.contato_nome || payload.contato_nome.length < 2 || payload.contato_nome.length > 100) {
      throw new Error('Nome de contato inválido (deve ter entre 2 e 100 caracteres)');
    }

    // Sanitize all text inputs
    const sanitizedData = {
      titulo: sanitizeText(payload.titulo).substring(0, 200),
      empresa: sanitizeText(payload.empresa).substring(0, 200),
      contato_nome: sanitizeText(payload.contato_nome).substring(0, 100),
      contato_email: sanitizeText(payload.contato_email).substring(0, 255),
      contato_telefone: payload.contato_telefone ? sanitizeText(payload.contato_telefone).substring(0, 50) : null,
      salario_min: payload.salario_min || null,
      salario_max: payload.salario_max || null,
      salario_modalidade: payload.salario_modalidade || 'FAIXA',
      modelo_trabalho: payload.modelo_trabalho || null,
      horario_inicio: payload.horario_inicio || null,
      horario_fim: payload.horario_fim || null,
      dias_semana: payload.dias_semana || null,
      beneficios: payload.beneficios || null,
      beneficios_outros: payload.beneficios_outros ? sanitizeText(payload.beneficios_outros).substring(0, 500) : null,
      requisitos_obrigatorios: payload.requisitos_obrigatorios ? sanitizeText(payload.requisitos_obrigatorios).substring(0, 5000) : null,
      requisitos_desejaveis: payload.requisitos_desejaveis ? sanitizeText(payload.requisitos_desejaveis).substring(0, 5000) : null,
      responsabilidades: payload.responsabilidades ? sanitizeText(payload.responsabilidades).substring(0, 5000) : null,
      observacoes: payload.observacoes ? sanitizeText(payload.observacoes).substring(0, 2000) : null,
      confidencial: payload.confidencial || false,
      motivo_confidencial: payload.motivo_confidencial ? sanitizeText(payload.motivo_confidencial).substring(0, 500) : null,
      source: 'externo',
      status: 'A iniciar',
      status_slug: 'a_iniciar',
    };

    // Validate salary range if both provided
    if (sanitizedData.salario_min && sanitizedData.salario_max) {
      if (sanitizedData.salario_min > sanitizedData.salario_max) {
        throw new Error('Salário mínimo não pode ser maior que o máximo');
      }
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert the job posting
    const { data, error } = await supabaseAdmin
      .from('vagas')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Erro ao criar vaga');
    }

    console.log(`Job submission successful from IP ${clientIp}: ${data.id}`);

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
    
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar solicitação';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
