import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Você é um assistente especialista em remuneração que analisa guias salariais padronizados (Hays 2026 e Michael Page 2026). Receberá como entrada um conjunto de registros (trechos extraídos) e as informações do usuário (cargo, senioridade, localidade). Sua resposta deve ser sempre um JSON válido estritamente no formato especificado abaixo — sem texto adicional fora do JSON. Normatize todos os valores monetários para R$ / mês. Se a fonte trouxer somente valores anuais, converta para mensal dividindo por 12 e marque a conversão.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Configuração do servidor incompleta.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials não configuradas');
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Configuração do banco de dados incompleta.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { cargo, senioridade, localidade } = body;

    if (!cargo) {
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Cargo é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Buscando benchmarks para:', { cargo, senioridade, localidade });

    // Normalizar cargo para busca
    const cargoNormalized = cargo.toLowerCase()
      .replace(/[áàãâä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòõôö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .trim();

    let benchmarks: any[] = [];
    let dbError = null;

    // PASSO 1: Busca exata/próxima no cargo_canonico
    console.log('Passo 1: Busca exata para:', cargoNormalized);
    
    const { data: exactData, error: exactError } = await supabaseClient
      .from('salary_benchmarks')
      .select('*')
      .or(`cargo_canonico.ilike.%${cargoNormalized}%,cargo_canonico.ilike.%${cargoNormalized}s%,cargo_original.ilike.%${cargoNormalized}%`)
      .limit(50);
    
    if (exactError) {
      console.error('Erro na busca exata:', exactError);
      dbError = exactError;
    }
    
    benchmarks = exactData || [];
    
    const haysExact = benchmarks.filter(b => b.source === 'hays').length;
    const mpExact = benchmarks.filter(b => b.source === 'michael_page').length;
    console.log(`Passo 1 resultados: ${benchmarks.length} total (Hays: ${haysExact}, Michael Page: ${mpExact})`);

    // PASSO 2: Se poucos resultados, expandir com termos parciais
    if (benchmarks.length < 15) {
      console.log('Passo 2: Expandindo busca com termos parciais...');
      
      const stopWords = ['de', 'da', 'do', 'em', 'para', 'com', 'por', 'e', 'ou', 'a', 'o'];
      const searchTerms = cargoNormalized
        .split(/\s+/)
        .filter((t: string) => t.length > 2 && !stopWords.includes(t));
      
      console.log('Termos de busca expandida:', searchTerms);
      
      if (searchTerms.length > 0) {
        // Construir condições OR para cada termo
        const orConditions: string[] = [];
        for (const term of searchTerms) {
          orConditions.push(`cargo_canonico.ilike.%${term}%`);
          orConditions.push(`cargo_original.ilike.%${term}%`);
        }
        
        const { data: expandedData, error: expandedError } = await supabaseClient
          .from('salary_benchmarks')
          .select('*')
          .or(orConditions.join(','))
          .limit(80);
        
        if (expandedError) {
          console.error('Erro na busca expandida:', expandedError);
        } else if (expandedData) {
          // Mesclar resultados, evitando duplicatas
          const existingIds = new Set(benchmarks.map(b => b.id));
          const newRecords = expandedData.filter(b => !existingIds.has(b.id));
          benchmarks = [...benchmarks, ...newRecords];
          
          const haysTotal = benchmarks.filter(b => b.source === 'hays').length;
          const mpTotal = benchmarks.filter(b => b.source === 'michael_page').length;
          console.log(`Passo 2 resultados: +${newRecords.length} novos (Total: ${benchmarks.length}, Hays: ${haysTotal}, Michael Page: ${mpTotal})`);
        }
      }
    }

    // PASSO 3: Se ainda sem resultados, buscar amostra geral
    if (benchmarks.length === 0) {
      console.log('Passo 3: Nenhum resultado, buscando amostra geral...');
      const { data, error } = await supabaseClient
        .from('salary_benchmarks')
        .select('*')
        .limit(100);
      
      benchmarks = data || [];
      dbError = error;
    }

    // Log detalhado dos cargos encontrados
    const cargosEncontrados = [...new Set(benchmarks.map(b => b.cargo_canonico))];
    console.log(`Total: ${benchmarks.length} registros`);
    console.log('Cargos encontrados:', cargosEncontrados.slice(0, 10));
    
    const haysFinal = benchmarks.filter(b => b.source === 'hays');
    const mpFinal = benchmarks.filter(b => b.source === 'michael_page');
    console.log(`Distribuição final - Hays: ${haysFinal.length}, Michael Page: ${mpFinal.length}`);
    
    if (mpFinal.length > 0) {
      console.log('Cargos Michael Page:', [...new Set(mpFinal.map(b => b.cargo_canonico))]);
    }

    // Formatar registros para o prompt
    const registrosOrdenados = (benchmarks || []).map((b: any) => ({
      guia: b.source === 'hays' ? 'Hays 2026' : 'Michael Page 2026',
      pagina: b.page_number,
      cargo_original: b.cargo_original,
      cargo_canonico: b.cargo_canonico,
      setor: b.setor,
      senioridade: b.senioridade,
      porte_empresa: b.porte_empresa,
      fixo_min: b.fixo_min,
      fixo_max: b.fixo_max,
      trecho_origem: b.trecho_origem,
      ano: b.year || 2026
    }));

    const userPrompt = `Usuário requisitou:

cargo: ${cargo}

senioridade: ${senioridade || 'Não especificado'}

localidade: ${localidade || 'Brasil'}

Registros recuperados (ordenados por relevância). Cada registro é um objeto com campos como guia, pagina, cargo_original, cargo_canonico, peq_fixo_min, peq_fixo_max, grande_fixo_min, grande_fixo_max, fixo_min, fixo_max, trecho_origem, ano (quando disponível).

${JSON.stringify(registrosOrdenados, null, 2)}


TAREFA:

Agrupe e normalize os registros para o cargo pedido (use cargo_canonico e fuzzy match se necessário).

Para cada fonte (Hays e Michael Page) produza:

valor mínimo (R$/mês),

valor médio (R$/mês) — calcule como (min+max)/2 quando disponível,

valor máximo (R$/mês).
Se a fonte listar faixas por porte da empresa (peq_med e grande), forneça os números para cada porte. Se somente um porte estiver disponível, informe e deixe o outro nulo.

Produza um bloco consultivo com até 4 itens (strings curtas) sobre o cargo, baseado nos trechos consultados: oferta x procura (ex.: "alta demanda", "baixa oferta"), responsabilidades-chave do cargo (resumo), e recomendação se o título parece correto para o cliente (ex.: "sugestão: usar 'Gerente de Produto Sênior' em vez de 'Head de Produto'").

Liste as fontes consultadas (nome do guia + ano = 2026) e inclua o trecho_consultado que justificou cada faixa.

Retorne o JSON estrito neste formato:

{
  "consulta": {
    "cargo_pedido": "<texto>",
    "senioridade": "<texto>",
    "localidade": "<texto>"
  },
  "resultado": {
    "hays": {
      "encontrado": true,
      "setor_encontrado": "<texto|null>",
      "por_porte": {
        "peq_med": { "min": "R$ <valor>", "media": "R$ <valor>", "max": "R$ <valor>" },
        "grande": { "min": "R$ <valor>|null", "media": "R$ <valor>|null", "max": "R$ <valor>|null" }
      },
      "trecho_consultado": "<texto do PDF que justificou>",
      "observacao": "<se houver, ex: valores anuais convertidos>",
      "fonte": "Hays 2026"
    },
    "michael_page": {
      "encontrado": true,
      "setor_encontrado": "<texto|null>",
      "por_porte": {
        "peq_med": { "min": "R$ <valor>", "media": "R$ <valor>", "max": "R$ <valor>" },
        "grande": { "min": "R$ <valor>|null", "media": "R$ <valor>|null", "max": "R$ <valor>|null" }
      },
      "trecho_consultado": "<texto do PDF que justificou>",
      "observacao": "<se houver>",
      "fonte": "Michael Page 2026"
    }
  },
  "consultoria": [
    "Insight curto 1 — oferta/ procura / recomendação",
    "Insight curto 2 — responsabilidades / ajuste de título",
    "Insight curto 3 — observação sobre faixa (ex.: variável total alta)",
    "Insight curto 4 — sugestão para negociação ou ajuste"
  ]
}


Regras adicionais (muito importantes):

Sempre indicar a unidade final (R$/mês). Se os dados originais foram anuais, inclua "observacao": "valores convertidos de anual para mensal (dividido por 12)".

Se cargo_encontrado for falso em alguma fonte, informe "encontrado": false e coloque por_porte com null nos valores.

Sempre trazer o trecho_consultado literal (até 300 caracteres) para auditoria.

Se houver valores fixo/variável/total na fonte, priorize fixo para comparativo e explique no observacao que a fonte traz componentes variáveis.

Responda apenas com o JSON (sem texto adicional).`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
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

    if (!parsedEstudo.consulta || !parsedEstudo.resultado) {
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
