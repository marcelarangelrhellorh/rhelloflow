import { createClient } from "npm:@supabase/supabase-js@2";
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is authenticated
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { vaga_id, password, expires_in_days, max_submissions, note } = body;

    if (!vaga_id) {
      return new Response(JSON.stringify({ error: 'ID da vaga é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify vaga exists
    const { data: vaga, error: vagaError } = await supabase
      .from('vagas')
      .select('id, titulo, empresa')
      .eq('id', vaga_id)
      .single();

    if (vagaError || !vaga) {
      return new Response(JSON.stringify({ error: 'Vaga não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique token
    let token = generateToken(12);
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('candidate_form_links')
        .select('id')
        .eq('token', token)
        .single();
      
      if (!existing) break;
      token = generateToken(12);
      attempts++;
    }

    // Hash password if provided
    const passwordHash = password ? await hashPassword(password) : null;

    // Calculate expiration date
    let expiresAt = null;
    if (expires_in_days) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(expires_in_days));
      expiresAt = expirationDate.toISOString();
    }

    // Create the link
    const { data: link, error } = await supabase
      .from('candidate_form_links')
      .insert({
        vaga_id,
        token,
        password_hash: passwordHash,
        expires_at: expiresAt,
        max_submissions: max_submissions ? parseInt(max_submissions) : null,
        note: note || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating candidate form link:', error);
      return new Response(JSON.stringify({ error: 'Erro ao criar link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log event
    await supabase.from('candidate_form_link_events').insert({
      link_id: link.id,
      event_type: 'created',
      metadata: { created_by: user.id, vaga_id },
    });

    console.log(`Candidate form link created: ${link.id} for vaga: ${vaga_id}`);

    return new Response(JSON.stringify({
      id: link.id,
      token: link.token,
      url: `${req.headers.get('origin')}/candidatura/${link.token}`,
      expires_at: link.expires_at,
      max_submissions: link.max_submissions,
      requires_password: !!passwordHash,
      vaga: {
        id: vaga.id,
        titulo: vaga.titulo,
        empresa: vaga.empresa,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-candidate-form-link:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
