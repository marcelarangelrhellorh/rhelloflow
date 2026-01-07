import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

// Event payload interface based on webhook_contract.json
interface JestorWebhookPayload {
  event_type: string;
  timestamp_utc: string;
  correlation_id: string;
  resource: {
    type: string;
    id: string;
  };
  actor: {
    id: string;
    type: 'user' | 'system';
    display_name: string;
  };
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Validate Bearer Token
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = Deno.env.get('JESTOR_WEBHOOK_SECRET');

    if (!expectedSecret) {
      console.error('JESTOR_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== expectedSecret) {
      console.warn('Invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse payload
    const body: JestorWebhookPayload = await req.json();
    console.log(`Received event: ${body.event_type}`, { 
      correlation_id: body.correlation_id,
      resource: body.resource 
    });

    // 3. Get idempotency key from header or payload
    const idempotencyKey = req.headers.get('Idempotency-Key') || body.correlation_id;
    
    if (!idempotencyKey) {
      console.warn('Missing idempotency key');
      return new Response(JSON.stringify({ error: 'Missing correlation_id or Idempotency-Key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Check for duplicate event (idempotency check)
    const { data: existingEvent } = await supabase
      .from('audit_events')
      .select('id')
      .eq('correlation_id', idempotencyKey)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Duplicate event detected, skipping: ${idempotencyKey}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Event already processed',
        correlation_id: idempotencyKey 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Process event based on type
    let processingResult: { success: boolean; message: string } = { success: true, message: 'Event processed' };

    switch (body.event_type) {
      case 'vaga.status_changed':
        processingResult = await handleVagaStatusChanged(supabase, body);
        break;
      case 'candidato.status_changed':
        processingResult = await handleCandidatoStatusChanged(supabase, body);
        break;
      case 'candidato.created':
        processingResult = await handleCandidatoCreated(supabase, body);
        break;
      case 'feedback.created':
        processingResult = await handleFeedbackCreated(supabase, body);
        break;
      case 'task.created':
      case 'task.status_changed':
        processingResult = await handleTaskEvent(supabase, body);
        break;
      default:
        console.log(`Unhandled event type: ${body.event_type}`);
        processingResult = { success: true, message: `Event type ${body.event_type} acknowledged but not processed` };
    }

    // 7. Log event to audit_events
    const { error: auditError } = await supabase.rpc('log_audit_event', {
      p_actor: {
        id: body.actor.id,
        type: body.actor.type,
        display_name: body.actor.display_name,
      },
      p_action: body.event_type,
      p_resource: {
        type: body.resource.type,
        id: body.resource.id,
      },
      p_correlation_id: idempotencyKey,
      p_payload: body.payload,
      p_client: {
        source: 'jestor-webhook',
        timestamp_utc: body.timestamp_utc,
      },
    });

    if (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't fail the request, event was still processed
    }

    console.log(`Event processed successfully: ${body.event_type}`, processingResult);

    return new Response(JSON.stringify({
      success: processingResult.success,
      message: processingResult.message,
      correlation_id: idempotencyKey,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Event handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function handleVagaStatusChanged(
  supabase: SupabaseClient,
  event: JestorWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const { previous_status, new_status } = event.payload as { previous_status: string; new_status: string };
  
  console.log(`Vaga ${event.resource.id} status changed: ${previous_status} -> ${new_status}`);
  
  // Update vaga with new status and track who changed it
  const { error } = await supabase
    .from('vagas')
    .update({
      status: new_status,
      last_status_change_by: event.actor.id,
      idempotency_key: event.correlation_id,
    })
    .eq('id', event.resource.id);

  if (error) {
    console.error('Error updating vaga status:', error);
    return { success: false, message: `Failed to update vaga: ${error.message}` };
  }

  return { success: true, message: `Vaga status updated to ${new_status}` };
}

async function handleCandidatoStatusChanged(
  supabase: SupabaseClient,
  event: JestorWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const { previous_status, new_status } = event.payload as { previous_status: string; new_status: string };
  
  console.log(`Candidato ${event.resource.id} status changed: ${previous_status} -> ${new_status}`);
  
  // Build update object
  const updateData: Record<string, unknown> = {
    status: new_status,
    idempotency_key: event.correlation_id,
  };

  // If hired, set hired_at timestamp
  if (new_status === 'Contratado') {
    updateData.hired_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('candidatos')
    .update(updateData)
    .eq('id', event.resource.id);

  if (error) {
    console.error('Error updating candidato status:', error);
    return { success: false, message: `Failed to update candidato: ${error.message}` };
  }

  return { success: true, message: `Candidato status updated to ${new_status}` };
}

async function handleCandidatoCreated(
  supabase: SupabaseClient,
  event: JestorWebhookPayload
): Promise<{ success: boolean; message: string }> {
  console.log(`Candidato created: ${event.resource.id}`);
  
  // This is mainly for logging/sync purposes
  // The actual candidato creation should happen through normal flows
  // We just acknowledge and log it
  
  return { success: true, message: 'Candidato creation acknowledged' };
}

async function handleFeedbackCreated(
  supabase: SupabaseClient,
  event: JestorWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const payload = event.payload as { 
    candidato_id: string; 
    vaga_id: string; 
    rating?: number;
    tipo?: string;
    conteudo?: string;
  };
  
  console.log(`Feedback created for candidato ${payload.candidato_id}`);
  
  // Update feedback with idempotency_key if it exists
  const { error } = await supabase
    .from('feedbacks')
    .update({ idempotency_key: event.correlation_id })
    .eq('id', event.resource.id);

  if (error) {
    console.error('Error updating feedback idempotency_key:', error);
    // Don't fail, this is optional
  }

  return { success: true, message: 'Feedback creation acknowledged' };
}

async function handleTaskEvent(
  supabase: SupabaseClient,
  event: JestorWebhookPayload
): Promise<{ success: boolean; message: string }> {
  console.log(`Task event: ${event.event_type} for task ${event.resource.id}`);
  
  // Update task with idempotency_key
  const { error } = await supabase
    .from('tasks')
    .update({ idempotency_key: event.correlation_id })
    .eq('id', event.resource.id);

  if (error) {
    console.error('Error updating task idempotency_key:', error);
  }

  return { success: true, message: `Task ${event.event_type} acknowledged` };
}
