import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskEvent {
  action: "create" | "update" | "delete";
  task: {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    status?: string;
  };
  accessToken: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, task, accessToken }: TaskEvent = await req.json();

    if (!accessToken) {
      throw new Error("Token de acesso do Google não fornecido");
    }

    let calendarEventId = task.id;

    if (action === "create" || action === "update") {
      const eventBody = {
        summary: task.title,
        description: task.description || "",
        start: {
          dateTime: task.due_date
            ? new Date(task.due_date).toISOString()
            : new Date().toISOString(),
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: task.due_date
            ? new Date(
                new Date(task.due_date).getTime() + 60 * 60 * 1000
              ).toISOString()
            : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          timeZone: "America/Sao_Paulo",
        },
        status: task.status === "done" ? "cancelled" : "confirmed",
      };

      const method = action === "create" ? "POST" : "PUT";
      const url =
        action === "create"
          ? "https://www.googleapis.com/calendar/v3/calendars/primary/events"
          : `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Erro ao sincronizar com Google Calendar:", error);
        throw new Error(`Erro ao sincronizar: ${error}`);
      }

      const eventData = await response.json();
      calendarEventId = eventData.id;
    } else if (action === "delete") {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        console.error("Erro ao deletar do Google Calendar:", error);
        throw new Error(`Erro ao deletar: ${error}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        calendarEventId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro na função sync-google-calendar:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
