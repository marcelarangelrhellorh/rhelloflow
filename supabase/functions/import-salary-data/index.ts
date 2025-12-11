import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Parse Hays salary from cargo_original or trecho_origem
function parseHaysSalary(text: string, porteLabel: string): { min: number | null; max: number | null } {
  // Pattern: R$ XX.XXX - R$ YY.YYY
  const regex = new RegExp(`${porteLabel}[^R]*R\\$\\s*([\\d.,]+)\\s*-\\s*R\\$\\s*([\\d.,]+)`, 'i');
  const match = text.match(regex);
  
  if (match) {
    const min = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    const max = parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
    return { min: isNaN(min) ? null : min, max: isNaN(max) ? null : max };
  }
  
  // Fallback: try simple pattern
  const simpleRegex = /R\$\s*([\d.,]+)\s*-\s*R\$\s*([\d.,]+)/g;
  const matches = [...text.matchAll(simpleRegex)];
  
  if (matches.length > 0) {
    // For pequeno porte, use first match; for médio, second; for grande, third
    const idx = porteLabel === 'pequeno' ? 0 : (porteLabel === 'médio' ? 1 : 2);
    if (matches[idx]) {
      const min = parseFloat(matches[idx][1].replace(/\./g, '').replace(',', '.'));
      const max = parseFloat(matches[idx][2].replace(/\./g, '').replace(',', '.'));
      return { min: isNaN(min) ? null : min, max: isNaN(max) ? null : max };
    }
  }
  
  return { min: null, max: null };
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

// Detect setor from cargo or context
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
    return 'Saúde/Farma';
  }
  if (text.includes('seguros') || text.includes('atuário') || text.includes('sinistro')) {
    return 'Seguros';
  }
  if (text.includes('banco') || text.includes('banking') || text.includes('crédito')) {
    return 'Banking';
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
      record.cargo_original.length < 5 ||
      (!record.trecho_origem.includes('R$') && !record.cargo_original.includes('R$'))
    ) {
      continue;
    }
    
    const cleanCargo = extractCleanCargo(record.cargo_original);
    if (cleanCargo.length < 3) continue;
    
    const fullText = `${record.cargo_original} ${record.trecho_origem}`;
    
    // Create entries for each porte
    const portes = [
      { label: 'pequeno', db: 'pequeno' },
      { label: 'médio', db: 'medio' },
      { label: 'grande', db: 'grande' },
    ];
    
    for (const porte of portes) {
      const salary = parseHaysSalary(fullText, porte.label);
      
      if (salary.min !== null || salary.max !== null) {
        benchmarks.push({
          source: 'hays',
          year: 2025,
          page_number: record.pagina,
          cargo_original: record.cargo_original,
          cargo_canonico: cleanCargo,
          setor: detectSetor(cleanCargo, record.trecho_origem),
          senioridade: detectSenioridade(cleanCargo),
          porte_empresa: porte.db,
          fixo_min: salary.min,
          fixo_max: salary.max,
          trecho_origem: record.trecho_origem,
        });
      }
    }
  }
  
  return benchmarks;
}

// Transform Michael Page data
function transformMichaelPageData(records: MichaelPageRecord[]): SalaryBenchmark[] {
  const benchmarks: SalaryBenchmark[] = [];
  
  for (const record of records) {
    // Skip header rows
    if (record.cargo_original.toLowerCase().includes('mínimo máximo') && !record.peq_fixo_min) {
      continue;
    }
    
    // Clean cargo name
    const cleanCargo = record.cargo_original
      .replace(/Fix:.*$/i, '')
      .replace(/Mínimo Máximo Var\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanCargo.length < 3) continue;
    
    // Create entry for pequeno/médio porte
    if (record.peq_fixo_min !== null || record.peq_fixo_max !== null) {
      benchmarks.push({
        source: 'michael_page',
        year: 2026,
        page_number: record.pagina,
        cargo_original: record.cargo_original,
        cargo_canonico: cleanCargo,
        setor: detectSetor(cleanCargo, record.trecho_origem || ''),
        senioridade: detectSenioridade(cleanCargo),
        porte_empresa: 'pequeno_medio',
        fixo_min: record.peq_fixo_min,
        fixo_max: record.peq_fixo_max,
        trecho_origem: record.trecho_origem,
      });
    }
    
    // Create entry for grande porte
    if (record.grande_fixo_min !== null || record.grande_fixo_max !== null) {
      benchmarks.push({
        source: 'michael_page',
        year: 2026,
        page_number: record.pagina,
        cargo_original: record.cargo_original,
        cargo_canonico: cleanCargo,
        setor: detectSetor(cleanCargo, record.trecho_origem || ''),
        senioridade: detectSenioridade(cleanCargo),
        porte_empresa: 'grande',
        fixo_min: record.grande_fixo_min,
        fixo_max: record.grande_fixo_max,
        trecho_origem: record.trecho_origem,
      });
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
