import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `SISTEMA:
Você é o agente de IA da Rhello RH. Sua tarefa é gerar **Estudos de Mercado Objetivo e Comparativos** para uma função em múltiplas regiões, a partir dos inputs do recrutador.

**CONTEXTO TEMPORAL IMPORTANTE:**
- Data atual: Novembro de 2025
- SEMPRE busque os dados MAIS RECENTES disponíveis (preferencialmente de 2025 - qualquer semestre)
- Se os dados mais recentes forem de períodos anteriores (2024 ou antes), INFORME CLARAMENTE isso nas "observacoes" de cada região
- Especifique SEMPRE o período/mês de referência dos dados nas "observacoes"

**FONTES QUE VOCÊ DEVE CONSULTAR (busque o máximo possível):**
- Sites de emprego: Catho, InfoJobs, Vagas.com, LinkedIn, Glassdoor Brasil, Indeed
- Pesquisas salariais: Guia Salarial Robert Half 2025/2026, Michael Page, Salario.com.br
- Dados governamentais: CAGED (mais recentes), RAIS, PNAD do IBGE
- Estudos de mercado e relatórios setoriais mais recentes disponíveis publicamente
- Outras fontes relevantes e atualizadas do mercado brasileiro

**IMPORTANTE SOBRE REGIÕES E CIDADES:**
- Você receberá um array de regiões para analisar
- Se cidades específicas forem informadas, priorize dados dessas cidades sobre dados regionais genéricos
- Para múltiplas cidades: gere análises INDEPENDENTES para cada cidade (não por região)
- Se apenas regiões (sem cidades): gere análises por região
- Mantenha as fontes ÚNICAS no nível geral (não duplicar por região/cidade)
- A tendência geral é única, mas observe variações regionais/locais
- Compare os dados entre regiões/cidades quando relevante nas observações

REGRAS GERAIS:
- RETORNE APENAS UM JSON VÁLIDO (NADA FORA DO JSON).
- Linguagem: Português (PT-BR), tom conciso e consultivo.
- Respostas curtas: bullet points, chips ou campos curtos. Evite parágrafos longos.
- Se não houver dado confiável para campos numéricos, retorne null e explique em "observacoes".
- Sempre preencha arrays (mesmo que vazios).
- Incluir as fontes usadas no campo "fontes" e a data/período em "observacoes" de cada região.

SCHEMA DE SAÍDA OBRIGATÓRIO (RETORNE APENAS ESTE JSON):
{
  "funcao": string,
  "regioes": string[],
  "senioridade": string|null,
  "tipos_contratacao": string[],
  "jornada": string|null,
  "salario_ofertado": number|null,
  "tipo_contratacao_ofertado": string|null,
  "estudos_regionais": Array<{
    regiao: string,
    faixas_salariais: Array<{
      tipo_contratacao: string,
      salario_media: number|null,
      salario_min: number|null,
      salario_max: number|null
    }>,
    comparacao_oferta: "Abaixo" | "Dentro" | "Acima" | "Sem dado",
    beneficios: string[],
    demanda: "Alta" | "Média" | "Baixa",
    observacoes: string
  }>,
  "tendencia_short": string|null,
  "fontes": Array<{nome: string, url: string}>,
  "raw": object
}

REGRAS DE CÁLCULO / DECISÕES:

Para CADA região no array estudos_regionais:

- faixas_salariais: 
  - Se tipos_contratacao tiver mais de 1 item, retorne uma faixa salarial para CADA tipo
  - Se tipos_contratacao estiver vazio ou tiver 1 item, retorne pelo menos uma faixa (pode usar "Geral" como tipo)
  - Busque dados ESPECÍFICOS da região em questão

- comparacao_oferta: 
  - Se salario_ofertado == null → "Sem dado".
  - Caso contrário, busque a faixa salarial correspondente ao tipo_contratacao_ofertado PARA AQUELA REGIÃO
  - Se não houver faixa ou salario_media == null → "Sem dado" (e explique em observacoes).
  - Use tolerância de ±7% em relação à salario_media da faixa correspondente para considerar "Dentro".
  - Se salario_ofertado < salario_media * 0.93 → "Abaixo".
  - Se salario_ofertado > salario_media * 1.07 → "Acima".
  - Caso contrário → "Dentro".

- Demanda (Alta/Média/Baixa): baseie-se em evidências REGIONAIS (vagas abertas, histórico). Se não houver dados, retorne "Média" e explique em observacoes.

- Benefícios: liste até 6 itens mais frequentes NAQUELA REGIÃO; se nenhum dado, retorne array vazio.

- Observações: Mencione SEMPRE o período/data dos dados consultados. Compare com outras regiões se relevante. Explique particularidades regionais.

- tendencia_short: Visão geral do mercado para essa função, considerando TODAS as regiões analisadas. Máximo 2-3 frases.

- fontes: Lista ÚNICA de todas as fontes consultadas (não duplicar por região).

ATENÇÃO: O retorno DEVE ser JSON puro. Não adicione nada antes ou depois. Se necessário incluir explicações adicionais, coloque em "raw".
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Configuração do servidor incompleta.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      funcao,
      regioes,
      cidades,
      senioridade,
      tipos_contratacao,
      jornada,
      salario_ofertado,
      tipo_contratacao_ofertado
    } = body;

    if (!funcao || !regioes || regioes.length === 0) {
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Função e ao menos uma região são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inputPayload = {
      funcao,
      regioes,
      cidades: cidades && cidades.length > 0 ? cidades : ['Não especificado'],
      senioridade: senioridade || 'Não especificado',
      tipos_contratacao: tipos_contratacao && tipos_contratacao.length > 0 ? tipos_contratacao : ['Geral'],
      jornada: jornada || 'Não especificado',
      salario_ofertado: salario_ofertado || null,
      tipo_contratacao_ofertado: tipo_contratacao_ofertado || null
    };

    const prompt = `Gere um estudo de mercado comparativo para:\n\n${JSON.stringify(inputPayload, null, 2)}`;

    console.log('Chamando Lovable AI Gateway...');
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
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ erro: true, mensagem: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ erro: true, mensagem: 'Créditos insuficientes. Entre em contato com o suporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro ao chamar Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('Resposta da IA recebida, processando JSON...');

    let parsedEstudo;
    try {
      parsedEstudo = JSON.parse(rawContent);
    } catch (parseError) {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedEstudo = JSON.parse(jsonMatch[0]);
      } else {
        const codeBlockMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          parsedEstudo = JSON.parse(codeBlockMatch[1]);
        } else {
          throw new Error('Não foi possível extrair JSON válido da resposta da IA');
        }
      }
    }

    if (!parsedEstudo.funcao || !parsedEstudo.estudos_regionais) {
      throw new Error('Estrutura mínima inválida no JSON retornado');
    }

    console.log('Estudo gerado com sucesso');
    return new Response(
      JSON.stringify(parsedEstudo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao gerar estudo:', error);
    return new Response(
      JSON.stringify({
        erro: true,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao gerar estudo'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
