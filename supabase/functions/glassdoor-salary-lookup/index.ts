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
}

async function scrapeWithFirecrawl(url: string): Promise<{ success: boolean; content: string; error?: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY_1') || Deno.env.get('FIRECRAWL_API_KEY');
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

    // Usar Firecrawl para scraping
    const scrapeResult = await scrapeWithFirecrawl(glassdoorUrl);
    
    if (!scrapeResult.success) {
      console.warn(`Firecrawl falhou: ${scrapeResult.error}`);
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
    console.log(`Glassdoor content preview: ${textContent.substring(0, 800)}`);

    // Verificar se é página de bloqueio/captcha
    if (textContent.includes('Ajude-nos a proteger') || textContent.includes('CF-103') || textContent.length < 300) {
      console.warn('Glassdoor bloqueou a requisição (captcha)');
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
        salarioMedio = `R$ ${Math.round(valor).toLocaleString('pt-BR')}`;
      }
    }

    // Padrão 2: "Salário médio: R$ X.XXX" ou "média de R$ X mil"
    if (!salarioMedio) {
      const salarioMedioMatch2 = textContent.match(/(?:sal[aá]rio\s*(?:m[eé]dio|base)|m[eé]dia)[:\s]*R\$\s*([\d.,]+)\s*(mil)?/i);
      if (salarioMedioMatch2) {
        const hasMil = !!salarioMedioMatch2[2];
        const valor = parseValorBR(salarioMedioMatch2[1], hasMil);
        if (valor > 0) {
          salarioMedio = `R$ ${Math.round(valor).toLocaleString('pt-BR')}`;
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
        faixaMin = `R$ ${Math.round(minVal).toLocaleString('pt-BR')}`;
        faixaMax = `R$ ${Math.round(maxVal).toLocaleString('pt-BR')}`;
        
        // Se não temos média, calcular da faixa
        if (!salarioMedio) {
          salarioMedio = `R$ ${Math.round((minVal + maxVal) / 2).toLocaleString('pt-BR')}`;
        }
      }
    }

    // Remuneração variável/bônus/adicional
    const variavelMatch = textContent.match(/(?:remunera[çc][aã]o\s*(?:vari[aá]vel|adicional)|b[oô]nus|adicional)[:\s]*R\$\s*([\d.,]+)\s*(mil)?/i);
    if (variavelMatch) {
      const hasMil = !!variavelMatch[2];
      const valor = parseValorBR(variavelMatch[1], hasMil);
      if (valor > 0) {
        variavelMedia = `R$ ${Math.round(valor).toLocaleString('pt-BR')}`;
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
