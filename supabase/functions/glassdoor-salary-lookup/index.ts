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
    const cargoSlug = cargo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // URL do Glassdoor Brasil
    const glassdoorUrl = `https://www.glassdoor.com.br/Sal%C3%A1rios/${cargoSlug}-sal%C3%A1rio-SRCH_KO0,${cargoSlug.length}.htm`;
    
    console.log(`Buscando Glassdoor para: ${cargo}`);
    console.log(`URL: ${glassdoorUrl}`);

    // Usar Jina AI Reader para scraping
    const jinaUrl = `https://r.jina.ai/${glassdoorUrl}`;
    
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text'
      },
      signal: AbortSignal.timeout(15000) // 15s timeout
    });

    if (!response.ok) {
      console.warn(`Glassdoor request failed: ${response.status}`);
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
          erro: 'Página não encontrada'
        } as GlassdoorData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textContent = await response.text();
    console.log(`Glassdoor content length: ${textContent.length}`);

    // Extrair informações com regex
    let salarioMedio: string | null = null;
    let faixaMin: string | null = null;
    let faixaMax: string | null = null;
    let variavelMedia: string | null = null;
    let variavelMin: string | null = null;
    let variavelMax: string | null = null;
    let registrosBase: number | null = null;
    let ultimaAtualizacao: string | null = null;

    // Padrões de extração (Glassdoor BR)
    
    // Salário médio: "R$ 14.000" ou "R$ 14 mil" ou "14.000/mês"
    const salarioMedioMatch = textContent.match(/(?:sal[aá]rio\s*(?:m[eé]dio|base)[:\s]*)?R?\$?\s*([\d.,]+)\s*(?:mil|k)?(?:\/m[eê]s)?/i);
    if (salarioMedioMatch) {
      const valor = salarioMedioMatch[1].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(valor);
      if (!isNaN(num)) {
        // Se for "mil", multiplicar por 1000
        const multiplier = salarioMedioMatch[0].toLowerCase().includes('mil') ? 1000 : 1;
        salarioMedio = `R$ ${Math.round(num * multiplier).toLocaleString('pt-BR')}`;
      }
    }

    // Faixa salarial: "R$ 11.000 - R$ 17.000" ou "de R$ X a R$ Y"
    const faixaMatch = textContent.match(/(?:faixa|varia[çc][aã]o|range)[:\s]*(?:de\s*)?R?\$?\s*([\d.,]+)\s*(?:mil|k)?\s*[-–aà]\s*R?\$?\s*([\d.,]+)\s*(?:mil|k)?/i);
    if (faixaMatch) {
      const min = parseFloat(faixaMatch[1].replace(/\./g, '').replace(',', '.'));
      const max = parseFloat(faixaMatch[2].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(min) && !isNaN(max)) {
        const minMult = faixaMatch[0].toLowerCase().includes('mil') ? 1000 : 1;
        faixaMin = `R$ ${Math.round(min * minMult).toLocaleString('pt-BR')}`;
        faixaMax = `R$ ${Math.round(max * minMult).toLocaleString('pt-BR')}`;
      }
    }

    // Remuneração variável/bônus
    const variavelMatch = textContent.match(/(?:remunera[çc][aã]o\s*vari[aá]vel|b[oô]nus|adicional)[:\s]*R?\$?\s*([\d.,]+)\s*(?:mil|k)?/i);
    if (variavelMatch) {
      const valor = parseFloat(variavelMatch[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(valor)) {
        const mult = variavelMatch[0].toLowerCase().includes('mil') ? 1000 : 1;
        variavelMedia = `R$ ${Math.round(valor * mult).toLocaleString('pt-BR')}`;
      }
    }

    // Número de salários
    const registrosMatch = textContent.match(/(?:baseado\s*em|com\s*base\s*em|total\s*de)?\s*(\d+)\s*(?:sal[aá]rios?|dados|relatos|submiss[oõ]es)/i);
    if (registrosMatch) {
      registrosBase = parseInt(registrosMatch[1], 10);
    }

    // Última atualização
    const atualizacaoMatch = textContent.match(/(?:atualizado|última\s*atualiza[çc][aã]o)[:\s]*(\d{1,2}\s*(?:de\s*)?\w+\.?\s*(?:de\s*)?\d{2,4})/i);
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
