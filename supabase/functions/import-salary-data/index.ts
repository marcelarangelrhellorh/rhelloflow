import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HaysRecord {
  guia: string;
  pagina: number;
  cargo_original: string;
  cargo_canonico: string;
  setor: string | null;
  senioridade: string | null;
  fixo_min: number | null;
  fixo_max: number | null;
  trecho_origem: string;
}

interface MichaelPageRecord {
  guia: string;
  pagina: number;
  cargo_original: string;
  cargo_canonico: string;
  setor: string | null;
  senioridade: string | null;
  peq_fixo_min: number | null;
  peq_fixo_max: number | null;
  grande_fixo_min: number | null;
  grande_fixo_max: number | null;
  trecho_origem: string;
}

interface SalaryBenchmark {
  source: string;
  year: number;
  page_number: number | null;
  cargo_original: string | null;
  cargo_canonico: string;
  setor: string | null;
  senioridade: string | null;
  porte_empresa: string | null;
  fixo_min: number | null;
  fixo_max: number | null;
  trecho_origem: string | null;
}

// Michael Page 2026 - Page to Sector mapping based on PDF structure
const MICHAEL_PAGE_SECTOR_MAP: Record<number, string> = {
  // Agronegócio - página 12
  12: 'Agronegócio',
  // Bancos e Serviços Financeiros - páginas 13-24
  13: 'Bancos e Serviços Financeiros',
  14: 'Bancos e Serviços Financeiros',
  15: 'Bancos e Serviços Financeiros',
  16: 'Bancos e Serviços Financeiros',
  17: 'Bancos e Serviços Financeiros',
  18: 'Bancos e Serviços Financeiros',
  19: 'Bancos e Serviços Financeiros',
  20: 'Bancos e Serviços Financeiros',
  21: 'Bancos e Serviços Financeiros',
  22: 'Bancos e Serviços Financeiros',
  23: 'Bancos e Serviços Financeiros',
  24: 'Bancos e Serviços Financeiros',
  // Construção Civil - páginas 25-28
  25: 'Construção Civil',
  26: 'Construção Civil',
  27: 'Construção Civil',
  28: 'Construção Civil',
  // Energia - páginas 29-31
  29: 'Energia',
  30: 'Energia',
  31: 'Energia',
  // Engenharia e Manufatura - páginas 32-36
  32: 'Engenharia e Manufatura',
  33: 'Engenharia e Manufatura',
  34: 'Engenharia e Manufatura',
  35: 'Engenharia e Manufatura',
  36: 'Engenharia e Manufatura',
  // Finanças e Impostos - páginas 37-41
  37: 'Finanças e Impostos',
  38: 'Finanças e Impostos',
  39: 'Finanças e Impostos',
  40: 'Finanças e Impostos',
  41: 'Finanças e Impostos',
  // Jurídico - páginas 42-46
  42: 'Jurídico',
  43: 'Jurídico',
  44: 'Jurídico',
  45: 'Jurídico',
  46: 'Jurídico',
  // Marketing - páginas 47-50
  47: 'Marketing',
  48: 'Marketing',
  49: 'Marketing',
  50: 'Marketing',
  // Recursos Humanos - páginas 51-55
  51: 'Recursos Humanos',
  52: 'Recursos Humanos',
  53: 'Recursos Humanos',
  54: 'Recursos Humanos',
  55: 'Recursos Humanos',
  // Saúde - páginas 56-65
  56: 'Saúde',
  57: 'Saúde',
  58: 'Saúde',
  59: 'Saúde',
  60: 'Saúde',
  61: 'Saúde',
  62: 'Saúde',
  63: 'Saúde',
  64: 'Saúde',
  65: 'Saúde',
  // Seguros - páginas 66-68
  66: 'Seguros',
  67: 'Seguros',
  68: 'Seguros',
  // Supply Chain - páginas 69-78
  69: 'Supply Chain',
  70: 'Supply Chain',
  71: 'Supply Chain',
  72: 'Supply Chain',
  73: 'Supply Chain',
  74: 'Supply Chain',
  75: 'Supply Chain',
  76: 'Supply Chain',
  77: 'Supply Chain',
  78: 'Supply Chain',
  // Tecnologia - páginas 79-86
  79: 'Tecnologia',
  80: 'Tecnologia',
  81: 'Tecnologia',
  82: 'Tecnologia',
  83: 'Tecnologia',
  84: 'Tecnologia',
  85: 'Tecnologia',
  86: 'Tecnologia',
  // Varejo - páginas 87-88
  87: 'Varejo',
  88: 'Varejo',
  // Vendas - páginas 89-92
  89: 'Vendas',
  90: 'Vendas',
  91: 'Vendas',
  92: 'Vendas',
};

