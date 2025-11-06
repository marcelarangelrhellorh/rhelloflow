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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { vagaId, anonymize = false } = await req.json();

    console.log(`Compare candidates called with vagaId: ${vagaId}, anonymize: ${anonymize}`);

    if (!vagaId) {
      console.error("No vagaId provided");
      return new Response(
        JSON.stringify({ error: "vagaId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Loading scorecards for job ${vagaId}`);

    // Buscar candidatos vinculados à vaga com scorecards
    const { data: candidatos, error: candidatosError } = await supabase
      .from("candidatos")
      .select("id, nome_completo")
      .eq("vaga_relacionada_id", vagaId)
      .is("deleted_at", null);

    if (candidatosError) {
      console.error("Error loading candidates:", candidatosError);
      throw candidatosError;
    }

    console.log(`Found ${candidatos?.length || 0} candidates for job ${vagaId}`);

    if (!candidatos || candidatos.length === 0) {
      console.log("No candidates found for this job");
      return new Response(
        JSON.stringify({ candidates: [], stats: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidateIds = candidatos.map(c => c.id);
    console.log(`Candidate IDs: ${candidateIds.join(", ")}`);

    // Buscar scorecards dos candidatos
    const { data: scorecards, error: scorecardsError } = await supabase
      .from("candidate_scorecards")
      .select(`
        id,
        candidate_id,
        template_id,
        evaluator_id,
        vaga_id,
        recommendation,
        comments,
        total_score,
        match_percentage,
        created_at,
        scorecard_templates!inner(name)
      `)
      .in("candidate_id", candidateIds)
      .eq("vaga_id", vagaId)
      .order("created_at", { ascending: false });

    if (scorecardsError) {
      console.error("Error loading scorecards:", scorecardsError);
      throw scorecardsError;
    }

    console.log(`Found ${scorecards?.length || 0} scorecards for candidates`);

    // Buscar informações dos avaliadores separadamente
    const evaluatorIds = [...new Set((scorecards || []).map((sc: any) => sc.evaluator_id).filter(Boolean))];
    const { data: evaluators } = await supabase
      .from("users")
      .select("id, name")
      .in("id", evaluatorIds);

    const evaluatorsMap = new Map((evaluators || []).map(u => [u.id, u.name]));

    // Buscar avaliações detalhadas
    const scorecardsWithEvaluations = await Promise.all(
      (scorecards || []).map(async (scorecard: any) => {
        const { data: evaluations } = await supabase
          .from("scorecard_evaluations")
          .select(`
            score,
            notes,
            scorecard_criteria!inner(name, category, weight, display_order)
          `)
          .eq("scorecard_id", scorecard.id)
          .order("scorecard_criteria(display_order)");

        return {
          ...scorecard,
          evaluator_name: evaluatorsMap.get(scorecard.evaluator_id) || "Desconhecido",
          evaluations: (evaluations || []).map((ev: any) => ({
            criteria_name: ev.scorecard_criteria.name,
            criteria_category: ev.scorecard_criteria.category,
            criteria_weight: ev.scorecard_criteria.weight,
            score: ev.score,
            notes: ev.notes,
          })),
        };
      })
    );

    // Agrupar por candidato
    const candidatesMap = new Map();

    candidatos.forEach(candidato => {
      const candidateScorecards = scorecardsWithEvaluations.filter(
        (sc: any) => sc.candidate_id === candidato.id
      );

      if (candidateScorecards.length === 0) return;

      // Calcular médias por critério
      const criteriaScores = new Map<string, { sum: number; count: number; category: string }>();

      candidateScorecards.forEach((sc: any) => {
        sc.evaluations.forEach((ev: any) => {
          const key = ev.criteria_name;
          if (!criteriaScores.has(key)) {
            criteriaScores.set(key, { sum: 0, count: 0, category: ev.criteria_category });
          }
          const current = criteriaScores.get(key)!;
          current.sum += ev.score || 0;
          current.count += 1;
        });
      });

      const criteriaAverages: any[] = [];
      criteriaScores.forEach((value, key) => {
        criteriaAverages.push({
          name: key,
          category: value.category,
          average: value.count > 0 ? value.sum / value.count : 0,
        });
      });

      // Calcular score médio total
      const totalScore = candidateScorecards.reduce(
        (sum: number, sc: any) => sum + (sc.match_percentage || 0),
        0
      ) / candidateScorecards.length;

      // Coletar recomendações
      const recommendations = candidateScorecards.map((sc: any) => sc.recommendation);

      candidatesMap.set(candidato.id, {
        id: candidato.id,
        name: anonymize ? `Candidato ${candidato.id.substring(0, 6)}` : candidato.nome_completo,
        fullName: candidato.nome_completo, // Manter para uso interno
        totalScore: Math.round(totalScore),
        evaluationsCount: candidateScorecards.length,
        criteriaAverages: criteriaAverages.sort((a, b) => b.average - a.average),
        lastEvaluationDate: candidateScorecards[0].created_at,
        recommendations: recommendations,
        evaluators: [...new Set(candidateScorecards.map((sc: any) => sc.evaluator_name || "Desconhecido"))],
        scorecards: candidateScorecards.map((sc: any) => ({
          id: sc.id,
          templateName: sc.scorecard_templates?.name || "Template",
          evaluator: sc.evaluator_name || "Desconhecido",
          score: sc.match_percentage,
          recommendation: sc.recommendation,
          comments: sc.comments,
          date: sc.created_at,
        })),
      });
    });

    const candidates = Array.from(candidatesMap.values())
      .sort((a, b) => b.totalScore - a.totalScore);

    // Calcular estatísticas gerais
    const stats = {
      totalCandidates: candidates.length,
      averageScore: candidates.length > 0
        ? Math.round(candidates.reduce((sum, c) => sum + c.totalScore, 0) / candidates.length)
        : 0,
      topScore: candidates.length > 0 ? candidates[0].totalScore : 0,
      lowScore: candidates.length > 0 ? candidates[candidates.length - 1].totalScore : 0,
    };

    console.log(`Found ${candidates.length} candidates with scorecards`);

    return new Response(
      JSON.stringify({ candidates, stats }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in compare-candidates:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
