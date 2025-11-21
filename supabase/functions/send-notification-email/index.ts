import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  user_id: string;
  kind: string;
  title: string;
  body?: string;
  job_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!resendApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error("Missing configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { user_id, kind, title, body, job_id }: NotificationEmailRequest = await req.json();

    console.log("Sending notification email to user:", user_id);

    // Buscar informações do usuário e seu email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw profileError;
    }

    // Buscar email do auth.users
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id);

    if (userError || !user?.email) {
      console.error("Error fetching user email:", userError);
      throw new Error("User email not found");
    }

    // Buscar informações da vaga se houver job_id
    let jobInfo = "";
    if (job_id) {
      const { data: job } = await supabase
        .from("vagas")
        .select("titulo, empresa")
        .eq("id", job_id)
        .single();

      if (job) {
        jobInfo = `<p style="margin: 10px 0; color: #36404A;"><strong>Vaga:</strong> ${job.titulo} - ${job.empresa}</p>`;
      }
    }

    // Enviar email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "rhello <onboarding@resend.dev>",
        to: [user.email],
        subject: `[rhello] ${title}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FFFBF0;">
              <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background-color: #FFCD00; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #00141D; font-size: 24px; font-weight: bold;">rhello</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <p style="margin: 0 0 10px; color: #36404A; font-size: 14px;">Olá, ${profile.full_name}!</p>
                  
                  <h2 style="margin: 20px 0 15px; color: #00141D; font-size: 20px; font-weight: bold;">${title}</h2>
                  
                  ${body ? `<p style="margin: 15px 0; color: #36404A; font-size: 14px; line-height: 1.6;">${body}</p>` : ""}
                  
                  ${jobInfo}
                  
                  <div style="margin-top: 30px; padding: 15px; background-color: #FFFDF6; border-left: 4px solid #FFCD00; border-radius: 4px;">
                    <p style="margin: 0; color: #36404A; font-size: 13px;">
                      Acesse o sistema rhello para ver mais detalhes e tomar as ações necessárias.
                    </p>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="padding: 20px 30px; background-color: #00141D; text-align: center;">
                  <p style="margin: 0; color: #FFFDF6; font-size: 12px;">
                    © ${new Date().getFullYear()} rhello. Todos os direitos reservados.
                  </p>
                  <p style="margin: 10px 0 0; color: #FFFDF6; font-size: 11px; opacity: 0.7;">
                    Este é um e-mail automático, por favor não responda.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Error from Resend:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
