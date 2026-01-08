import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  candidate_id: string;
  template_key: string;
  custom_message?: string;
  consent_confirmed: boolean;
}

// Templates are now loaded from database

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const multiwebApiKey = Deno.env.get('MULTIWEB_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: WhatsAppRequest = await req.json();

    if (!body.consent_confirmed) {
      return new Response(
        JSON.stringify({ error: 'Consentimento não confirmado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do candidato
    const { data: candidate, error: candidateError } = await supabase
      .from('candidatos')
      .select('*, vagas:vaga_relacionada_id(titulo)')
      .eq('id', body.candidate_id)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidato não encontrado');
    }

    // Buscar dados do recrutador
    const { data: recruiter } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Validar e formatar número
    let phoneNumber = candidate.telefone?.replace(/\D/g, '') || '';
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Candidato não possui telefone cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Adicionar código do país se não tiver
    if (!phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber;
    }

    // Validar formato (55 + DDD + número)
    if (phoneNumber.length < 12 || phoneNumber.length > 13) {
      return new Response(
        JSON.stringify({ error: 'Número de telefone inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar template do banco de dados
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('content')
      .eq('key', body.template_key)
      .eq('active', true)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return new Response(
        JSON.stringify({ error: 'Template não encontrado ou inativo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar mensagem
    let message = body.custom_message || template.content;
    
    // Substituir placeholders
    message = message
      .replace(/\{\{candidate_first_name\}\}/g, candidate.nome_completo.split(' ')[0])
      .replace(/\{\{candidate_name\}\}/g, candidate.nome_completo)
      .replace(/\{\{recruiter_name\}\}/g, recruiter?.full_name || 'rhello')
      .replace(/\{\{vacancy_title\}\}/g, candidate.vagas?.titulo || 'a vaga')
      .replace(/\{\{custom_note\}\}/g, '');

    // Criar registro inicial
    const { data: sendRecord, error: insertError } = await supabase
      .from('whatsapp_sends')
      .insert({
        candidate_id: body.candidate_id,
        vacancy_id: candidate.vaga_relacionada_id,
        sent_by: user.id,
        number: phoneNumber,
        text: message,
        template_key: body.template_key,
        consent_confirmed: true,
        status: 'queued'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating send record:', insertError);
      throw new Error('Erro ao criar registro de envio');
    }

    console.log('Sending WhatsApp to:', phoneNumber);

    // Chamar API do Multiweb
    try {
      const multiwebResponse = await fetch('https://api.multiweb.plus/send/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: multiwebApiKey,
          numero: phoneNumber,
          texto: message,
        }),
      });

      const responseData = await multiwebResponse.json();
      console.log('Multiweb response:', responseData);

      // Atualizar registro com resultado
      const updateData: any = {
        provider_response: responseData,
        sent_at: new Date().toISOString(),
      };

      if (multiwebResponse.ok) {
        updateData.status = 'sent';
      } else {
        updateData.status = 'failed';
        updateData.error_message = responseData.message || 'Erro ao enviar mensagem';
      }

      await supabase
        .from('whatsapp_sends')
        .update(updateData)
        .eq('id', sendRecord.id);

      return new Response(
        JSON.stringify({
          success: multiwebResponse.ok,
          message: multiwebResponse.ok ? 'Mensagem enviada com sucesso!' : 'Falha ao enviar mensagem',
          data: responseData,
          send_id: sendRecord.id,
        }),
        { 
          status: multiwebResponse.ok ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (apiError) {
      console.error('Error calling Multiweb API:', apiError);
      
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erro de conexão com o provedor';
      
      await supabase
        .from('whatsapp_sends')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', sendRecord.id);

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao conectar com o provedor de WhatsApp',
          details: errorMessage
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});