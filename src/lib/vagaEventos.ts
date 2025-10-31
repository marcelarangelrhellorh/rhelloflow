import { supabase } from "@/integrations/supabase/client";

export type TipoEvento = 
  | "ETAPA_ALTERADA"
  | "CANDIDATO_ADICIONADO" 
  | "CANDIDATO_MOVIDO"
  | "CANDIDATO_REMOVIDO"
  | "FEEDBACK_ADICIONADO";

interface LogEventoParams {
  vagaId: string;
  actorUserId?: string | null;
  tipo: TipoEvento;
  descricao: string;
  payload?: Record<string, any>;
}

export async function logVagaEvento({
  vagaId,
  actorUserId,
  tipo,
  descricao,
  payload = {}
}: LogEventoParams) {
  try {
    const { error } = await supabase.from("vaga_eventos").insert({
      vaga_id: vagaId,
      actor_user_id: actorUserId ?? null,
      tipo,
      descricao,
      payload
    });

    if (error) {
      console.error("Erro ao registrar evento da vaga:", error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error("Erro ao registrar evento da vaga:", err);
    return { error: err };
  }
}

export function getEventoIcon(tipo: TipoEvento) {
  const icons = {
    ETAPA_ALTERADA: "🔄",
    CANDIDATO_ADICIONADO: "➕",
    CANDIDATO_MOVIDO: "🔀",
    CANDIDATO_REMOVIDO: "🗑️",
    FEEDBACK_ADICIONADO: "💬"
  };
  return icons[tipo] || "📋";
}

export function getEventoColor(tipo: TipoEvento) {
  const colors = {
    ETAPA_ALTERADA: "bg-info/10 text-info",
    CANDIDATO_ADICIONADO: "bg-success/10 text-success",
    CANDIDATO_MOVIDO: "bg-primary/10 text-primary",
    CANDIDATO_REMOVIDO: "bg-destructive/10 text-destructive",
    FEEDBACK_ADICIONADO: "bg-muted text-muted-foreground"
  };
  return colors[tipo] || "bg-muted text-muted-foreground";
}
