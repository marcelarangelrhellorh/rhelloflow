import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Answer {
  criteria_id: string;
  score?: number;
  text_answer?: string;
  selected_option_index?: number;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, answers } = await req.json();

    if (!token || !answers || !Array.isArray(answers)) {
      throw new Error('Token and answers are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find scorecard by token
    const { data: scorecard, error: scorecardError } = await supabase
      .from('candidate_scorecards')
      .select(`
        id,
        candidate_id,
        template_id,
        expires_at,
        submitted_at,
        created_by,
        vaga_id,
        candidatos(nome_completo)
      `)
      .eq('external_token', token)
      .eq('source', 'externo')
      .single();

    if (scorecardError || !scorecard) {
      throw new Error('Test not found');
    }

    // Check if already submitted
    if (scorecard.submitted_at) {
      throw new Error('Test already submitted');
    }

    // Check expiration
    if (scorecard.expires_at && new Date(scorecard.expires_at) < new Date()) {
      throw new Error('Test link has expired');
    }

    // Load criteria with correct answers for scoring
    const { data: criteria, error: criteriaError } = await supabase
      .from('scorecard_criteria')
      .select('id, weight, question_type, options')
      .eq('template_id', scorecard.template_id);

    if (criteriaError) {
      throw new Error('Failed to load test criteria');
    }

    const criteriaMap = new Map(criteria?.map(c => [c.id, c]) || []);

    // Process answers and calculate scores
    let totalWeightedScore = 0;
    let totalWeight = 0;

    const evaluationsToInsert = answers.map((answer: Answer) => {
      const criterion = criteriaMap.get(answer.criteria_id);
      if (!criterion) return null;

      let score = 0;
      let isCorrect: boolean | null = null;

      switch (criterion.question_type) {
        case 'rating':
          score = answer.score || 0;
          break;

        case 'open_text':
          // Open text questions are graded later by recruiter
          score = 0;
          break;

        case 'multiple_choice':
          if (criterion.options && typeof answer.selected_option_index === 'number') {
            const selectedOption = criterion.options[answer.selected_option_index];
            if (selectedOption) {
              isCorrect = selectedOption.is_correct === true;
              // Score based on correctness: correct = 5, wrong = 0
              score = isCorrect ? 5 : 0;
            }
          }
          break;
      }

      // Calculate weighted contribution (excluding open text until graded)
      if (criterion.question_type !== 'open_text' && score > 0) {
        totalWeightedScore += (score / 5) * criterion.weight;
        totalWeight += criterion.weight;
      }

      return {
        scorecard_id: scorecard.id,
        criteria_id: answer.criteria_id,
        score: score || null,
        notes: answer.notes || null,
        text_answer: answer.text_answer || null,
        selected_option_index: answer.selected_option_index ?? null,
        is_correct: isCorrect
      };
    }).filter(Boolean);

    // Insert evaluations
    const { error: evaluationsError } = await supabase
      .from('scorecard_evaluations')
      .insert(evaluationsToInsert);

    if (evaluationsError) {
      console.error('Error inserting evaluations:', evaluationsError);
      throw new Error('Failed to save answers');
    }

    // Calculate final percentage
    const matchPercentage = totalWeight > 0 
      ? Math.round((totalWeightedScore / totalWeight) * 100) 
      : 0;

    // Update scorecard with submission info
    const { error: updateError } = await supabase
      .from('candidate_scorecards')
      .update({
        submitted_at: new Date().toISOString(),
        total_score: totalWeightedScore,
        match_percentage: matchPercentage
      })
      .eq('id', scorecard.id);

    if (updateError) {
      console.error('Error updating scorecard:', updateError);
      throw new Error('Failed to update test status');
    }

    console.log(`Technical test submitted for scorecard ${scorecard.id}: ${matchPercentage}%`);

    // Create notification for the recruiter who created the test (non-blocking)
    if (scorecard.created_by) {
      try {
        const candidateName = (scorecard.candidatos as any)?.nome_completo || 'Candidato';
        
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: scorecard.created_by,
            kind: 'teste_tecnico',
            title: 'Teste técnico respondido',
            body: `${candidateName} completou o teste técnico com score de ${matchPercentage}%`,
            job_id: scorecard.vaga_id
          });

        if (notifError) {
          console.error('Failed to create notification:', notifError);
        } else {
          console.log(`Notification sent to user ${scorecard.created_by}`);
          
          // Send email notification (non-blocking)
          try {
            await supabase.functions.invoke('send-notification-email', {
              body: {
                user_id: scorecard.created_by,
                kind: 'teste_tecnico',
                title: 'Teste técnico respondido',
                body: `${candidateName} completou o teste técnico com score de ${matchPercentage}%`,
                job_id: scorecard.vaga_id,
              },
            });
            console.log(`Email sent to user ${scorecard.created_by}`);
          } catch (emailErr) {
            console.error('Error sending notification email:', emailErr);
          }
        }
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchPercentage,
        totalScore: totalWeightedScore,
        message: 'Test submitted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error submitting technical test:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
