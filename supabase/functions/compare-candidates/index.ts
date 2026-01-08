import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    console.log(`[${new Date().toISOString()}] Compare candidates called - vagaId: ${vagaId}`);

    if (!vagaId) {
      return new Response(
        JSON.stringify({ error: "vagaId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar candidatos da vaga
    const { data: candidatos, error: candidatosError } = await supabase
      .from("candidatos")
      .select("id, nome_completo")
      .eq("vaga_relacionada_id", vagaId)
      .is("deleted_at", null);

    if (candidatosError) throw candidatosError;
    if (!candidatos || candidatos.length === 0) {
      console.log("No candidates found");
      return new Response(
        JSON.stringify({ candidates: [], stats: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidateIds = candidatos.map(c => c.id);
    console.log(`Found ${candidatos.length} candidates:`, candidateIds);

    // 2. Buscar scorecards (SEM joins complexos)
    const { data: scorecards, error: scorecardsError } = await supabase
      .from("candidate_scorecards")
      .select("*")
      .in("candidate_id", candidateIds)
      .eq("vaga_id", vagaId)
      .order("created_at", { ascending: false });

    if (scorecardsError) throw scorecardsError;
    
    console.log(`Found ${scorecards?.length || 0} scorecards`);
    
    if (!scorecards || scorecards.length === 0) {
      console.log("No scorecards found for these candidates");
      return new Response(
        JSON.stringify({ candidates: [], stats: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar templates
    const templateIds = [...new Set(scorecards.map(sc => sc.template_id))];
    const { data: templates } = await supabase
      .from("scorecard_templates")
      .select("id, name")
      .in("id", templateIds);
    
    const templatesMap = new Map((templates || []).map(t => [t.id, t.name]));

    // 4. Buscar avaliadores
    const evaluatorIds = [...new Set(scorecards.map(sc => sc.evaluator_id).filter(Boolean))];
    const { data: evaluators } = await supabase
      .from("users")
      .select("id, name")
      .in("id", evaluatorIds);
    
    const evaluatorsMap = new Map((evaluators || []).map(u => [u.id, u.name]));

    // 5. Buscar avaliações de cada scorecard
    const scorecardIds = scorecards.map(sc => sc.id);
    const { data: allEvaluations } = await supabase
      .from("scorecard_evaluations")
      .select("*")
      .in("scorecard_id", scorecardIds);

    // 6. Buscar critérios
    const criteriaIds = [...new Set((allEvaluations || []).map(ev => ev.criteria_id))];
    const { data: criteria } = await supabase
      .from("scorecard_criteria")
      .select("*")
      .in("id", criteriaIds);
    
    const criteriaMap = new Map((criteria || []).map(c => [c.id, c]));

    // 7. Montar estrutura de dados
    const candidatesMap = new Map();

    candidatos.forEach(candidato => {
      const candidateScorecards = scorecards.filter(sc => sc.candidate_id === candidato.id);
      
      if (candidateScorecards.length === 0) return;

      // Calcular médias por critério
      const criteriaScores = new Map<string, { sum: number; count: number; category: string }>();

      candidateScorecards.forEach(scorecard => {
        const evaluations = (allEvaluations || []).filter(ev => ev.scorecard_id === scorecard.id);
        
        evaluations.forEach(ev => {
          const criterion = criteriaMap.get(ev.criteria_id);
          if (!criterion) return;
          
          const key = criterion.name;
          if (!criteriaScores.has(key)) {
            criteriaScores.set(key, { sum: 0, count: 0, category: criterion.category });
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
        (sum, sc) => sum + (sc.match_percentage || 0),
        0
      ) / candidateScorecards.length;

      candidatesMap.set(candidato.id, {
        id: candidato.id,
        name: anonymize ? `Candidato ${candidato.id.substring(0, 6)}` : candidato.nome_completo,
        fullName: candidato.nome_completo,
        totalScore: Math.round(totalScore),
        evaluationsCount: candidateScorecards.length,
        criteriaAverages: criteriaAverages.sort((a, b) => b.average - a.average),
        lastEvaluationDate: candidateScorecards[0].created_at,
        evaluators: [...new Set(candidateScorecards.map(sc => evaluatorsMap.get(sc.evaluator_id) || "Desconhecido"))],
        scorecards: candidateScorecards.map(sc => ({
          id: sc.id,
          templateName: templatesMap.get(sc.template_id) || "Template",
          evaluator: evaluatorsMap.get(sc.evaluator_id) || "Desconhecido",
          score: sc.match_percentage,
          comments: sc.comments,
          date: sc.created_at,
        })),
      });
    });

    const candidates = Array.from(candidatesMap.values())
      .sort((a, b) => b.totalScore - a.totalScore);

    const stats = {
      totalCandidates: candidates.length,
      averageScore: candidates.length > 0
        ? Math.round(candidates.reduce((sum, c) => sum + c.totalScore, 0) / candidates.length)
        : 0,
      topScore: candidates.length > 0 ? candidates[0].totalScore : 0,
      lowScore: candidates.length > 0 ? candidates[candidates.length - 1].totalScore : 0,
    };

    console.log(`Returning ${candidates.length} candidates with scorecards`);

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