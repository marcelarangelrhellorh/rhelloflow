import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      throw new Error('Token is required');
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
        vaga_id,
        candidatos(nome_completo, email),
        scorecard_templates!candidate_scorecards_template_id_fkey(
          id,
          name,
          description
        ),
        vagas(titulo, empresa)
      `)
      .eq('external_token', token)
      .eq('source', 'externo')
      .single();

    if (scorecardError || !scorecard) {
      console.error('Scorecard not found:', scorecardError);
      return new Response(
        JSON.stringify({ error: 'Test not found', code: 'NOT_FOUND' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Check if already submitted
    if (scorecard.submitted_at) {
      return new Response(
        JSON.stringify({ error: 'Test already submitted', code: 'ALREADY_SUBMITTED' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Check expiration
    if (scorecard.expires_at && new Date(scorecard.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Test link has expired', code: 'EXPIRED' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Load criteria for the template (without correct answers for multiple choice)
    const { data: criteria, error: criteriaError } = await supabase
      .from('scorecard_criteria')
      .select('id, name, description, category, weight, question_type, options, display_order')
      .eq('template_id', scorecard.template_id)
      .order('display_order');

    if (criteriaError) {
      console.error('Error loading criteria:', criteriaError);
      throw new Error('Failed to load test questions');
    }

    // Remove correct answer indicators from options for security
    const sanitizedCriteria = (criteria || []).map(c => {
      if (c.question_type === 'multiple_choice' && c.options) {
        return {
          ...c,
          options: c.options.map((opt: any) => ({
            text: opt.text
            // Removed is_correct and points from client response
          }))
        };
      }
      return c;
    });

    console.log(`Technical test loaded for token ${token}: ${criteria?.length} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        scorecard: {
          id: scorecard.id,
          expiresAt: scorecard.expires_at
        },
        candidate: {
          name: (scorecard.candidatos as any)?.nome_completo || 'Candidato',
          email: (scorecard.candidatos as any)?.email
        },
        template: {
          id: (scorecard.scorecard_templates as any)?.id,
          name: (scorecard.scorecard_templates as any)?.name,
          description: (scorecard.scorecard_templates as any)?.description
        },
        job: scorecard.vagas ? {
          title: (scorecard.vagas as any)?.titulo,
          company: (scorecard.vagas as any)?.empresa
        } : null,
        criteria: sanitizedCriteria
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error getting technical test:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
