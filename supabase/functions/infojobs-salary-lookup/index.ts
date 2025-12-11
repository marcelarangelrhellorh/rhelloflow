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

    // Usar Firecrawl para scraping
    const scrapeResult = await scrapeWithFirecrawl(infojobsUrl);

    if (!scrapeResult.success) {
      console.warn(`Firecrawl falhou: ${scrapeResult.error}`);
      
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
    console.log(`Markdown preview: ${markdown.substring(0, 800)}`);

    // Verificar se InfoJobs retornou erro 500 ou página de erro
    if (markdown.includes('500 Internal Server Error') || 
        markdown.includes('Erro interno') ||
        markdown.includes('temporarily unavailable')) {
      console.log('InfoJobs retornou erro interno 500');
      
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
      console.log('Página InfoJobs não encontrada para este cargo');
      
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
