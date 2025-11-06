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

    const extractionPrompt = `Você é um especialista em extração de dados de currículos brasileiros. Analise o texto abaixo extraído de um PDF de currículo e extraia as informações estruturadas.

IMPORTANTE: Seja AGRESSIVO na busca de informações. Procure padrões, variações e sinônimos. O texto pode estar mal formatado devido à extração do PDF.

EXEMPLOS REAIS DE COMO AS INFORMAÇÕES APARECEM:

📝 NOME COMPLETO:
- Geralmente é o PRIMEIRO texto do documento, em fonte maior
- Exemplos: "MARIA SILVA SANTOS", "João Pedro Oliveira", "Ana Costa"
- Busque por nomes próprios no início do texto
- Se houver múltiplos nomes, pegue o que parece mais completo

📧 EMAIL:
- Padrões: nome@email.com, nome.sobrenome@empresa.com.br
- Procure por "@" no texto
- Exemplos: maria.silva@gmail.com, joao.pedro@hotmail.com

📱 TELEFONE:
- Geralmente ACIMA ou PRÓXIMO ao email
- Padrões brasileiros: 
  * (11) 98765-4321
  * 11 98765-4321
  * +55 11 98765-4321
  * 11987654321
- Procure por sequências de números com 10-11 dígitos
- Pode ter DDD entre parênteses ou não

🔗 LINKEDIN:
- URLs começando com: linkedin.com/in/, br.linkedin.com/in/, www.linkedin.com/in/
- Exemplo: linkedin.com/in/maria-silva-santos

📍 LOCALIZAÇÃO:
- Geralmente no cabeçalho após nome/contato
- Formatos: "São Paulo, SP", "Rio de Janeiro - RJ", "Belo Horizonte/MG"
- Separe cidade e estado (estado com 2 letras)

💼 ÁREA E SENIORIDADE:
- Área: geralmente em "Objetivo", "Resumo" ou título após o nome
- Exemplos: "Analista de Dados", "Desenvolvedor Backend", "Designer UX/UI"
- Senioridade: inferir de:
  * Títulos: "Analista Jr", "Analista Pleno", "Analista Sênior", "Gerente", "Coordenador", "Diretor"
  * Anos de experiência: 0-2 anos = Júnior, 2-5 anos = Pleno, 5+ anos = Sênior
  * Se tiver cargo de gestão = Liderança

💰 SALÁRIO:
- Procure: "Pretensão salarial:", "Expectativa:", "Salário:"
- Formatos: "R$ 5.000,00", "R$ 5000", "A combinar", "Negociável"

🎓 FORMAÇÃO:
- Seções: "Formação", "Educação", "Formação Acadêmica"
- Informações típicas:
  * Grau: Técnico, Tecnólogo, Bacharel, Licenciatura, Especialização, MBA, Mestrado, Doutorado
  * Curso: Engenharia da Computação, Administração, Design Gráfico
  * Instituição: USP, UFRJ, FGV, Uninove, SENAC
  * Período: 2018-2022, 2020-atual, Jan/2019 - Dez/2022

💼 EXPERIÊNCIA PROFISSIONAL:
- Seções: "Experiência", "Experiência Profissional", "Histórico"
- Para cada experiência extraia:
  * Cargo: "Analista de Marketing", "Desenvolvedor Front-end"
  * Empresa: Nome da empresa
  * Período: "Jan/2020 - Atual", "2018-2020", "Mar/2019 a Set/2021"
  * Descrição: Resumo das atividades (pode ter bullets/lista)
- Para work_history: Compile TODA a seção de experiência em texto formatado

🛠️ HABILIDADES:
- Seções: "Habilidades", "Competências", "Skills", "Tecnologias"
- Podem estar em lista ou separadas por vírgula
- Exemplos: Python, SQL, React, Excel, Photoshop, Inglês Avançado

REGRAS DE CONFIANÇA:
- Alta (0.85-1.0): Informação clara e bem formatada
- Média (0.6-0.84): Informação encontrada mas formatação inconsistente
- Baixa (0.0-0.59): Inferência ou informação incerta

SCHEMA DE SAÍDA (JSON):
{
 "full_name": {"value": "...", "confidence": 0.95, "evidence": "Texto do topo do documento"},
 "email": {"value": "...", "confidence": 0.95, "evidence": "maria@email.com encontrado"},
 "phone": {"value": "...", "confidence": 0.90, "evidence": "(11) 98765-4321"},
 "linkedin_url": {"value": "...", "confidence": 0.90, "evidence": "linkedin.com/in/..."},
 "city": {"value":"São Paulo", "confidence":0.85, "evidence":"São Paulo, SP"},
 "state": {"value":"SP", "confidence":0.85, "evidence":"SP após cidade"},
 "area_of_expertise": {"value":"Desenvolvimento de Software", "confidence":0.80, "evidence":"Objetivo: Desenvolvedor..."},
 "desired_role": {"value":"Desenvolvedor Full Stack", "confidence":0.75, "evidence":"Buscando posição como..."},
 "seniority": {"value":"Pleno", "confidence":0.80, "evidence":"Analista Pleno no cargo atual"},
 "salary_expectation": {"value":"R$ 8.000,00", "confidence":0.85, "evidence":"Pretensão: R$ 8000"},
 "skills": [
   {"value":"Python","confidence":0.90,"evidence":"Habilidades: Python, SQL..."},
   {"value":"SQL","confidence":0.90,"evidence":"Python, SQL, React"}
 ],
 "education": [
   {"degree":"Bacharel","institution":"USP","years":"2015-2019","confidence":0.90,"evidence":"Bacharelado em Ciência da Computação - USP"}
 ],
 "work_experience": [
   {"title":"Desenvolvedor Pleno","company":"Tech Corp","from":"2020-01","to":"2024-06","summary":"Desenvolvimento de APIs REST...","confidence":0.85,"evidence":"Tech Corp (Jan/2020 - Jun/2024)"}
 ],
 "work_history": {"value": "Desenvolvedor Pleno na Tech Corp (2020-2024): APIs REST, microsserviços...\n\nDesenvolvedor Júnior na StartupXYZ (2018-2020): Front-end React...", "confidence": 0.85, "evidence": "Seção Experiência completa"},
 "portfolio_url": {"value":"github.com/usuario", "confidence":0.90,"evidence":"Portfolio: github.com/usuario"}
}

Se NÃO encontrar um campo, retorne null. NÃO INVENTE dados.

=== TEXTO DO CURRÍCULO ===
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