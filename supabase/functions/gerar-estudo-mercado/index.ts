import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Você é um assistente especialista em remuneração que analisa dados salariais de Hays 2026, Michael Page 2026 e InfoJobs (dados de mercado em tempo real).

VOCÊ RECEBERÁ DADOS PRÉ-AGREGADOS pelo servidor - não precisa fazer cálculos matemáticos, apenas formatar e validar.

Sua tarefa é:
1. Formatar os valores monetários corretamente (R$ X.XXX,XX / mês)
2. Validar a estrutura dos dados
3. Gerar 4 insights consultivos curtos e úteis, considerando todas as fontes disponíveis
4. InfoJobs é especialmente útil para cargos operacionais e dados em tempo real

Responda APENAS com JSON válido no formato especificado.`;

interface InfoJobsData {
  encontrado: boolean;
  cargo: string;
  salario_medio: string | null;
  faixa: { min: string | null; max: string | null };
  registros_base: number | null;
  localidade: string;
  fonte: string;
  url: string;
  erro?: string;
}

interface AggregatedBenchmark {
  source: string;
  setor: string;
  porte_empresa: string | null;
  min_salary: number;
  max_salary: number;
  avg_salary: number;
  record_count: number;
  sample_trecho: string | null;
}

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

    // ============================================
    // FASE 4: Verificar cache primeiro
    // ============================================
    const { data: cacheKeyData } = await supabaseClient
      .rpc('generate_salary_study_cache_key', {
        p_cargo: cargo,
        p_senioridade: senioridade || null,
        p_localidade: localidade || null
      });

    const cacheKey = cacheKeyData;
    console.log('Cache key:', cacheKey);

    // Verificar se existe cache válido
    const { data: cachedResult } = await supabaseClient
      .from('salary_study_cache')
      .select('resultado')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedResult?.resultado) {
      console.log('Cache hit! Retornando resultado em cache.');
      return new Response(
        JSON.stringify(cachedResult.resultado),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
      );
    }

    console.log('Cache miss. Buscando dados agregados...');

    // ============================================
    // FASE 2: Usar função de agregação SQL otimizada
    // ============================================
    const { data: aggregatedData, error: aggError } = await supabaseClient
      .rpc('get_salary_benchmarks_aggregated', {
        p_cargo: cargo,
        p_senioridade: senioridade || null,
        p_limit: 100
      });

    if (aggError) {
      console.error('Erro na agregação:', aggError);
      throw new Error('Erro ao buscar dados salariais');
    }

    const benchmarks: AggregatedBenchmark[] = aggregatedData || [];
    console.log(`Dados agregados: ${benchmarks.length} grupos`);

    if (benchmarks.length === 0) {
      // Fallback: busca simples sem FTS
      console.log('Nenhum resultado via FTS, tentando busca ILIKE...');
      const cargoNormalized = cargo.toLowerCase()
        .replace(/[áàãâä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòõôö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .trim();

      const { data: fallbackData } = await supabaseClient
        .from('salary_benchmarks')
        .select('source, setor, porte_empresa, fixo_min, fixo_max, trecho_origem')
        .or(`cargo_canonico.ilike.%${cargoNormalized}%,cargo_original.ilike.%${cargoNormalized}%`)
        .limit(50);

      if (fallbackData && fallbackData.length > 0) {
        // Agregar manualmente
        const grouped = new Map<string, AggregatedBenchmark>();
        
        for (const row of fallbackData) {
          const key = `${row.source}|${row.setor || 'Geral'}|${row.porte_empresa || 'geral'}`;
          const existing = grouped.get(key);
          
          if (existing) {
            existing.min_salary = Math.min(existing.min_salary, row.fixo_min || 0);
            existing.max_salary = Math.max(existing.max_salary, row.fixo_max || 0);
            existing.avg_salary = (existing.avg_salary * existing.record_count + ((row.fixo_min || 0) + (row.fixo_max || 0)) / 2) / (existing.record_count + 1);
            existing.record_count++;
          } else {
            grouped.set(key, {
              source: row.source,
              setor: row.setor || 'Geral',
              porte_empresa: row.porte_empresa,
              min_salary: row.fixo_min || 0,
              max_salary: row.fixo_max || 0,
              avg_salary: ((row.fixo_min || 0) + (row.fixo_max || 0)) / 2,
              record_count: 1,
              sample_trecho: row.trecho_origem
            });
          }
        }
        
        benchmarks.push(...grouped.values());
      }
    }

    // ============================================
    // NOVA FASE: Buscar dados do InfoJobs em paralelo
    // ============================================
    console.log('Buscando dados do InfoJobs em paralelo...');
    
    let infojobsData: InfoJobsData | null = null;
    try {
      const infojobsResponse = await fetch(`${supabaseUrl}/functions/v1/infojobs-salary-lookup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cargo, localidade })
      });

      if (infojobsResponse.ok) {
        infojobsData = await infojobsResponse.json();
        console.log('InfoJobs data:', JSON.stringify(infojobsData));
      } else {
        console.warn('InfoJobs lookup failed:', infojobsResponse.status);
      }
    } catch (ijError) {
      console.warn('Erro ao buscar InfoJobs (não crítico):', ijError);
    }

    // ============================================
    // FASE 2: Pré-processar dados no servidor
    // ============================================
    const formatCurrency = (value: number): string => {
      if (!value || value === 0) return 'R$ 0';
      return `R$ ${Math.round(value).toLocaleString('pt-BR')}`;
    };

    // Organizar dados por fonte e setor
    const haysBenchmarks = benchmarks.filter(b => b.source === 'hays');
    const mpBenchmarks = benchmarks.filter(b => b.source === 'michael_page');

    console.log(`Hays: ${haysBenchmarks.length} grupos, MP: ${mpBenchmarks.length} grupos`);

    // Construir estrutura pré-formatada para IA
    const preProcessedData = {
      hays: organizeBySetor(haysBenchmarks, formatCurrency),
      michael_page: organizeBySetor(mpBenchmarks, formatCurrency),
      infojobs: infojobsData
    };

    // ============================================
    // FASE 3: Prompt otimizado com 3 fontes
    // ============================================
    const infojobsSection = infojobsData?.encontrado 
      ? `InfoJobs (tempo real): Salário médio ${infojobsData.salario_medio}, faixa ${infojobsData.faixa.min} - ${infojobsData.faixa.max}, baseado em ${infojobsData.registros_base || 'N/A'} registros.`
      : 'InfoJobs: Dados não disponíveis para este cargo.';

    const userPrompt = `Cargo: ${cargo}
Senioridade: ${senioridade || 'Não especificado'}
Localidade: ${localidade || 'Brasil'}

DADOS PRÉ-AGREGADOS (já calculados pelo servidor):

HAYS e MICHAEL PAGE:
${JSON.stringify({ hays: preProcessedData.hays, michael_page: preProcessedData.michael_page }, null, 2)}

INFOJOBS (dados de mercado em tempo real):
${infojobsSection}

TAREFA:
1. Valide e formate os dados acima no schema JSON especificado
2. Gere 4 insights consultivos curtos sobre o cargo (oferta/demanda, responsabilidades, faixa, negociação)
3. Se InfoJobs tiver dados, use-os para complementar a análise (especialmente útil para cargos operacionais)

RESPONDA APENAS com este JSON:
{
  "consulta": {
    "cargo_pedido": "${cargo}",
    "senioridade": "${senioridade || 'Não especificado'}",
    "localidade": "${localidade || 'Brasil'}"
  },
  "resultado": {
    "hays": {
      "encontrado": ${haysBenchmarks.length > 0},
      "setores": ${JSON.stringify(preProcessedData.hays.map(s => ({
        setor: s.setor,
        por_porte: s.por_porte,
        registros_base: s.registros_base,
        trecho_consultado: s.trecho ? s.trecho.substring(0, 200) : null
      })))},
      "observacao": "${haysBenchmarks.length > 0 ? 'Valores mensais em R$' : 'Cargo não encontrado na base Hays'}",
      "fonte": "Hays 2026"
    },
    "michael_page": {
      "encontrado": ${mpBenchmarks.length > 0},
      "setores": ${JSON.stringify(preProcessedData.michael_page.map(s => ({
        setor: s.setor,
        por_porte: s.por_porte,
        registros_base: s.registros_base,
        trecho_consultado: s.trecho ? s.trecho.substring(0, 200) : null
      })))},
      "observacao": "${mpBenchmarks.length > 0 ? 'Valores mensais em R$' : 'Cargo não encontrado na base Michael Page'}",
      "fonte": "Michael Page 2026"
    },
    "infojobs": ${JSON.stringify(infojobsData ? {
      encontrado: infojobsData.encontrado,
      salario_medio: infojobsData.salario_medio,
      faixa: infojobsData.faixa,
      registros_base: infojobsData.registros_base,
      fonte: infojobsData.fonte,
      url: infojobsData.url
    } : {
      encontrado: false,
      salario_medio: null,
      faixa: { min: null, max: null },
      registros_base: null,
      fonte: "InfoJobs Brasil",
      url: null
    })}
  },
  "consultoria": [
    "<insight 1 sobre oferta/demanda>",
    "<insight 2 sobre responsabilidades típicas>",
    "<insight 3 sobre posicionamento da faixa>",
    "<insight 4 sobre negociação>"
  ]
}`;

    console.log('Chamando Lovable AI Gateway (prompt otimizado)...');
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
        temperature: 0.2,
        max_tokens: 2000 // Reduzido de 4000 para 2000
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

    // ============================================
    // FASE 4: Salvar resultado em cache
    // ============================================
    console.log('Salvando resultado em cache...');
    await supabaseClient
      .from('salary_study_cache')
      .upsert({
        cache_key: cacheKey,
        cargo: cargo,
        senioridade: senioridade || null,
        localidade: localidade || null,
        resultado: parsedEstudo,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      }, {
        onConflict: 'cache_key'
      });

    console.log('Estudo gerado com sucesso');
    return new Response(
      JSON.stringify(parsedEstudo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
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

// Helper: organizar benchmarks por setor
interface SetorOrganizado {
  setor: string;
  por_porte: {
    peq_med: { min: string; media: string; max: string } | null;
    grande: { min: string; media: string; max: string } | null;
  };
  registros_base: number;
  trecho: string | null;
}

function organizeBySetor(
  benchmarks: AggregatedBenchmark[], 
  formatCurrency: (v: number) => string
): SetorOrganizado[] {
  const setorMap = new Map<string, SetorOrganizado>();

  for (const b of benchmarks) {
    const setor = b.setor || 'Geral';
    
    if (!setorMap.has(setor)) {
      setorMap.set(setor, {
        setor,
        por_porte: { peq_med: null, grande: null },
        registros_base: 0,
        trecho: null
      });
    }

    const setorData = setorMap.get(setor)!;
    setorData.registros_base += b.record_count;
    
    if (!setorData.trecho && b.sample_trecho) {
      setorData.trecho = b.sample_trecho;
    }

    const faixa = {
      min: formatCurrency(b.min_salary),
      media: formatCurrency(b.avg_salary),
      max: formatCurrency(b.max_salary)
    };

    // Mapear porte_empresa para peq_med ou grande
    const porte = b.porte_empresa?.toLowerCase() || '';
    if (porte.includes('grande')) {
      setorData.por_porte.grande = faixa;
    } else {
      // pequeno, medio, pequeno_medio, null -> peq_med
      if (!setorData.por_porte.peq_med) {
        setorData.por_porte.peq_med = faixa;
      } else {
        // Combinar faixas se já existe
        const existing = setorData.por_porte.peq_med;
        const existingMin = parseFloat(existing.min.replace(/[^\d]/g, '')) || 0;
        const existingMax = parseFloat(existing.max.replace(/[^\d]/g, '')) || 0;
        
        setorData.por_porte.peq_med = {
          min: formatCurrency(Math.min(existingMin, b.min_salary)),
          media: formatCurrency((existingMin + existingMax + b.min_salary + b.max_salary) / 4),
          max: formatCurrency(Math.max(existingMax, b.max_salary))
        };
      }
    }
  }

  return Array.from(setorMap.values());
}
