import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { vagaTitle, candidates, anonymize = false } = await req.json();

    if (!vagaTitle || !candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "vagaTitle and candidates are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating AI summary for ${candidates.length} candidates`);

    // Preparar dados para IA (top 5 candidatos para evitar payload muito grande)
    const topCandidates = candidates.slice(0, 5).map((c: any) => ({
      name: anonymize ? c.id.substring(0, 8) : c.name,
      totalScore: c.totalScore,
      evaluationsCount: c.evaluationsCount,
      topCriteria: c.criteriaAverages.slice(0, 3).map((cr: any) => ({
        name: cr.name,
        average: Math.round(cr.average * 10) / 10,
      })),
      recommendations: c.recommendations,
    }));

    const prompt = `Você é um analista de RH especializado. Analise os seguintes candidatos avaliados para a vaga "${vagaTitle}" e produza:

1) Resumo executivo (3-4 linhas)
2) Top 3 candidatos com justificativa curta (1 linha cada)
3) Pontos fortes do grupo (2-3 bullets)
4) Riscos/preocupações do grupo (2-3 bullets)
5) Próximos passos recomendados (3 bullets)

Dados dos candidatos:
${JSON.stringify(topCandidates, null, 2)}

Mantenha o tom profissional e objetivo. Use português brasileiro.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um analista de RH experiente que gera resumos executivos concisos e acionáveis sobre avaliações de candidatos.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao gerar resumo com IA");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";

    console.log("AI summary generated successfully");

    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in generate-comparison-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
