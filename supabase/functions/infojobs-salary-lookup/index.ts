import { corsHeaders } from '../_shared/cors.ts';

interface InfoJobsSalaryData {
  encontrado: boolean;
  cargo: string;
  salario_medio: string | null;
  faixa: {
    min: string | null;
    max: string | null;
  };
  registros_base: number | null;
  localidade: string;
  fonte: string;
  url: string;
  erro?: string;
  via_google?: boolean;
}

interface AIExtractedSalary {
  encontrado: boolean;
  salario_medio?: number;
  salario_min?: number;
  salario_max?: number;
  registros_base?: number;
  confianca?: 'alta' | 'media' | 'baixa';
}

function cargoToSlug(cargo: string): string {
  return cargo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function extractSalaryFromMarkdown(markdown: string): {
  salarioMedio: number | null;
  salarioMin: number | null;
  salarioMax: number | null;
  totalRegistros: number | null;
} {
  let salarioMedio: number | null = null;
  let salarioMin: number | null = null;
  let salarioMax: number | null = null;
  let totalRegistros: number | null = null;

  const currencyPattern = /R\$\s*([0-9.,]+)/gi;

  // Tentar extrair salário médio
  const medioMatch = markdown.match(/(?:sal[aá]rio\s+m[eé]dio|m[eé]dia\s+salarial)[^\d]*R\$\s*([0-9.,]+)/i);
  if (medioMatch) {
    salarioMedio = parseFloat(medioMatch[1].replace(/\./g, '').replace(',', '.'));
  }

  // Tentar extrair faixa (mínimo e máximo)
  const minMatch = markdown.match(/(?:m[ií]nimo|menor)[^\d]*R\$\s*([0-9.,]+)/i);
  if (minMatch) {
    salarioMin = parseFloat(minMatch[1].replace(/\./g, '').replace(',', '.'));
  }

  const maxMatch = markdown.match(/(?:m[aá]ximo|maior)[^\d]*R\$\s*([0-9.,]+)/i);
  if (maxMatch) {
    salarioMax = parseFloat(maxMatch[1].replace(/\./g, '').replace(',', '.'));
  }

  // Tentar extrair de padrão "de R$ X a R$ Y" ou "R$ X - R$ Y"
  const rangeMatch = markdown.match(/(?:de\s+)?R\$\s*([0-9.,]+)\s*(?:a|até|-)\s*R\$\s*([0-9.,]+)/i);
  if (rangeMatch) {
    const val1 = parseFloat(rangeMatch[1].replace(/\./g, '').replace(',', '.'));
    const val2 = parseFloat(rangeMatch[2].replace(/\./g, '').replace(',', '.'));
    if (!salarioMin) salarioMin = Math.min(val1, val2);
    if (!salarioMax) salarioMax = Math.max(val1, val2);
  }

  // Tentar extrair número de registros/salários
  const registrosMatch = markdown.match(/(?:baseado\s+em|com\s+base\s+em|total\s+de)?\s*([0-9.,]+)\s*(?:sal[aá]rios?|registros?|profissionais?)/i);
  if (registrosMatch) {
    totalRegistros = parseInt(registrosMatch[1].replace(/\./g, '').replace(',', ''));
  }

  // Fallback: se não encontrou médio mas tem min/max, calcular
  if (!salarioMedio && salarioMin && salarioMax) {
    salarioMedio = Math.round((salarioMin + salarioMax) / 2);
  }

  // Fallback: extrair primeiro valor monetário grande como médio
  if (!salarioMedio) {
    const allCurrencies = [...markdown.matchAll(currencyPattern)];
    for (const match of allCurrencies) {
      const value = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      if (value >= 1000 && value <= 100000) {
        salarioMedio = value;
        break;
      }
    }
  }

  return { salarioMedio, salarioMin, salarioMax, totalRegistros };
}

async function scrapeWithFirecrawl(url: string): Promise<{ success: boolean; content: string; error?: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
  if (!apiKey) {
    return { success: false, content: '', error: 'FIRECRAWL_API_KEY não configurada' };
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, content: '', error: data.error || `Status ${response.status}` };
    }

    const markdown = data.data?.markdown || data.markdown || '';
    return { success: true, content: markdown };
  } catch (error) {
    return { success: false, content: '', error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

async function searchGoogleWithFirecrawl(query: string): Promise<{ success: boolean; data: any[]; error?: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
  if (!apiKey) {
    return { success: false, data: [], error: 'FIRECRAWL_API_KEY não configurada' };
  }

  try {
    console.log(`Buscando Google via Firecrawl: ${query}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 5,
        lang: 'pt',
        country: 'BR',
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();
    console.log(`Resultado busca Google:`, JSON.stringify(data).substring(0, 500));

    if (!response.ok || !data.success) {
      return { success: false, data: [], error: data.error || `Status ${response.status}` };
    }

    return { success: true, data: data.data || [] };
  } catch (error) {
    console.error('Erro na busca Google:', error);
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

async function extractSalaryWithAI(snippets: string, cargo: string): Promise<AIExtractedSalary> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY não configurada');
    return { encontrado: false };
  }

  try {
    console.log('Extraindo dados salariais com Lovable AI...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em extrair dados salariais de textos. 
Analise os resultados de busca e extraia informações sobre salários para o cargo especificado.
Retorne APENAS dados que você encontrar explicitamente no texto. NÃO invente valores.
Se não encontrar dados salariais claros, retorne encontrado=false.`
          },
          {
            role: 'user',
            content: `Extraia dados salariais para o cargo "${cargo}" dos seguintes resultados de busca do InfoJobs:

${snippets}

Se encontrar valores salariais, extraia o salário médio, mínimo e máximo mensal em reais (números inteiros).`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_salary',
            description: 'Extrai dados salariais estruturados dos resultados de busca',
            parameters: {
              type: 'object',
              properties: {
                encontrado: { 
                  type: 'boolean', 
                  description: 'true se encontrou dados salariais relevantes, false caso contrário' 
                },
                salario_medio: { 
                  type: 'number', 
                  description: 'Salário médio mensal em reais (número inteiro)' 
                },
                salario_min: { 
                  type: 'number', 
                  description: 'Salário mínimo da faixa em reais (número inteiro)' 
                },
                salario_max: { 
                  type: 'number', 
                  description: 'Salário máximo da faixa em reais (número inteiro)' 
                },
                registros_base: { 
                  type: 'number', 
                  description: 'Número de salários/registros que baseiam a informação' 
                },
                confianca: { 
                  type: 'string', 
                  enum: ['alta', 'media', 'baixa'],
                  description: 'Nível de confiança nos dados extraídos'
                }
              },
              required: ['encontrado'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_salary' } }
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable AI:', response.status, errorText);
      return { encontrado: false };
    }

    const data = await response.json();
    console.log('Resposta Lovable AI:', JSON.stringify(data).substring(0, 500));
    
    // Extrair o resultado da tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return {
        encontrado: args.encontrado || false,
        salario_medio: args.salario_medio,
        salario_min: args.salario_min,
        salario_max: args.salario_max,
        registros_base: args.registros_base,
        confianca: args.confianca,
      };
    }

    return { encontrado: false };
  } catch (error) {
    console.error('Erro ao extrair com IA:', error);
    return { encontrado: false };
  }
}

async function fallbackGoogleSearch(cargo: string, localidade: string): Promise<InfoJobsSalaryData | null> {
  try {
    // Buscar no Google via Firecrawl
    const query = `salário ${cargo} site:infojobs.com.br`;
    const searchResult = await searchGoogleWithFirecrawl(query);

    if (!searchResult.success || searchResult.data.length === 0) {
      console.log('Busca Google não retornou resultados');
      return null;
    }

    // Combinar snippets dos resultados
    const snippets = searchResult.data
      .map((r: any) => `Título: ${r.title || ''}\nDescrição: ${r.description || ''}\nConteúdo: ${r.markdown?.substring(0, 500) || ''}`)
      .join('\n\n---\n\n');

    console.log(`Snippets combinados (${snippets.length} chars)`);

    // Extrair dados com Lovable AI
    const aiResult = await extractSalaryWithAI(snippets, cargo);

    if (aiResult.encontrado && (aiResult.salario_medio || aiResult.salario_min)) {
      const url = searchResult.data[0]?.url || `https://www.infojobs.com.br/salario/${cargoToSlug(cargo)}`;
      
      return {
        encontrado: true,
        cargo,
        salario_medio: aiResult.salario_medio ? formatCurrency(aiResult.salario_medio) : null,
        faixa: {
          min: aiResult.salario_min ? formatCurrency(aiResult.salario_min) : null,
          max: aiResult.salario_max ? formatCurrency(aiResult.salario_max) : null,
        },
        registros_base: aiResult.registros_base || null,
        localidade: localidade || 'Brasil',
        fonte: 'InfoJobs Brasil (via Google)',
        url,
        via_google: true,
      };
    }

    console.log('IA não encontrou dados salariais nos resultados do Google');
    return null;
  } catch (error) {
    console.error('Fallback Google falhou:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { cargo, localidade } = body;

    if (!cargo) {
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Cargo é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const slug = cargoToSlug(cargo);
    const infojobsUrl = `https://www.infojobs.com.br/salario/${slug}`;

    console.log(`Buscando InfoJobs para: ${cargo} (slug: ${slug})`);
    console.log(`URL: ${infojobsUrl}`);

    // Usar Firecrawl para scraping direto
    const scrapeResult = await scrapeWithFirecrawl(infojobsUrl);

    // Se scraping direto falhou, tentar fallback via Google
    if (!scrapeResult.success) {
      console.warn(`Firecrawl scraping direto falhou: ${scrapeResult.error}`);
      console.log('Tentando fallback via Google Search + IA...');
      
      const googleResult = await fallbackGoogleSearch(cargo, localidade);
      if (googleResult) {
        console.log('Fallback Google bem-sucedido!');
        return new Response(
          JSON.stringify(googleResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Se Google também falhou
      const result: InfoJobsSalaryData = {
        encontrado: false,
        cargo,
        salario_medio: null,
        faixa: { min: null, max: null },
        registros_base: null,
        localidade: localidade || 'Brasil',
        fonte: 'InfoJobs Brasil',
        url: infojobsUrl,
        erro: scrapeResult.error || 'Falha ao acessar página'
      };

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeResult.content;
    console.log(`Markdown recebido: ${markdown.length} caracteres`);

    // Verificar se InfoJobs retornou erro 500 ou página de erro
    if (markdown.includes('500 Internal Server Error') || 
        markdown.includes('Erro interno') ||
        markdown.includes('temporarily unavailable')) {
      console.log('InfoJobs retornou erro interno 500, tentando fallback via Google...');
      
      const googleResult = await fallbackGoogleSearch(cargo, localidade);
      if (googleResult) {
        console.log('Fallback Google bem-sucedido após erro 500!');
        return new Response(
          JSON.stringify(googleResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result: InfoJobsSalaryData = {
        encontrado: false,
        cargo,
        salario_medio: null,
        faixa: { min: null, max: null },
        registros_base: null,
        localidade: localidade || 'Brasil',
        fonte: 'InfoJobs Brasil',
        url: infojobsUrl,
        erro: 'Serviço InfoJobs temporariamente indisponível'
      };

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a página existe (não é 404 ou erro)
    if (markdown.includes('não encontrada') || markdown.includes('404') || markdown.length < 200) {
      console.log('Página InfoJobs não encontrada, tentando fallback via Google...');
      
      const googleResult = await fallbackGoogleSearch(cargo, localidade);
      if (googleResult) {
        console.log('Fallback Google bem-sucedido após 404!');
        return new Response(
          JSON.stringify(googleResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result: InfoJobsSalaryData = {
        encontrado: false,
        cargo,
        salario_medio: null,
        faixa: { min: null, max: null },
        registros_base: null,
        localidade: localidade || 'Brasil',
        fonte: 'InfoJobs Brasil',
        url: infojobsUrl,
        erro: 'Cargo não encontrado na base do InfoJobs'
      };

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados salariais do markdown
    const { salarioMedio, salarioMin, salarioMax, totalRegistros } = extractSalaryFromMarkdown(markdown);

    const encontrado = salarioMedio !== null || (salarioMin !== null && salarioMax !== null);

    // Se não encontrou dados no scraping direto, tentar fallback
    if (!encontrado) {
      console.log('Scraping não extraiu dados, tentando fallback via Google...');
      
      const googleResult = await fallbackGoogleSearch(cargo, localidade);
      if (googleResult) {
        console.log('Fallback Google bem-sucedido após scraping sem dados!');
        return new Response(
          JSON.stringify(googleResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const result: InfoJobsSalaryData = {
      encontrado,
      cargo,
      salario_medio: salarioMedio ? formatCurrency(salarioMedio) : null,
      faixa: {
        min: salarioMin ? formatCurrency(salarioMin) : null,
        max: salarioMax ? formatCurrency(salarioMax) : null
      },
      registros_base: totalRegistros,
      localidade: localidade || 'Brasil',
      fonte: 'InfoJobs Brasil',
      url: infojobsUrl
    };

    if (!encontrado) {
      result.erro = 'Não foi possível extrair dados salariais da página';
    }

    console.log('Resultado InfoJobs:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao buscar dados do InfoJobs:', error);
    
    return new Response(
      JSON.stringify({
        encontrado: false,
        cargo: '',
        salario_medio: null,
        faixa: { min: null, max: null },
        registros_base: null,
        localidade: 'Brasil',
        fonte: 'InfoJobs Brasil',
        url: '',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
