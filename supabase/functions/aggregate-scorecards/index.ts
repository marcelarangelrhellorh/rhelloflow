import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const url = new URL(req.url);
    const vagaId = url.pathname.split('/').pop();

    if (!vagaId) {
      throw new Error('ID da vaga não fornecido');
    }

    console.log(`Agregando scorecards para vaga ${vagaId}`);

    // Buscar todos os scorecards completos da vaga
    const { data: scorecards, error: scorecardsError } = await supabaseClient
      .from('candidate_scorecards')
      .select(`
        id,
        candidate_id,
        total_score,
        match_percentage,
        created_at,
        evaluator_id,
        comments,
        candidatos!inner(nome_completo, email),
        scorecard_evaluations(
          criteria_id,
          score,
          notes,
          scorecard_criteria(name, weight, category, scale_type)
        )
      `)
      .eq('vaga_id', vagaId)
      .not('total_score', 'is', null);

    if (scorecardsError) throw scorecardsError;

    if (!scorecards || scorecards.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum scorecard completo encontrado para esta vaga' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Agrupar por candidato
    const candidatesMap = new Map();

    for (const scorecard of scorecards) {
      const candidateId = scorecard.candidate_id;

      const candidato = Array.isArray((scorecard as any).candidatos)
        ? (scorecard as any).candidatos[0]
        : (scorecard as any).candidatos;

      if (!candidatesMap.has(candidateId)) {
        candidatesMap.set(candidateId, {
          candidate_id: candidateId,
          candidate_name: candidato?.nome_completo ?? 'Candidato',
          scorecards: [],
          evaluators_count: 0,
          total_score_avg: 0,
          breakdown: {},
          comments: [],
          last_evaluation_date: null,
        });
      }

      const candidate = candidatesMap.get(candidateId);
      candidate.scorecards.push(scorecard);

      // Adicionar comentários se existirem
      if (scorecard.comments) {
        candidate.comments.push({
          text: scorecard.comments,
          evaluator_id: scorecard.evaluator_id,
          date: scorecard.created_at,
        });
      }

      // Atualizar última avaliação
      if (!candidate.last_evaluation_date || scorecard.created_at > candidate.last_evaluation_date) {
        candidate.last_evaluation_date = scorecard.created_at;
      }

      // Processar breakdown por critério
      if (scorecard.scorecard_evaluations) {
        for (const evaluation of scorecard.scorecard_evaluations) {
          const criteria = Array.isArray((evaluation as any).scorecard_criteria)
            ? (evaluation as any).scorecard_criteria[0]
            : (evaluation as any).scorecard_criteria;

          const criteriaName = criteria?.name || 'Unknown';
          const weight = criteria?.weight || 10;
          const scaleType = criteria?.scale_type || 'rating_1_5';

          // Normalizar score para 0-100
          let normalizedScore = 0;
          if (scaleType === 'rating_1_5') {
            normalizedScore = ((evaluation.score - 1) / 4) * 100;
          } else if (scaleType === 'rating_1_10') {
            normalizedScore = ((evaluation.score - 1) / 9) * 100;
          } else {
            normalizedScore = evaluation.score; // Já está normalizado
          }

          if (!candidate.breakdown[criteriaName]) {
            candidate.breakdown[criteriaName] = {
              scores: [],
              weight: weight,
              category: criteria?.category,
            };
          }

          candidate.breakdown[criteriaName].scores.push(normalizedScore);
        }
      }
    }

    // Calcular médias e formatar resultado
    const aggregatedCandidates = Array.from(candidatesMap.values()).map(candidate => {
      candidate.evaluators_count = candidate.scorecards.length;
      
      // Calcular média do total_score
      const totalScores = candidate.scorecards
        .map((s: any) => s.total_score)
        .filter((s: any) => s !== null);
      
      candidate.total_score_avg = totalScores.length > 0
        ? totalScores.reduce((a: number, b: number) => a + b, 0) / totalScores.length
        : 0;

      // Calcular médias do breakdown
      const breakdownArray = Object.entries(candidate.breakdown).map(([criterion, data]: [string, any]) => {
        const avg = data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length;
        return {
          criterion,
          average: parseFloat(avg.toFixed(1)),
          weight: data.weight,
          category: data.category,
        };
      });

      // Ordenar por categoria e média
      breakdownArray.sort((a, b) => b.average - a.average);

      // Pegar top 3 critérios
      const topCriteria = breakdownArray.slice(0, 3);

      return {
        candidate_id: candidate.candidate_id,
        candidate_name: candidate.candidate_name,
        total_score: parseFloat(candidate.total_score_avg.toFixed(1)),
        evaluators_count: candidate.evaluators_count,
        last_evaluation_date: candidate.last_evaluation_date,
        breakdown: breakdownArray,
        top_criteria: topCriteria,
        comments: candidate.comments,
        low_confidence: candidate.evaluators_count < 2,
      };
    });

    // Ordenar por score (maior para menor)
    aggregatedCandidates.sort((a, b) => b.total_score - a.total_score);

    console.log(`Agregados ${aggregatedCandidates.length} candidatos`);

    return new Response(
      JSON.stringify({
        success: true,
        vaga_id: vagaId,
        candidates: aggregatedCandidates,
        total_candidates: aggregatedCandidates.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao agregar scorecards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});