// Hays 2026 - Page to Sector mapping based on PDF structure
const HAYS_SECTOR_MAP: Record<number, string> = {
  // Engenharia - páginas 17-20
  17: 'Engenharia', 18: 'Engenharia', 19: 'Engenharia', 20: 'Engenharia',
  // Ciências da Vida - páginas 21-23
  21: 'Ciências da Vida', 22: 'Ciências da Vida', 23: 'Ciências da Vida',
  // Tecnologia - páginas 24-28
  24: 'Tecnologia', 25: 'Tecnologia', 26: 'Tecnologia', 27: 'Tecnologia', 28: 'Tecnologia',
  // Solução Flex (Temporário/Terceiro) - páginas 29-36
  // Subseções por área dentro do Flex:
  29: 'Tecnologia', 30: 'Tecnologia', 31: 'Tecnologia', 32: 'Tecnologia', 33: 'Tecnologia',
  34: 'Finanças e Contabilidade', 35: 'Recursos Humanos', 36: 'Supply Chain',
};

// Get sector from Michael Page page number
function getMichaelPageSetor(pageNumber: number): string | null {
  return MICHAEL_PAGE_SECTOR_MAP[pageNumber] || null;
}

// Get sector from Hays page number
function getHaysSetor(pageNumber: number): string | null {
  return HAYS_SECTOR_MAP[pageNumber] || null;
}

// Parse all salary values from Hays text (returns array of {min, max} pairs)
function parseAllHaysSalaries(text: string): { min: number; max: number }[] {
  const results: { min: number; max: number }[] = [];
  const regex = /R\$\s*([\d.,]+)\s*-\s*R\$\s*([\d.,]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const min = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    const max = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(min) && !isNaN(max) && min > 1000 && max > 1000) {
      results.push({ min, max });
    }
  }
  
  return results;
}

// Extract clean cargo name from Hays data
function extractCleanCargo(text: string): string {
  // Remove salary patterns and porte labels
  let clean = text
    .replace(/R\$\s*[\d.,]+\s*-\s*R\$\s*[\d.,]+/g, '')
    .replace(/Empresa de (pequeno|médio|grande) porte/gi, '')
    .replace(/Resiliência da IA/gi, '')
    .replace(/(Alta|Média|Baixa)\s*$/gi, '')
    .replace(/Cargos?/gi, '')
    .trim();
  
  // Get first meaningful part (before any numbers)
  const parts = clean.split(/\s{2,}/);
  if (parts.length > 0 && parts[0].length > 3) {
    return parts[0].trim();
  }
  
  return clean || text;
}

// Detect senioridade from cargo name
function detectSenioridade(cargo: string): string | null {
  const lowerCargo = cargo.toLowerCase();
  
  if (lowerCargo.includes('diretor') || lowerCargo.includes('c-level') || lowerCargo.includes('cfo') || lowerCargo.includes('cto')) {
    return 'Diretor/C-Level';
  }
  if (lowerCargo.includes('gerente') || lowerCargo.includes('head')) {
    return 'Gerente';
  }
  if (lowerCargo.includes('coordenador') || lowerCargo.includes('líder') || lowerCargo.includes('supervisor')) {
    return 'Coordenador';
  }
  if (lowerCargo.includes('especialista') || lowerCargo.includes('sênior') || lowerCargo.includes('senior')) {
    return 'Sênior';
  }
  if (lowerCargo.includes('pleno') || lowerCargo.includes('analista')) {
    return 'Pleno';
  }
  if (lowerCargo.includes('júnior') || lowerCargo.includes('junior') || lowerCargo.includes('trainee') || lowerCargo.includes('estagiário')) {
    return 'Júnior';
  }
  
  return null;
}

