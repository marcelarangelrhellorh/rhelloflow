import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      funcao,
      senioridade,
      localizacao,
      setor,
      porte,
      observacoes,
      cliente,
    } = await req.json();

    // Validação de campos obrigatórios
    const camposFaltantes = [];
    if (!funcao) camposFaltantes.push("funcao");
    if (!localizacao?.cidade) camposFaltantes.push("localizacao.cidade");
    if (!localizacao?.uf) camposFaltantes.push("localizacao.uf");

    if (camposFaltantes.length > 0) {
      return new Response(
        JSON.stringify({
          erro: true,
          mensagem: `Campos obrigatórios ausentes: ${camposFaltantes.join(", ")}`,
          campos_faltantes: camposFaltantes,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consultar dados históricos do Supabase
    const { data: historico } = await supabase
      .from("vagas")
      .select("titulo, salario_min, salario_max, beneficios, modelo_trabalho")
      .ilike("titulo", `%${funcao}%`)
      .limit(50);

    // Preparar prompt para IA
    const systemPrompt = `Você é um agente da Rhello para gerar "Estudo de Mercado".
RETORNE APENAS JSON válido. Não inclua explicações fora do JSON.

CONTEXTO RHELLO:
- Após o Discovery, precisamos de um estudo consistente para orientar cliente (faixa salarial, benefícios, concorrência, tendências, dificuldade e recomendações).
- Priorize dados internos quando existirem; complemente com conhecimento de mercado.
- Transparência: sempre informar período e fontes em "metodologia".

REGRAS:
- Não inventar números. Se não houver evidência, usar null e explicar em "metodologia.observacoes".
- Sempre retornar arrays (mesmo vazios) e strings no PT-BR.
- NUNCA retornar texto fora do JSON final.

SCHEMA DE SAÍDA OBRIGATÓRIO:
{
  "faixa_salarial": {
    "junior": {"min": number|null, "med": number|null, "max": number|null, "fontes": string[]},
    "pleno": {"min": number|null, "med": number|null, "max": number|null, "fontes": string[]},
    "senior": {"min": number|null, "med": number|null, "max": number|null, "fontes": string[]}
  },
  "beneficios": {
    "recorrentes": string[],
    "diferenciais": string[]
  },
  "concorrencia": "Alta" | "Média" | "Baixa",
  "tendencias": string[],
  "dificuldade": {"nivel": "Alta" | "Média" | "Baixa", "tempo_medio_dias": number|null},
  "comparativo": {
    "cliente": {"salario": number|null, "modelo": string|null, "beneficios": string[]|null},
    "mercado": {"salario_med_pleno": number|null, "modelo_pred": string|null, "beneficios_mais_comuns": string[]|null},
    "atratividade": "Alta" | "Média" | "Baixa"
  },
  "recomendacoes": string[],
  "metodologia": {"periodo": string, "fontes": string[], "observacoes": string}
}`;

    const userPrompt = `Gere um estudo de mercado com base nos seguintes dados:

FUNÇÃO: ${funcao}
SENIORIDADE: ${senioridade}
LOCALIZAÇÃO: ${localizacao.cidade} - ${localizacao.uf} (Modelo: ${localizacao.modelo})
SETOR: ${setor}
PORTE: ${porte}
OBSERVAÇÕES DISCOVERY: ${observacoes || "Nenhuma"}

DADOS DO CLIENTE:
- Salário proposto: ${cliente?.salario ? `R$ ${cliente.salario}` : "Não informado"}
- Modelo: ${cliente?.modelo || "Não informado"}
- Benefícios: ${cliente?.beneficios?.join(", ") || "Não informados"}

DADOS HISTÓRICOS INTERNOS (últimas 50 vagas similares):
${historico && historico.length > 0 ? JSON.stringify(historico, null, 2) : "Nenhum dado histórico encontrado"}

Com base nessas informações, gere o estudo de mercado completo seguindo o schema JSON especificado.`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro na API de IA:", aiResponse.status, errorText);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const resultadoTexto = aiData.choices?.[0]?.message?.content;

    if (!resultadoTexto) {
      throw new Error("Resposta vazia da IA");
    }

    // Extrair JSON da resposta (pode vir com markdown)
    let resultado;
    try {
      const jsonMatch = resultadoTexto.match(/\{[\s\S]*\}/);
      resultado = JSON.parse(jsonMatch ? jsonMatch[0] : resultadoTexto);
    } catch (e) {
      console.error("Erro ao parsear JSON:", e, "Texto:", resultadoTexto);
      throw new Error("Resposta da IA não está em formato JSON válido");
    }

    // Salvar no Supabase
    const { data: estudo, error: estudoError } = await supabase
      .from("estudos")
      .insert({
        funcao,
        senioridade,
        cidade: localizacao.cidade,
        uf: localizacao.uf,
        modelo_trabalho: localizacao.modelo,
        setor,
        porte,
        salario_cliente: cliente?.salario,
        beneficios_cliente: cliente?.beneficios || [],
        observacoes,
        resultado,
        periodo: new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
      })
      .select()
      .single();

    if (estudoError) {
      console.error("Erro ao salvar estudo:", estudoError);
    }

    // Salvar faixas salariais
    if (estudo && resultado.faixa_salarial) {
      const faixas = [];
      for (const [nivel, dados] of Object.entries(resultado.faixa_salarial)) {
        const faixaData = dados as any;
        faixas.push({
          estudo_id: estudo.id,
          nivel: nivel.charAt(0).toUpperCase() + nivel.slice(1),
          salario_min: faixaData.min,
          salario_med: faixaData.med,
          salario_max: faixaData.max,
          fontes: faixaData.fontes || [],
        });
      }
      await supabase.from("faixas_salariais").insert(faixas);
    }

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro no edge function:", error);
    return new Response(
      JSON.stringify({
        erro: true,
        mensagem: error?.message || "Erro interno ao gerar estudo",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});