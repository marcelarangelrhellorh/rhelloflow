import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extrair user ID do JWT (já verificado pelo gateway com verify_jwt=true)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('Não autenticado');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sourceType = formData.get('source_type') as string;
    const vagaId = formData.get('vaga_id') as string | null;

    if (!file || !sourceType) {
      throw new Error('Arquivo ou tipo de origem ausente');
    }

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      throw new Error('Apenas arquivos PDF são permitidos');
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo: 10MB');
    }

    // Calcular hash do arquivo para deduplicação
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Criar registro de import
    const { data: importRecord, error: importError } = await supabaseClient
      .from('pdf_imports')
      .insert({
        created_by: userId,
        file_name: file.name,
        file_hash: fileHash,
        source_type: sourceType,
        vaga_id: vagaId,
        extracted_data: {},
        status: 'processing',
      })
      .select()
      .single();

    if (importError) throw importError;

    // Upload para storage temporário
    const storagePath = `${userId}/${importRecord.id}/${file.name}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('pdf-imports')
      .upload(storagePath, arrayBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      await supabaseClient.from('pdf_imports').delete().eq('id', importRecord.id);
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    // Atualizar com storage_path
    await supabaseClient
      .from('pdf_imports')
      .update({ storage_path: storagePath })
      .eq('id', importRecord.id);

    // Extrair texto do PDF usando API de parsing
    let extractedText = '';
    try {
      // Usar biblioteca de parsing de PDF para Deno
      const pdfBytes = new Uint8Array(arrayBuffer);
      
      // Aqui usaremos uma abordagem simples: converter para texto
      // Em produção, use uma lib como pdf-parse ou similar
      const decoder = new TextDecoder('utf-8', { fatal: false });
      extractedText = decoder.decode(pdfBytes);
      
      // Se o texto estiver vazio ou muito curto, pode ser um PDF de imagem
      if (extractedText.length < 100) {
        console.warn('PDF parece ser baseado em imagem - texto extraído muito curto');
        // Aqui você poderia integrar OCR (Tesseract, etc)
      }
    } catch (parseError) {
      console.error('Erro ao extrair texto do PDF:', parseError);
      await supabaseClient
        .from('pdf_imports')
        .update({
          status: 'failed',
          error_message: 'Erro ao extrair texto do PDF. Verifique se o PDF não está corrompido ou baseado em imagem.',
        })
        .eq('id', importRecord.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar PDF',
          import_id: importRecord.id,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chamar Lovable AI para extração estruturada
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const extractionPrompt = `Você é um extrator de dados de perfis profissionais. Abaixo está o texto extraído de um PDF (perfil LinkedIn / CV). Retorne APENAS um JSON válido com os campos descritos no schema. Para cada campo, inclua: value, confidence (0.0–1.0) e evidence (trecho do texto que suportou a extração, máximo 200 caracteres). Se não encontrar um campo, coloque null. Não invente valores.

ORIENTAÇÕES ESPECÍFICAS DE LOCALIZAÇÃO:
- Nome completo: Geralmente encontra-se na PARTE SUPERIOR do documento, em FONTE GRANDE ou destacada
- Telefone: Quando presente, normalmente está ACIMA da informação de e-mail, na seção de contato/cabeçalho
- E-mail: Geralmente no topo do documento, na seção de contato
- LinkedIn: Procure por URLs do LinkedIn (linkedin.com/in/...) no cabeçalho ou seção de contato
- Cidade/Estado: Normalmente no cabeçalho, próximo ao nome ou contato
- Área de Especialização: Pode estar em "Resumo", "Sobre", "Objetivo" ou logo após o nome
- Senioridade: Inferir dos títulos de cargo (Júnior, Pleno, Sênior, Gerente, Diretor, etc.)
- Pretensão Salarial: Procure por valores monetários com "R$", "salário", "pretensão"
- Habilidades/Skills: Procure em seções "Competências", "Habilidades", "Skills", "Tecnologias"
- Formação/Educação: Procure em seções "Formação", "Educação", "Academic Background", "Education"
- Experiência Profissional: Procure em seções "Experiência", "Histórico Profissional", "Work Experience", "Experience"
- Portfólio: URLs de sites pessoais, GitHub, Behance, Dribbble, etc.

Schema de saída (exemplo):
{
 "full_name": {"value": "...", "confidence": 0.0, "evidence": "..."},
 "email": {"value": "...", "confidence": 0.0, "evidence": "..."},
 "phone": {"value": "...", "confidence": 0.0, "evidence": "..."},
 "linkedin_url": {"value": "...", "confidence": 0.0, "evidence": "..."},
 "city": {"value":"...", "confidence":0.0, "evidence":"..."},
 "state": {"value":"...", "confidence":0.0, "evidence":"..."},
 "area_of_expertise": {"value":"...", "confidence":0.0, "evidence":"..."},
 "desired_role": {"value":"...", "confidence":0.0, "evidence":"..."},
 "seniority": {"value":"Júnior|Pleno|Sênior|Liderança|null", "confidence":0.0, "evidence":"..."},
 "salary_expectation": {"value":"R$ ... or 'A combinar' or null", "confidence":0.0, "evidence":"..."},
 "skills": [{"value":"SQL","confidence":0.0,"evidence":"..."}, ...],
 "education": [{"degree":"Bacharel em Engenharia","institution":"...", "years":"2016-2020","confidence":0.0,"evidence":"..."}],
 "work_experience": [{"title":"Analista de Dados","company":"Empresa X","from":"2021-01","to":"2023-06","summary":"...","confidence":0.0,"evidence":"..."}],
 "work_history": {"value": "Histórico completo de experiência profissional formatado de forma estruturada", "confidence": 0.0, "evidence": "..."},
 "portfolio_url": {"value":"...", "confidence":0.0, "evidence":"..."}
}

Texto extraído do PDF:
${extractedText.substring(0, 15000)}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em extrair dados estruturados de currículos e perfis profissionais.' },
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições atingido. Tente novamente em alguns instantes.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos do Lovable AI esgotados. Entre em contato com o suporte.');
      }
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices[0].message.content;

    // Extrair JSON da resposta (pode vir com markdown)
    let extractedData;
    try {
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(extractedContent);
      }
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', extractedContent);
      throw new Error('Formato de resposta inválido da IA');
    }

    // Calcular confiança global (média dos campos principais)
    const confidenceValues = [
      extractedData.full_name?.confidence || 0,
      extractedData.email?.confidence || 0,
      extractedData.phone?.confidence || 0,
      extractedData.area_of_expertise?.confidence || 0,
    ].filter(v => v > 0);
    
    const globalConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : 0;

    // Atualizar registro com dados extraídos
    await supabaseClient
      .from('pdf_imports')
      .update({
        extracted_data: extractedData,
        global_confidence: globalConfidence,
        status: 'completed',
      })
      .eq('id', importRecord.id);

    // Deletar arquivo do storage após processamento bem-sucedido
    await supabaseClient.storage
      .from('pdf-imports')
      .remove([storagePath]);

    // Limpar storage_path do registro
    await supabaseClient
      .from('pdf_imports')
      .update({ storage_path: null })
      .eq('id', importRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importRecord.id,
        extracted_data: extractedData,
        global_confidence: globalConfidence,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});