// Detect setor from cargo or context (fallback for Hays and unknown pages)
function detectSetor(cargo: string, trecho: string): string | null {
  const text = `${cargo} ${trecho}`.toLowerCase();
  
  if (text.includes('engenharia') || text.includes('engenheiro') || text.includes('industrial')) {
    return 'Engenharia';
  }
  if (text.includes('financeiro') || text.includes('finanças') || text.includes('controller') || text.includes('contab')) {
    return 'Finanças';
  }
  if (text.includes('tecnologia') || text.includes('ti ') || text.includes('software') || text.includes('dados') || text.includes('ia ')) {
    return 'Tecnologia';
  }
  if (text.includes('comercial') || text.includes('vendas') || text.includes('sales')) {
    return 'Comercial';
  }
  if (text.includes('marketing') || text.includes('comunicação')) {
    return 'Marketing';
  }
  if (text.includes('recursos humanos') || text.includes(' rh ') || text.includes('people')) {
    return 'Recursos Humanos';
  }
  if (text.includes('jurídico') || text.includes('legal') || text.includes('advogado')) {
    return 'Jurídico';
  }
  if (text.includes('supply') || text.includes('logística') || text.includes('operações')) {
    return 'Supply Chain';
  }
  if (text.includes('saúde') || text.includes('farma') || text.includes('médico')) {
    return 'Saúde';
  }
  if (text.includes('seguros') || text.includes('atuário') || text.includes('sinistro')) {
    return 'Seguros';
  }
  if (text.includes('banco') || text.includes('banking') || text.includes('crédito')) {
    return 'Bancos e Serviços Financeiros';
  }
  
  return null;
}

// Transform Hays data
function transformHaysData(records: HaysRecord[]): SalaryBenchmark[] {
  const benchmarks: SalaryBenchmark[] = [];
  
  for (const record of records) {
    // Skip header rows and non-salary data
    if (
      record.cargo_original.toLowerCase().includes('cargos empresa') ||
      record.cargo_original.length < 5
    ) {
      continue;
    }
    
    const fullText = `${record.cargo_original} ${record.trecho_origem}`;
    const salaries = parseAllHaysSalaries(fullText);
    
    if (salaries.length === 0) continue;
    
    const cleanCargo = extractCleanCargo(record.cargo_original);
    if (cleanCargo.length < 3) continue;
    
    // Get setor from page number mapping FIRST, fallback to detectSetor
    const pageNumber = record.pagina || 0;
    const setor = getHaysSetor(pageNumber) || detectSetor(cleanCargo, record.trecho_origem);
    
    // Map salaries to portes: [pequeno, médio, grande]
    // If we have 3 salary ranges, map to pequeno, médio, grande
    // If we have 2, map to pequeno_medio and grande
    // If we have 1, use it as general
    if (salaries.length >= 3) {
      // Pequeno/Médio (use first two ranges combined as min/max)
      benchmarks.push({
        source: 'hays',
        year: 2026,
        page_number: pageNumber,
        cargo_original: record.cargo_original,
        cargo_canonico: cleanCargo,
        setor: setor,
        senioridade: detectSenioridade(cleanCargo),
        porte_empresa: 'pequeno_medio',
        fixo_min: salaries[0].min,
        fixo_max: salaries[1].max,
        trecho_origem: record.trecho_origem.substring(0, 500),
      });
      // Grande
      benchmarks.push({
        source: 'hays',
        year: 2026,
        page_number: pageNumber,
        cargo_original: record.cargo_original,
        cargo_canonico: cleanCargo,
        setor: setor,
        senioridade: detectSenioridade(cleanCargo),
        porte_empresa: 'grande',
        fixo_min: salaries[2].min,
        fixo_max: salaries[2].max,
        trecho_origem: record.trecho_origem.substring(0, 500),
      });
    } else if (salaries.length === 2) {
      benchmarks.push({
        source: 'hays',
        year: 2026,
        page_number: pageNumber,
        cargo_original: record.cargo_original,
        cargo_canonico: cleanCargo,
        setor: setor,
        senioridade: detectSenioridade(cleanCargo),
        porte_empresa: 'pequeno_medio',
        fixo_min: salaries[0].min,
        fixo_max: salaries[0].max,
        trecho_origem: record.trecho_origem.substring(0, 500),
      });
      benchmarks.push({
        source: 'hays',
        year: 2026,
        page_number: pageNumber,
        cargo_original: record.cargo_original,
        cargo_canonico: cleanCargo,
        setor: setor,
        senioridade: detectSenioridade(cleanCargo),
        porte_empresa: 'grande',
        fixo_min: salaries[1].min,
        fixo_max: salaries[1].max,
        trecho_origem: record.trecho_origem.substring(0, 500),
      });
    } else {
      // Single salary range - use as general
      benchmarks.push({
        source: 'hays',
        year: 2026,
        page_number: pageNumber,
        cargo_original: record.cargo_original,
        cargo_canonico: cleanCargo,
        setor: setor,
        senioridade: detectSenioridade(cleanCargo),
        porte_empresa: null,
        fixo_min: salaries[0].min,
        fixo_max: salaries[0].max,
        trecho_origem: record.trecho_origem.substring(0, 500),
      });
    }
  }
  
  return benchmarks;
}

