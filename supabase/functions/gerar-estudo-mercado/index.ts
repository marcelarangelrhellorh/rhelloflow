import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Você é um assistente especialista em remuneração que analisa dados salariais de Hays 2026, Michael Page 2026, InfoJobs e Glassdoor (dados de mercado em tempo real).

VOCÊ RECEBERÁ DADOS PRÉ-AGREGADOS pelo servidor - não precisa fazer cálculos matemáticos, apenas formatar e validar.

Sua tarefa é:
1. Formatar os valores monetários corretamente (R$ X.XXX,XX / mês)
2. Validar a estrutura dos dados
3. Gerar 4 insights consultivos curtos e úteis, considerando TODAS as fontes disponíveis
4. InfoJobs e Glassdoor são especialmente úteis para dados em tempo real
5. Glassdoor traz informações únicas de remuneração variável (bônus)

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

interface GlassdoorData {
  encontrado: boolean;
  cargo: string;
  salario_medio: string | null;
  faixa: { min: string | null; max: string | null };
  remuneracao_variavel: {
    media: string | null;
    min: string | null;
    max: string | null;
  } | null;
  registros_base: number | null;
  ultima_atualizacao: string | null;
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Capturar headers de autenticação originais para repassar às subfunções
    const authHeader = req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey') || supabaseAnonKey;

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
    const { cargo, senioridade, localidade, forceRefresh } = body;

