import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  vagaId: string;
  expiresInDays?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    const { vagaId, expiresInDays = 90 } = body;

    if (!vagaId) {
      return new Response(
        JSON.stringify({ error: 'vagaId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating client view link for vaga ${vagaId} by user ${user.id}`);

    // Check if vaga exists and user has permission
    const { data: vaga, error: vagaError } = await supabase
      .from('vagas')
      .select('id, titulo, recrutador_id, cs_id')
      .eq('id', vagaId)
      .is('deleted_at', null)
      .single();

    if (vagaError || !vaga) {
      console.error('Vaga not found:', vagaError);
      return new Response(
        JSON.stringify({ error: 'Vaga not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already an active client view link for this vaga
    const { data: existingLink } = await supabase
      .from('client_view_links')
      .select('*')
      .eq('vaga_id', vagaId)
      .eq('active', true)
      .eq('deleted', false)
      .single();

    if (existingLink) {
      console.log('Returning existing active link');
      return new Response(
        JSON.stringify({ 
          linkId: existingLink.id,
          token: existingLink.token,
          expiresAt: existingLink.expires_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create client view link
    const { data: newLink, error: insertError } = await supabase
      .from('client_view_links')
      .insert({
        vaga_id: vagaId,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        active: true,
        deleted: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating client view link:', insertError);
      throw insertError;
    }

    console.log('Client view link created successfully:', newLink.id);

    return new Response(
      JSON.stringify({ 
        linkId: newLink.id,
        token: newLink.token,
        expiresAt: newLink.expires_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-client-view-link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
