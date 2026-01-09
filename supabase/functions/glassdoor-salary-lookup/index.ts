import { corsHeaders } from '../_shared/cors.ts';

interface GlassdoorData {
  encontrado: boolean;
  cargo: string;
  salario_medio: string | null;
  faixa: {
    min: string | null;
    max: string | null;
  };
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
  via_google?: boolean;
}

interface AIExtractedSalary {
  encontrado: boolean;
  salario_medio?: number;
  salario_min?: number;
  salario_max?: number;
  remuneracao_variavel?: number;
  registros_base?: number;
  confianca?: 'alta' | 'media' | 'baixa';
}

function formatCurrency(value: number): string {
  return `R$ ${Math.round(value).toLocaleString('pt-BR')}`;
}

async function scrapeWithFirecrawl(url: string): Promise<{ success: boolean; content: string; error?: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
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
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
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
            content: `Extraia dados salariais para o cargo "${cargo}" dos seguintes resultados de busca do Glassdoor:

${snippets}

Se encontrar valores salariais, extraia o salário médio, mínimo e máximo mensal em reais (números inteiros).
Também extraia remuneração variável/bônus se disponível.`
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
                remuneracao_variavel: { 
                  type: 'number', 
                  description: 'Remuneração variável/bônus médio em reais (número inteiro)' 
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
        remuneracao_variavel: args.remuneracao_variavel,
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

async function fallbackGoogleSearch(cargo: string): Promise<GlassdoorData | null> {
  try {
    // Buscar no Google via Firecrawl
    const query = `salário ${cargo} site:glassdoor.com.br`;
    const searchResult = await searchGoogleWithFirecrawl(query);

    if (!searchResult.success || searchResult.data.length === 0) {
      console.log('Busca Google não retornou resultados para Glassdoor');
      return null;
    }

    // Combinar snippets dos resultados
    const snippets = searchResult.data
      .map((r: any) => `Título: ${r.title || ''}\nDescrição: ${r.description || ''}\nConteúdo: ${r.markdown?.substring(0, 500) || ''}`)
      .join('\n\n---\n\n');

    console.log(`Snippets combinados para Glassdoor (${snippets.length} chars)`);

    // Extrair dados com Lovable AI
    const aiResult = await extractSalaryWithAI(snippets, cargo);

    if (aiResult.encontrado && (aiResult.salario_medio || aiResult.salario_min)) {
      const url = searchResult.data[0]?.url || `https://www.glassdoor.com.br/Salários/${cargo}-salário`;
      
      return {
        encontrado: true,
        cargo,
        salario_medio: aiResult.salario_medio ? formatCurrency(aiResult.salario_medio) : null,
        faixa: {
          min: aiResult.salario_min ? formatCurrency(aiResult.salario_min) : null,
          max: aiResult.salario_max ? formatCurrency(aiResult.salario_max) : null,
        },
        remuneracao_variavel: aiResult.remuneracao_variavel ? {
          media: formatCurrency(aiResult.remuneracao_variavel),
          min: null,
          max: null,
        } : null,
        registros_base: aiResult.registros_base || null,
        ultima_atualizacao: null,
        fonte: 'Glassdoor Brasil (via Google)',
        url,
        via_google: true,
      };
    }

    console.log('IA não encontrou dados salariais nos resultados do Google para Glassdoor');
    return null;
  } catch (error) {
    console.error('Fallback Google para Glassdoor falhou:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cargo, localidade } = await req.json();

    if (!cargo) {
      return new Response(
        JSON.stringify({ erro: true, mensagem: 'Cargo é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar cargo para URL do Glassdoor
    const cargoTrimmed = cargo.trim();
    const cargoSlug = cargoTrimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // URL do Glassdoor Brasil - usar tamanho do cargo original
    const cargoLength = cargoTrimmed.length;
    const glassdoorUrl = `https://www.glassdoor.com.br/Sal%C3%A1rios/${cargoSlug}-sal%C3%A1rio-SRCH_KO0,${cargoLength}.htm`;
    
    console.log(`Buscando Glassdoor para: ${cargo}`);
    console.log(`URL: ${glassdoorUrl}`);

    // Usar Firecrawl para scraping direto
    const scrapeResult = await scrapeWithFirecrawl(glassdoorUrl);
    
    if (!scrapeResult.success) {
      console.warn(`Firecrawl scraping direto falhou: ${scrapeResult.error}`);
      console.log('Tentando fallback via Google Search + IA para Glassdoor...');
      
      const googleResult = await fallbackGoogleSearch(cargo);
      if (googleResult) {
        console.log('Fallback Google bem-sucedido para Glassdoor!');
        return new Response(
          JSON.stringify(googleResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({
          encontrado: false,
          cargo,
          salario_medio: null,
          faixa: { min: null, max: null },
          remuneracao_variavel: null,
          registros_base: null,
          ultima_atualizacao: null,
          fonte: 'Glassdoor Brasil',
          url: glassdoorUrl,
          erro: scrapeResult.error || 'Falha ao acessar página'
        } as GlassdoorData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textContent = scrapeResult.content;
    console.log(`Glassdoor content length: ${textContent.length}`);

    // Verificar se é página de bloqueio/captcha
    if (textContent.includes('Ajude-nos a proteger') || 
        textContent.includes('CF-103') || 
        textContent.includes('Cloudflare') ||
        textContent.length < 300) {
      console.warn('Glassdoor bloqueou a requisição (captcha), tentando fallback via Google...');
      
      const googleResult = await fallbackGoogleSearch(cargo);
      if (googleResult) {
        console.log('Fallback Google bem-sucedido após bloqueio do Glassdoor!');
        return new Response(
          JSON.stringify(googleResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({
          encontrado: false,
          cargo,
          salario_medio: null,
          faixa: { min: null, max: null },
          remuneracao_variavel: null,
          registros_base: null,
          ultima_atualizacao: null,
          fonte: 'Glassdoor Brasil',
          url: glassdoorUrl,
          erro: 'Glassdoor bloqueou a requisição'
        } as GlassdoorData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair informações com regex
    let salarioMedio: string | null = null;
    let faixaMin: string | null = null;
    let faixaMax: string | null = null;
    let variavelMedia: string | null = null;
    let variavelMin: string | null = null;
    let variavelMax: string | null = null;
    let registrosBase: number | null = null;
    let ultimaAtualizacao: string | null = null;

    // Helper para converter valores com "mil"
    const parseValorBR = (str: string, hasMil: boolean): number => {
      const cleaned = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : (hasMil ? num * 1000 : num);
    };

    // Padrão 1: Salário médio no formato "R$ X mil/mês" ou "R$ X.XXX/mês"
    const salarioMedioMatch1 = textContent.match(/R\$\s*([\d.,]+)\s*(mil)?\/m[eê]s/i);
    if (salarioMedioMatch1) {
      const hasMil = !!salarioMedioMatch1[2];
      const valor = parseValorBR(salarioMedioMatch1[1], hasMil);
      if (valor > 0) {
        salarioMedio = formatCurrency(valor);
      }
    }

    // Padrão 2: "Salário médio: R$ X.XXX" ou "média de R$ X mil"
    if (!salarioMedio) {
      const salarioMedioMatch2 = textContent.match(/(?:sal[aá]rio\s*(?:m[eé]dio|base)|m[eé]dia)[:\s]*R\$\s*([\d.,]+)\s*(mil)?/i);
      if (salarioMedioMatch2) {
        const hasMil = !!salarioMedioMatch2[2];
        const valor = parseValorBR(salarioMedioMatch2[1], hasMil);
        if (valor > 0) {
          salarioMedio = formatCurrency(valor);
        }
      }
    }

    // Faixa salarial: "R$ X mil - R$ Y mil/mês" ou "R$ X.XXX - R$ Y.XXX"
    const faixaMatch = textContent.match(/R\$\s*([\d.,]+)\s*(mil)?\s*[-–]\s*R\$\s*([\d.,]+)\s*(mil)?(?:\/m[eê]s)?/i);
    if (faixaMatch) {
      const minHasMil = !!faixaMatch[2];
      const maxHasMil = !!faixaMatch[4];
      const minVal = parseValorBR(faixaMatch[1], minHasMil);
      const maxVal = parseValorBR(faixaMatch[3], maxHasMil);
      if (minVal > 0 && maxVal > 0) {
        faixaMin = formatCurrency(minVal);
        faixaMax = formatCurrency(maxVal);
        
        // Se não temos média, calcular da faixa
        if (!salarioMedio) {
          salarioMedio = formatCurrency((minVal + maxVal) / 2);
        }
      }
    }

    // Remuneração variável/bônus/adicional
    const variavelMatch = textContent.match(/(?:remunera[çc][aã]o\s*(?:vari[aá]vel|adicional)|b[oô]nus|adicional)[:\s]*R\$\s*([\d.,]+)\s*(mil)?/i);
    if (variavelMatch) {
      const hasMil = !!variavelMatch[2];
      const valor = parseValorBR(variavelMatch[1], hasMil);
      if (valor > 0) {
        variavelMedia = formatCurrency(valor);
      }
    }

    // Número de salários: "X,X mil salários" ou "X salários" ou "baseado em X"
    const registrosMatch1 = textContent.match(/([\d.,]+)\s*(?:mil\s+)?sal[aá]rios/i);
    if (registrosMatch1) {
      const hasMil = registrosMatch1[0].toLowerCase().includes('mil');
      const num = parseValorBR(registrosMatch1[1], hasMil);
      if (num > 0) {
        registrosBase = Math.round(num);
      }
    }
    
    if (!registrosBase) {
      const registrosMatch2 = textContent.match(/(?:baseado\s*em|com\s*base\s*em)\s*(\d+)/i);
      if (registrosMatch2) {
        registrosBase = parseInt(registrosMatch2[1], 10);
      }
    }

    // Última atualização
    const atualizacaoMatch = textContent.match(/(?:atualizado\s*(?:em)?|[uú]ltima\s*atualiza[çc][aã]o)[:\s]*(\d{1,2}\s*(?:de\s*)?\w+\.?\s*(?:de\s*)?\d{2,4})/i);
    if (atualizacaoMatch) {
      ultimaAtualizacao = atualizacaoMatch[1];
    }

    // Verificar se encontrou dados úteis
    const encontrado = !!(salarioMedio || faixaMin || faixaMax);

    // Se não encontrou dados no scraping direto, tentar fallback
    if (!encontrado) {
      console.log('Scraping Glassdoor não extraiu dados, tentando fallback via Google...');
      
      const googleResult = await fallbackGoogleSearch(cargo);
      if (googleResult) {
        console.log('Fallback Google bem-sucedido após scraping sem dados!');
        return new Response(
          JSON.stringify(googleResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const result: GlassdoorData = {
      encontrado,
      cargo,
      salario_medio: salarioMedio,
      faixa: {
        min: faixaMin,
        max: faixaMax
      },
      remuneracao_variavel: variavelMedia ? {
        media: variavelMedia,
        min: variavelMin,
        max: variavelMax
      } : null,
      registros_base: registrosBase,
      ultima_atualizacao: ultimaAtualizacao,
      fonte: 'Glassdoor Brasil',
      url: glassdoorUrl
    };

    console.log('Glassdoor result:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao buscar Glassdoor:', error);
    
    return new Response(
      JSON.stringify({
        encontrado: false,
        cargo: '',
        salario_medio: null,
        faixa: { min: null, max: null },
        remuneracao_variavel: null,
        registros_base: null,
        ultima_atualizacao: null,
        fonte: 'Glassdoor Brasil',
        url: '',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      } as GlassdoorData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
