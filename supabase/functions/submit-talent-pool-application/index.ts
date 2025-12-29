import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function generateProtocol(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BT-${timestamp}-${random}`;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, candidate, password, formStartTime, files, utm } = body;

    // Validate token
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Anti-spam: Check form timing (must take at least 3 seconds)
    if (formStartTime) {
      const elapsedTime = Date.now() - formStartTime;
      if (elapsedTime < 3000) {
        console.log('Form submitted too quickly, possible bot');
        return new Response(JSON.stringify({ error: 'Erro de validação' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Anti-spam: Honeypot check
    if (candidate.company) {
      console.log('Honeypot field filled, likely bot');
      return new Response(JSON.stringify({ error: 'Erro de validação' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get link details
    const { data: links, error: linkError } = await supabase
      .rpc('get_talent_pool_link_by_token', { p_token: token });

    if (linkError || !links?.[0]) {
      return new Response(JSON.stringify({ error: 'Link não encontrado ou expirado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const link = links[0];

    // Check submission limit
    if (link.max_submissions && link.submissions_count >= link.max_submissions) {
      return new Response(JSON.stringify({ error: 'Limite de candidaturas atingido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password if required
    if (link.requires_password) {
      if (!password) {
        return new Response(JSON.stringify({ error: 'Senha obrigatória' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: fullLink } = await supabase
        .from('talent_pool_links')
        .select('password_hash')
        .eq('id', link.id)
        .single();

      const passwordHash = await hashPassword(password);
      if (fullLink?.password_hash !== passwordHash) {
        return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate required fields
    if (!candidate.nome_completo || !candidate.email || !candidate.telefone) {
      return new Response(JSON.stringify({ error: 'Preencha todos os campos obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidate.email)) {
      return new Response(JSON.stringify({ error: 'E-mail inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate fit_cultural
    if (!candidate.fit_cultural) {
      return new Response(JSON.stringify({ error: 'Preencha a seção de Fit Cultural' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fitCultural = candidate.fit_cultural;
    if (!fitCultural.motivacao || !fitCultural.valores?.length || !fitCultural.preferencia_trabalho ||
        !fitCultural.desafios_interesse || !fitCultural.ponto_forte || !fitCultural.area_desenvolvimento ||
        !fitCultural.situacao_aprendizado) {
      return new Response(JSON.stringify({ error: 'Preencha todas as perguntas de Fit Cultural' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate protocol
    const protocol = generateProtocol();
    const idempotencyKey = `tp_${link.id}_${candidate.email}_${Date.now()}`;

    // Create candidate record
    const candidateData = {
      nome_completo: candidate.nome_completo.trim(),
      email: candidate.email.trim().toLowerCase(),
      telefone: candidate.telefone.trim(),
      cidade: candidate.cidade?.trim() || null,
      estado: candidate.estado?.trim() || null,
      linkedin: candidate.linkedin?.trim() || null,
      nivel: candidate.nivel || null,
      cargo: candidate.cargo || null,
      area: candidate.area || null,
      pretensao_salarial: candidate.pretensao_salarial ? parseFloat(candidate.pretensao_salarial) : null,
      idade: candidate.idade ? parseInt(candidate.idade) : null,
      modelo_contratacao: candidate.modelo_contratacao || null,
      formato_trabalho: candidate.formato_trabalho || null,
      origem: candidate.origem || 'Link Banco de Talentos',
      fit_cultural: fitCultural,
      status: 'Banco de Talentos',
      talent_pool_link_id: link.id,
      idempotency_key: idempotencyKey,
      utm: utm || null,
    };

    const { data: newCandidate, error: insertError } = await supabase
      .from('candidatos')
      .insert(candidateData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating candidate:', insertError);
      
      // Check for duplicate
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Você já se cadastrou anteriormente' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erro ao criar cadastro' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle file upload if provided
    if (files?.resume?.data) {
      try {
        const base64Data = files.resume.data.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileExt = files.resume.name.split('.').pop() || 'pdf';
        const filePath = `${newCandidate.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('curriculos')
          .upload(filePath, binaryData, {
            contentType: files.resume.name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: false,
          });

        if (!uploadError) {
          await supabase
            .from('candidatos')
            .update({ curriculo_url: filePath })
            .eq('id', newCandidate.id);
        } else {
          console.error('Error uploading resume:', uploadError);
        }
      } catch (uploadErr) {
        console.error('Error processing file upload:', uploadErr);
      }
    }

    // Handle portfolio upload if provided
    if (files?.portfolio?.data) {
      try {
        const base64Data = files.portfolio.data.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileExt = files.portfolio.name.split('.').pop() || 'pdf';
        const filePath = `${newCandidate.id}_portfolio_${Date.now()}.${fileExt}`;
        
        // Determine content type based on file extension
        let contentType = 'application/pdf';
        if (fileExt === 'png') contentType = 'image/png';
        else if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';
        else if (fileExt === 'pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        
        const { error: uploadError } = await supabase.storage
          .from('portfolios')
          .upload(filePath, binaryData, {
            contentType,
            upsert: false,
          });

        if (!uploadError) {
          await supabase
            .from('candidatos')
            .update({ portfolio_url: filePath })
            .eq('id', newCandidate.id);
        } else {
          console.error('Error uploading portfolio:', uploadError);
        }
      } catch (uploadErr) {
        console.error('Error processing portfolio upload:', uploadErr);
      }
    }

    // Update submission count
    await supabase
      .from('talent_pool_links')
      .update({ 
        submissions_count: link.submissions_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', link.id);

    // Log submission event
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase.from('talent_pool_link_events').insert({
      link_id: link.id,
      event_type: 'submit',
      ip_address: ipAddress,
      user_agent: userAgent,
      utm_source: utm?.utm_source,
      utm_medium: utm?.utm_medium,
      utm_campaign: utm?.utm_campaign,
      metadata: {
        candidate_id: newCandidate.id,
        protocol,
      },
    });

    console.log(`Talent pool application submitted: ${newCandidate.id}, protocol: ${protocol}`);

    return new Response(JSON.stringify({
      success: true,
      protocol,
      candidate_id: newCandidate.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in submit-talent-pool-application:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