    if (!cargo) {
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Cargo é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Buscando benchmarks para:', { cargo, senioridade, localidade, forceRefresh });

    // ============================================
    // NOVA FASE: Buscar termos expandidos (sinônimos)
    // ============================================
    let termosExpandidos: string[] = [cargo];
    try {
      const { data: expandedTerms } = await supabaseClient
        .rpc('get_expanded_search_terms', { p_cargo: cargo });
      
      if (expandedTerms && expandedTerms.length > 0) {
        termosExpandidos = expandedTerms;
        console.log('Termos expandidos:', termosExpandidos);
      }
    } catch (e) {
      console.warn('Erro ao buscar termos expandidos:', e);
    }

    // ============================================
    // FASE 4: Verificar cache primeiro (skip se forceRefresh)
    // ============================================
    const { data: cacheKeyData } = await supabaseClient
      .rpc('generate_salary_study_cache_key', {
        p_cargo: cargo,
        p_senioridade: senioridade || null,
        p_localidade: localidade || null
      });

    const cacheKey = cacheKeyData;
    console.log('Cache key:', cacheKey);

    // Verificar se existe cache válido (skip se forceRefresh = true)
    if (!forceRefresh) {
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
    } else {
      console.log('Force refresh solicitado, ignorando cache.');
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
    // NOVA FASE: Buscar dados do InfoJobs E Glassdoor em paralelo
    // ============================================
    console.log('Buscando dados do InfoJobs e Glassdoor em paralelo...');
    
    let infojobsData: InfoJobsData | null = null;
    let glassdoorData: GlassdoorData | null = null;

    // Executar ambas as requisições em paralelo
    // Headers para chamadas internas - usar JWT do usuário original
    const internalHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (authHeader) {
      internalHeaders['Authorization'] = authHeader;
    }
    if (apikeyHeader) {
      internalHeaders['apikey'] = apikeyHeader;
    }

    const [infojobsResult, glassdoorResult] = await Promise.allSettled([
      // InfoJobs
      fetch(`${supabaseUrl}/functions/v1/infojobs-salary-lookup`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ cargo, localidade })
      }).then(async (res) => {
        if (res.ok) return res.json();
        const errText = await res.text().catch(() => '');
        throw new Error(`InfoJobs: ${res.status} ${res.statusText} ${errText}`);
      }),
      // Glassdoor
      fetch(`${supabaseUrl}/functions/v1/glassdoor-salary-lookup`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ cargo, localidade })
      }).then(async (res) => {
        if (res.ok) return res.json();
        const errText = await res.text().catch(() => '');
        throw new Error(`Glassdoor: ${res.status} ${res.statusText} ${errText}`);
      })
    ]);

    if (infojobsResult.status === 'fulfilled') {
      infojobsData = infojobsResult.value;
      console.log('InfoJobs data:', JSON.stringify(infojobsData));
    } else {
      console.warn('InfoJobs lookup failed:', infojobsResult.reason);
      // Criar objeto de erro para exibir na UI
      infojobsData = {
        encontrado: false,
        cargo,
        salario_medio: null,
        faixa: { min: null, max: null },
        registros_base: null,
        localidade: localidade || 'Brasil',
        fonte: 'InfoJobs Brasil',
        url: `https://www.infojobs.com.br/salario/${cargo.toLowerCase().replace(/\s+/g, '-')}`,
        erro: String(infojobsResult.reason)
      };
    }

    if (glassdoorResult.status === 'fulfilled') {
      glassdoorData = glassdoorResult.value;
      console.log('Glassdoor data:', JSON.stringify(glassdoorData));
    } else {
      console.warn('Glassdoor lookup failed:', glassdoorResult.reason);
      // Criar objeto de erro para exibir na UI
      glassdoorData = {
        encontrado: false,
        cargo,
        salario_medio: null,
        faixa: { min: null, max: null },
        remuneracao_variavel: null,
        registros_base: null,
        ultima_atualizacao: null,
        fonte: 'Glassdoor Brasil',
        url: `https://www.glassdoor.com.br/Sal%C3%A1rios/${encodeURIComponent(cargo)}-sal%C3%A1rio-SRCH_KO0,${cargo.length}.htm`,
        erro: String(glassdoorResult.reason)
      };
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
      infojobs: infojobsData,
      glassdoor: glassdoorData
    };

    // ============================================
    // FASE 3: Prompt otimizado com 4 fontes
    // ============================================
    const infojobsSection = infojobsData?.encontrado 
      ? `InfoJobs (tempo real): Salário médio ${infojobsData.salario_medio}, faixa ${infojobsData.faixa.min} - ${infojobsData.faixa.max}, baseado em ${infojobsData.registros_base || 'N/A'} registros.`
      : 'InfoJobs: Dados não disponíveis para este cargo.';

    const glassdoorSection = glassdoorData?.encontrado
      ? `Glassdoor (tempo real): Salário médio ${glassdoorData.salario_medio}, faixa ${glassdoorData.faixa.min} - ${glassdoorData.faixa.max}${glassdoorData.remuneracao_variavel?.media ? `, remuneração variável ${glassdoorData.remuneracao_variavel.media}` : ''}, baseado em ${glassdoorData.registros_base || 'N/A'} salários.`
      : 'Glassdoor: Dados não disponíveis para este cargo.';

    const userPrompt = `Cargo: ${cargo}
Senioridade: ${senioridade || 'Não especificado'}
Localidade: ${localidade || 'Brasil'}

DADOS PRÉ-AGREGADOS:
Hays: ${haysBenchmarks.length} registros
Michael Page: ${mpBenchmarks.length} registros
${infojobsSection}
${glassdoorSection}

Gere 4 insights consultivos curtos sobre este cargo, considerando todas as fontes disponíveis.`;

    console.log('Chamando Lovable AI Gateway com tool calling...');
    
    // Usar tool calling para garantir JSON estruturado
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'gerar_estudo_mercado',
              description: 'Gera o estudo de mercado com insights consultivos',
              parameters: {
                type: 'object',
                properties: {
                  consultoria: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '4 insights consultivos curtos sobre oferta/demanda, responsabilidades, posicionamento e negociação'
                  }
                },
                required: ['consultoria'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'gerar_estudo_mercado' } }
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
    console.log('Resposta da IA recebida');

    // Extrair insights do tool call
    let consultoriaInsights: string[] = [];
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        consultoriaInsights = args.consultoria || [];
      } catch (e) {
        console.warn('Erro ao parsear tool call arguments:', e);
      }
    }
    
    // Fallback se tool calling não retornar insights
    if (consultoriaInsights.length === 0) {
      consultoriaInsights = [
        `O cargo de ${cargo} apresenta demanda ${haysBenchmarks.length > 0 || mpBenchmarks.length > 0 ? 'ativa' : 'variável'} no mercado.`,
        'Responsabilidades típicas incluem gestão de processos e entregas técnicas.',
        'A faixa salarial varia conforme porte da empresa e setor de atuação.',
        'Negociação deve considerar benefícios além do salário fixo.'
      ];
    }

    // Construir resposta estruturada no servidor (não depende da IA para estrutura)
    const parsedEstudo = {
      consulta: {
        cargo_pedido: cargo,
        senioridade: senioridade || 'Não especificado',
        localidade: localidade || 'Brasil'
      },
      resultado: {
        hays: {
          encontrado: haysBenchmarks.length > 0,
          setores: preProcessedData.hays.map(s => ({
            setor: s.setor,
            por_porte: s.por_porte,
            registros_base: s.registros_base,
            trecho_consultado: s.trecho ? s.trecho.substring(0, 200) : null
          })),
          observacao: haysBenchmarks.length > 0 ? 'Valores mensais em R$' : 'Cargo não encontrado na base Hays',
          fonte: 'Hays 2026'
        },
        michael_page: {
          encontrado: mpBenchmarks.length > 0,
          setores: preProcessedData.michael_page.map(s => ({
            setor: s.setor,
            por_porte: s.por_porte,
            registros_base: s.registros_base,
            trecho_consultado: s.trecho ? s.trecho.substring(0, 200) : null
          })),
          observacao: mpBenchmarks.length > 0 ? 'Valores mensais em R$' : 'Cargo não encontrado na base Michael Page',
          fonte: 'Michael Page 2026'
        },
        infojobs: {
          encontrado: infojobsData?.encontrado || false,
          salario_medio: infojobsData?.salario_medio || null,
          faixa: infojobsData?.faixa || { min: null, max: null },
          registros_base: infojobsData?.registros_base || null,
          fonte: infojobsData?.fonte || 'InfoJobs Brasil',
          url: infojobsData?.url || null,
          erro: infojobsData?.erro || null
        },
        glassdoor: {
          encontrado: glassdoorData?.encontrado || false,
          salario_medio: glassdoorData?.salario_medio || null,
          faixa: glassdoorData?.faixa || { min: null, max: null },
          remuneracao_variavel: glassdoorData?.remuneracao_variavel || null,
          registros_base: glassdoorData?.registros_base || null,
          ultima_atualizacao: glassdoorData?.ultima_atualizacao || null,
          fonte: glassdoorData?.fonte || 'Glassdoor Brasil',
          url: glassdoorData?.url || null,
          erro: glassdoorData?.erro || null
        }
      },
      consultoria: consultoriaInsights,
      termos_expandidos: termosExpandidos.length > 1 ? termosExpandidos : undefined
    };

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