// Transform Michael Page data
function transformMichaelPageData(records: MichaelPageRecord[]): SalaryBenchmark[] {
  const benchmarks: SalaryBenchmark[] = [];
  
  for (const record of records) {
    // Skip header rows or invalid entries
    if (!record.cargo_original || record.cargo_original.length < 3) {
      continue;
    }
    
    // Clean cargo name - remove salary pattern suffixes
    const cleanCargo = record.cargo_original
      .replace(/Fix:.*$/i, '')
      .replace(/Mínimo Máximo Var\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanCargo.length < 3) continue;
    
    // Get setor from page number mapping FIRST, fallback to detectSetor
    const pageNumber = record.pagina || 0;
    const setor = getMichaelPageSetor(pageNumber) || detectSetor(cleanCargo, record.trecho_origem || '');
    
    // Validate and normalize salary values (some entries have swapped min/max)
    const peqMin = record.peq_fixo_min;
    const peqMax = record.peq_fixo_max;
    const grandeMin = record.grande_fixo_min;
    const grandeMax = record.grande_fixo_max;
    
    // Create entry for pequeno/médio porte - validate values are reasonable monthly salaries
    if (peqMin !== null && peqMax !== null && peqMin >= 1000 && peqMin <= 200000) {
      const validMin = Math.min(peqMin, peqMax);
      const validMax = Math.max(peqMin, peqMax);
      // Skip if max is unreasonably high (annual values mistakenly in monthly field)
      if (validMax <= 150000) {
        benchmarks.push({
          source: 'michael_page',
          year: 2026,
          page_number: pageNumber,
          cargo_original: record.cargo_original,
          cargo_canonico: cleanCargo,
          setor: setor,
          senioridade: detectSenioridade(cleanCargo),
          porte_empresa: 'pequeno_medio',
          fixo_min: validMin,
          fixo_max: validMax,
          trecho_origem: (record.trecho_origem || '').substring(0, 500),
        });
      }
    }
    
    // Create entry for grande porte
    if (grandeMin !== null && grandeMax !== null && grandeMin >= 1000 && grandeMin <= 200000) {
      const validMin = Math.min(grandeMin, grandeMax);
      const validMax = Math.max(grandeMin, grandeMax);
      if (validMax <= 150000) {
        benchmarks.push({
          source: 'michael_page',
          year: 2026,
          page_number: pageNumber,
          cargo_original: record.cargo_original,
          cargo_canonico: cleanCargo,
          setor: setor,
          senioridade: detectSenioridade(cleanCargo),
          porte_empresa: 'grande',
          fixo_min: validMin,
          fixo_max: validMax,
          trecho_origem: (record.trecho_origem || '').substring(0, 500),
        });
      }
    }
  }
  
  return benchmarks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { source, data, clear_existing } = await req.json();

    console.log(`[import-salary-data] Importing ${data?.length || 0} records from ${source}`);

    // Optionally clear existing data for this source
    if (clear_existing) {
      const { error: deleteError } = await supabase
        .from('salary_benchmarks')
        .delete()
        .eq('source', source);
      
      if (deleteError) {
        console.error('[import-salary-data] Error clearing existing data:', deleteError);
      } else {
        console.log(`[import-salary-data] Cleared existing ${source} data`);
      }
    }

    // Transform data based on source
    let benchmarks: SalaryBenchmark[] = [];
    
    if (source === 'hays') {
      benchmarks = transformHaysData(data);
    } else if (source === 'michael_page') {
      benchmarks = transformMichaelPageData(data);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown source. Use "hays" or "michael_page"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[import-salary-data] Transformed ${benchmarks.length} salary benchmarks`);

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < benchmarks.length; i += batchSize) {
      const batch = benchmarks.slice(i, i + batchSize);
      
      const { data: inserted, error } = await supabase
        .from('salary_benchmarks')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`[import-salary-data] Batch error:`, error);
        errorCount += batch.length;
      } else {
        insertedCount += inserted?.length || 0;
      }
    }

    console.log(`[import-salary-data] Import complete: ${insertedCount} inserted, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        source,
        total_records: data?.length || 0,
        transformed: benchmarks.length,
        inserted: insertedCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[import-salary-data] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
