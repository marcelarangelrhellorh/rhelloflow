import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'tt_';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    const { candidateId, templateId, vagaId, expirationDays = 7 } = await req.json();

    if (!candidateId || !templateId) {
      throw new Error('candidateId and templateId are required');
    }

    // Verify candidate exists
    const { data: candidate, error: candidateError } = await supabase
      .from('candidatos')
      .select('id, nome_completo')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate not found');
    }

    // Verify template exists and is a technical test
    const { data: template, error: templateError } = await supabase
      .from('scorecard_templates')
      .select('id, name, type')
      .eq('id', templateId)
      .eq('active', true)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    if (template.type !== 'teste_tecnico') {
      throw new Error('Template is not a technical test');
    }

    // Generate unique token
    const externalToken = generateToken();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create scorecard record
    const { data: scorecard, error: scorecardError } = await supabase
      .from('candidate_scorecards')
      .insert({
        candidate_id: candidateId,
        template_id: templateId,
        evaluator_id: user.id, // The candidate will be the evaluator when they submit
        vaga_id: vagaId || null,
        source: 'externo',
        external_token: externalToken,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      })
      .select()
      .single();

    if (scorecardError) {
      console.error('Error creating scorecard:', scorecardError);
      throw new Error('Failed to create test link');
    }

    // Generate URL
    const baseUrl = req.headers.get('origin') || 'https://lovable.dev';
    const testUrl = `${baseUrl}/teste-tecnico/${externalToken}`;

    console.log(`Technical test link generated for candidate ${candidate.nome_completo}: ${testUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        token: externalToken,
        url: testUrl,
        expiresAt: expiresAt.toISOString(),
        scorecardId: scorecard.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error generating technical test link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
