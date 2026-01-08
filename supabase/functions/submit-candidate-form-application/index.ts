import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function generateProtocol(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CF-${timestamp}-${random}`;
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

    // Get link details with vaga info
    const { data: link, error: linkError } = await supabase
      .from('candidate_form_links')
      .select(`
        id,
        vaga_id,
        active,
        expires_at,
        max_submissions,
        submissions_count,
        password_hash,
        revoked,
        created_by,
        vaga:vagas(id, titulo, empresa)
      `)
      .eq('token', token)
      .eq('revoked', false)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: 'Link não encontrado ou expirado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if link is active
    if (!link.active) {
      return new Response(JSON.stringify({ error: 'Link desativado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Link expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check submission limit
    if (link.max_submissions && link.submissions_count >= link.max_submissions) {
      return new Response(JSON.stringify({ error: 'Limite de candidaturas atingido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password if required
    if (link.password_hash) {
      if (!password) {
        return new Response(JSON.stringify({ error: 'Senha obrigatória' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const passwordHash = await hashPassword(password);
      if (link.password_hash !== passwordHash) {
        return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate required fields
    if (!candidate.nome_completo || !candidate.email || !candidate.telefone || !candidate.cpf) {
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
    const idempotencyKey = `cf_${link.id}_${candidate.email}_${Date.now()}`;

    // Create candidate record with status "Triagem" and linked to the job
    const candidateData = {
      nome_completo: candidate.nome_completo.trim(),
      email: candidate.email.trim().toLowerCase(),
      cpf: candidate.cpf.replace(/\D/g, ''),
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
      origem: candidate.origem || 'Formulário de Candidatura',
      fit_cultural: fitCultural,
      status: 'Triagem', // Candidates from this form start in "Triagem"
      vaga_relacionada_id: link.vaga_id, // Link to the job
      candidate_form_link_id: link.id,
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
      .from('candidate_form_links')
      .update({ 
        submissions_count: link.submissions_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', link.id);

    // Log submission event
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase.from('candidate_form_link_events').insert({
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

    // Create notification for the user who created the link
    if (link.created_by) {
      const vagaInfo = link.vaga as { titulo?: string; empresa?: string } | null;
      const vagaTitulo = vagaInfo?.titulo || 'Vaga';
      
      await supabase.from('notificacoes').insert({
        user_id: link.created_by,
        tipo: 'candidatura_formulario',
        titulo: 'Nova candidatura recebida',
        mensagem: `${candidate.nome_completo} se candidatou à vaga ${vagaTitulo}`,
        vaga_id: link.vaga_id,
        lida: false,
      });

      // Trigger email notification in background
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            user_id: link.created_by,
            kind: 'candidatura_formulario',
            title: 'Nova candidatura recebida',
            body: `${candidate.nome_completo} se candidatou à vaga ${vagaTitulo}`,
            job_id: link.vaga_id,
          },
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the submission if email fails
      }
    }

    // Create history entry
    await supabase.from('historico_candidatos').insert({
      candidato_id: newCandidate.id,
      vaga_id: link.vaga_id,
      resultado: 'Inscrito',
      feedback: `Candidatura via formulário vinculado à vaga. Protocolo: ${protocol}`,
    });

    console.log(`Candidate form application submitted: ${newCandidate.id}, protocol: ${protocol}, vaga: ${link.vaga_id}`);

    return new Response(JSON.stringify({
      success: true,
      protocol,
      candidate_id: newCandidate.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in submit-candidate-form-application:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
