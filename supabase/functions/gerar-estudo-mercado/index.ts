import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `SISTEMA:
Você é o agente de IA da Rhello RH. Sua tarefa é gerar um **Estudo de Mercado Objetivo** (curto, direto e baseado em múltiplas fontes confiáveis) para uma função em uma região específica, a partir dos inputs do recrutador.

**CONTEXTO TEMPORAL IMPORTANTE:**
- Data atual: Novembro de 2025
- SEMPRE busque os dados MAIS RECENTES disponíveis (preferencialmente de 2025 - qualquer semestre)
- Se os dados mais recentes forem de períodos anteriores (2024 ou antes), INFORME CLARAMENTE isso nas "observacoes"
- Especifique SEMPRE o período/mês de referência dos dados nas "observacoes"

**FONTES QUE VOCÊ DEVE CONSULTAR (busque o máximo possível):**
- Sites de emprego: Catho, InfoJobs, Vagas.com, LinkedIn, Glassdoor Brasil, Indeed
- Pesquisas salariais: Guia Salarial Robert Half 2025/2026, Michael Page, Salario.com.br
- Dados governamentais: CAGED (mais recentes), RAIS, PNAD do IBGE
- Estudos de mercado e relatórios setoriais mais recentes disponíveis publicamente
- Outras fontes relevantes e atualizadas do mercado brasileiro

**IMPORTANTE SOBRE FONTES E ATUALIDADE:**
- Busque consultar pelo menos 5-8 fontes diferentes quando possível
- Priorize SEMPRE dados de 2025 (qualquer período do ano)
- Cruze informações de diferentes tipos de fontes para maior precisão
- Sempre forneça URLs válidas e acessíveis
- ESPECIFIQUE o período dos dados consultados (ex: "Dados de março/2025", "Relatório do 1º semestre/2025")
- Se os dados disponíveis forem de 2024 ou anteriores, mencione isso claramente nas "observacoes"

REGRAS GERAIS:
- RETORNE APENAS UM JSON VÁLIDO (NADA FORA DO JSON).
- Linguagem: Português (PT-BR), tom conciso e consultivo.
- Respostas curtas: bullet points, chips ou campos curtos. Evite parágrafos longos.
- Se não houver dado confiável para campos numéricos, retorne null e explique em "observacoes".
- Sempre preencha arrays (mesmo que vazios).
- Incluir as fontes usadas no campo "fontes" e a data/período em "observacoes".

SCHEMA DE SAÍDA OBRIGATÓRIO (RETORNE APENAS ESTE JSON):
{
  "funcao": string,
  "regiao": string,
  "senioridade": string|null,
  "tipos_contratacao": string[],
  "jornada": string|null,
  "faixas_salariais": Array<{
    tipo_contratacao: string,
    salario_media: number|null,
    salario_min: number|null,
    salario_max: number|null
  }>,
  "salario_ofertado": number|null,
  "tipo_contratacao_ofertado": string|null,
  "comparacao_oferta": "Abaixo" | "Dentro" | "Acima" | "Sem dado",
  "beneficios": string[],
  "demanda": "Alta" | "Média" | "Baixa",
  "tendencia_short": string|null,
  "fontes": Array<{nome: string, url: string}>,
  "observacoes": string,
  "raw": object
}

REGRAS DE CÁLCULO / DECISÕES:
- faixas_salariais: 
  - Se tipos_contratacao tiver mais de 1 item, retorne uma faixa salarial para CADA tipo
  - Se tipos_contratacao estiver vazio ou tiver 1 item, retorne pelo menos uma faixa (pode usar "Geral" como tipo)
  - Exemplo com múltiplos tipos: [{"tipo_contratacao":"CLT","salario_media":5000,"salario_min":4000,"salario_max":6000}, {"tipo_contratacao":"PJ","salario_media":7000,"salario_min":5500,"salario_max":9000}]

- comparacao_oferta: 
  - Se salario_ofertado == null → "Sem dado".
  - Caso contrário, busque a faixa salarial correspondente ao tipo_contratacao_ofertado
  - Se não houver faixa ou salario_media == null → "Sem dado" (e explique em observacoes).
  - Use tolerância de ±7% em relação à salario_media da faixa correspondente para considerar "Dentro".
  - Se salario_ofertado < salario_media * 0.93 → "Abaixo".
  - Se salario_ofertado > salario_media * 1.07 → "Acima".
  - Caso contrário → "Dentro".

- Demanda (Alta/Média/Baixa): baseie-se em evidências (vagas abertas, histórico interno). Se não houver dados, retorne "Média" e explique em observacoes.

- Benefícios: liste até 6 itens mais frequentes; se nenhum dado, retorne array vazio.

- Fontes: SEMPRE retorne um array de objetos com "nome" e "url". Para cada fonte consultada, forneça o link direto da página onde os dados foram encontrados. Exemplos:
  - {"nome": "Glassdoor", "url": "https://www.glassdoor.com.br/Salários/[cargo]-sls-[codigo].htm"}
  - {"nome": "Salario.com.br", "url": "https://www.salario.com.br/profissao/[cargo]"}
  - Se não houver URL disponível, use a home page da fonte.

IMPORTANTE:
- RETORNE somente o JSON (sem comentários, sem texto extra).
- Cite em "fontes" apenas as fontes realmente consultadas COM SEUS LINKS DIRETOS.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();

    // Validação de campos obrigatórios
    if (!body.funcao || !body.regiao) {
      return new Response(
        JSON.stringify({
          erro: true,
          mensagem: 'Campos obrigatórios ausentes',
          campos_faltantes: [
            !body.funcao ? 'funcao' : null,
            !body.regiao ? 'regiao' : null
          ].filter(Boolean)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Construir o input para a IA
    const aiInput = {
      funcao: body.funcao,
      regiao: body.regiao,
      senioridade: body.senioridade || null,
      tipos_contratacao: body.tipos_contratacao || [],
      jornada: body.jornada || null,
      salario_ofertado: body.salario_ofertado || null,
      tipo_contratacao_ofertado: body.tipo_contratacao_ofertado || null,
      vagasContext: body.vagasContext || { vaga_id: null, origem_pagina: null },
      fontes_preferenciais: ['Glassdoor', 'Salario.com.br']
    };

    console.log('Gerando estudo de mercado para:', aiInput);

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Gere um estudo de mercado com base neste input:\n\n${JSON.stringify(aiInput, null, 2)}`
          }
        ],
        temperature: 0.3
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ erro: true, mensagem: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ erro: true, mensagem: 'Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage.' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 402
          }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Extrair JSON da resposta
    let estudoData;
    try {
      // Tentar parse direto
      estudoData = JSON.parse(content);
    } catch {
      // Tentar extrair JSON de markdown code block
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        estudoData = JSON.parse(jsonMatch[1]);
      } else {
        // Tentar extrair JSON de qualquer lugar
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          estudoData = JSON.parse(content.substring(jsonStart, jsonEnd));
        } else {
          throw new Error('Não foi possível extrair JSON válido da resposta');
        }
      }
    }

    // Validar estrutura mínima
    if (!estudoData.funcao || !estudoData.regiao) {
      throw new Error('Resposta da IA não contém campos obrigatórios');
    }

    console.log('Estudo gerado com sucesso:', estudoData.funcao);

    // Salvar no banco
    const { data: estudoSalvo, error: dbError } = await supabase
      .from('estudos')
      .insert({
        funcao: estudoData.funcao,
        cidade: estudoData.regiao.split(' - ')[0],
        uf: estudoData.regiao.split(' - ')[1]?.substring(0, 2),
        modelo_trabalho: estudoData.jornada,
        salario_cliente: estudoData.salario_ofertado,
        observacoes: estudoData.observacoes,
        resultado: estudoData,
        periodo: new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar estudo no banco:', dbError);
    } else {
      console.log('Estudo salvo com ID:', estudoSalvo.id);
    }

    return new Response(
      JSON.stringify(estudoData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro ao gerar estudo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ erro: true, mensagem: `Erro ao gerar estudo: ${errorMessage}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
