import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaleJob {
  id: string;
  titulo: string;
  status_slug: string;
  recrutador_id: string;
  last_status_change_at: string;
  recrutador_name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[check-stale-jobs] Starting stale jobs check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 5 business days ago
    // Simple approach: 7 calendar days covers 5 business days in most cases
    const fiveBusinessDaysAgo = new Date();
    fiveBusinessDaysAgo.setDate(fiveBusinessDaysAgo.getDate() - 7);

    console.log(`[check-stale-jobs] Looking for jobs not updated since: ${fiveBusinessDaysAgo.toISOString()}`);

    // Find jobs that haven't changed status in 5+ business days
    // Exclude completed, cancelled, or frozen jobs
    const { data: staleJobs, error: jobsError } = await supabase
      .from("vagas")
      .select(`
        id,
        titulo,
        status_slug,
        recrutador_id,
        last_status_change_at,
        profiles!vagas_recrutador_id_fkey(full_name)
      `)
      .is("deleted_at", null)
      .not("status_slug", "in", "(concluida,cancelada,congelada)")
      .not("recrutador_id", "is", null)
      .lt("last_status_change_at", fiveBusinessDaysAgo.toISOString());

    if (jobsError) {
      console.error("[check-stale-jobs] Error fetching stale jobs:", jobsError);
      throw jobsError;
    }

    console.log(`[check-stale-jobs] Found ${staleJobs?.length || 0} stale jobs`);

    if (!staleJobs || staleJobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No stale jobs found",
          notificationsCreated: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsCreated = 0;

    for (const job of staleJobs) {
      // Check if we already notified for this job + stage combination
      const { data: existingNotification } = await supabase
        .from("job_stage_notifications")
        .select("id")
        .eq("job_id", job.id)
        .eq("stage_slug", job.status_slug)
        .single();

      if (existingNotification) {
        console.log(`[check-stale-jobs] Already notified for job ${job.id} in stage ${job.status_slug}, skipping`);
        continue;
      }

      // Calculate days since last update
      const lastChange = new Date(job.last_status_change_at);
      const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));

      // Create notification for recruiter
      const { error: notifyError } = await supabase.rpc("create_notification", {
        p_user_id: job.recrutador_id,
        p_kind: "vaga_parada",
        p_title: `Vaga parada há ${daysSinceChange} dias`,
        p_body: `A vaga "${job.titulo}" está há ${daysSinceChange} dias na etapa "${job.status_slug}". Verifique se há atualizações.`,
        p_job_id: job.id,
      });

      if (notifyError) {
        console.error(`[check-stale-jobs] Error creating notification for job ${job.id}:`, notifyError);
        continue;
      }

      // Record that we notified for this job + stage
      const { error: recordError } = await supabase
        .from("job_stage_notifications")
        .insert({
          job_id: job.id,
          stage_slug: job.status_slug,
          user_id: job.recrutador_id,
        });

      if (recordError) {
        console.error(`[check-stale-jobs] Error recording notification for job ${job.id}:`, recordError);
      } else {
        notificationsCreated++;
        console.log(`[check-stale-jobs] Created notification for job ${job.id} (${job.titulo})`);
      }
    }

    console.log(`[check-stale-jobs] Completed. Created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${staleJobs.length} stale jobs`,
        notificationsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[check-stale-jobs] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
