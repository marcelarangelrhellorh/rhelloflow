import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { vaga_id, aggregated_data, anonymize = false, include_comments = true } = await req.json();

    if (!vaga_id || !aggregated_data) {
      throw new Error('Dados incompletos: vaga_id e aggregated_data são obrigatórios');
    }

    console.log(`Analisando scorecards da vaga ${vaga_id} com IA`);

    // Preparar dados para a IA
    const candidatesForAI = aggregated_data.candidates.map((candidate: any, index: number) => {
      const displayName = anonymize ? `Candidato ${index + 1}` : candidate.candidate_name;
      
      return {
        id: anonymize ? `candidate_${index + 1}` : candidate.candidate_id,
        display_name: displayName,
        total_score: candidate.total_score,
        evaluators_count: candidate.evaluators_count,
        last_evaluation_date: candidate.last_evaluation_date,
        breakdown: candidate.breakdown,
        comments: include_comments ? candidate.comments.map((c: any) => c.text) : [],
      };
    });

    // Preparar prompt para IA
    const aiPrompt = `Você é um analista de recrutamento/IA responsável por sintetizar avaliações de candidatos. 
Entrada: um JSON com os candidatos vinculados a uma vaga. Para cada candidato temos:
- id (ou display_name)
- total_score (0-100)
- evaluators_count (int)
- last_evaluation_date (ISO)
- breakdown: [{ criterion: "Fit cultural", average: 84.5, weight: 10, category: "soft_skills" }, ...]  (médias por critério em %)
- comments: [ "Comentário 1...", "Comentário 2..." ] (opcional, pode ser vazio)

Regras:
1. Não invente dados. Use apenas o que está no JSON.
2. ${anonymize ? 'Os candidatos já estão anonimizados como "Candidato 1", "Candidato 2".' : 'Use os nomes dos candidatos fornecidos.'}
3. Considere confiabilidade = evaluators_count; marque candidatos com evaluators_count < 2 como "baixa confiabilidade".
4. Saída deve ser JSON estrito com as chaves: 
   {
     "executive_summary": "texto curto (2-3 linhas)",
     "ranking": [
       {"rank":1,"candidate_id":"...", "total_score": 92.3, "note":"breve justificativa (1 linha)"},
       ...
     ],
     "insights": ["bullet 1", "bullet 2", ...],
     "risks": ["bullet ..."],
     "recommendations": ["bullet ..."],
     "confidence_notes": ["texto sobre confiabilidade geral dos dados"]
   }

Tarefas:
- Gere um executive_summary destacando situação geral (ex: "3 candidatos com scores médios altos; diferenças ...").
- Ordene candidatos por total_score e gere ranking com 1-liner justificativo baseado no breakdown (p.ex. "Alto em hard skills, baixo em fit cultural").
- Liste 3 principais insights (ex: critérios onde o time pontua mais baixo; padrões em comentários).
- Liste até 3 riscos (ex: poucos avaliadores, variabilidade alta, scores enviesados).
- Dê 3 recomendações práticas (ex: "focar entrevista técnica adicional", "realizar calibragem dos avaliadores", "priorizar candidato X para entrevista final").
- Escreva nota final sobre confiabilidade dos dados (base: número de avaliadores e dispersão das notas).

Retorne apenas o JSON válido, sem markdown ou texto adicional.

DADOS DOS CANDIDATOS:
${JSON.stringify(candidatesForAI, null, 2)}`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um analista de recrutamento especializado em sintetizar avaliações de candidatos. Sempre retorne JSON válido.' 
          },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições atingido. Tente novamente em alguns instantes.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos do Lovable AI esgotados. Entre em contato com o suporte.');
      }
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Extrair JSON da resposta
    let analysis;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', aiContent);
      throw new Error('Formato de resposta inválido da IA');
    }

    // Registrar log de uso
    const { error: logError } = await supabaseClient
      .from('scorecard_analysis_logs')
      .insert({
        vaga_id,
        analyzed_by: userId,
        candidates_count: candidatesForAI.length,
        anonymized: anonymize,
        included_comments: include_comments,
        ai_model: 'google/gemini-2.5-flash',
      });

    if (logError) {
      console.error('Erro ao registrar log:', logError);
      // Não falhar a request por causa do log
    }

    console.log('Análise concluída com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        vaga_id,
        aggregate: aggregated_data,
        ia_summary: analysis,
        meta: {
          anonymized: anonymize,
          included_comments: include_comments,
          timestamp: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao analisar scorecards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
