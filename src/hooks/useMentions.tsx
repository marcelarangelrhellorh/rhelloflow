import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUsersQuery } from "./data/useUsersQuery";
import { useNotifications } from "./useNotifications";

export interface MentionUser {
  id: string;
  value: string; // Nome para exibição
  email?: string;
}

export interface MentionData {
  mentionedUserId: string;
  mentionerName: string;
  entityType: 'candidate_note' | 'empresa_note' | 'job_history';
  entityId: string;
  entityName: string;
}

export function useMentions() {
  const { users, loading } = useUsersQuery();
  const { createNotification } = useNotifications();

  // Formata usuários para o formato esperado pelo quill-mention
  const mentionUsers: MentionUser[] = users.map(user => ({
    id: user.id,
    value: user.name,
    email: user.email,
  }));

  // Extrai IDs de usuários mencionados do conteúdo HTML
  const extractMentions = useCallback((htmlContent: string): string[] => {
    const mentionIds: string[] = [];
    const regex = /data-id="([^"]+)"/g;
    let match;
    
    while ((match = regex.exec(htmlContent)) !== null) {
      if (match[1] && !mentionIds.includes(match[1])) {
        mentionIds.push(match[1]);
      }
    }
    
    return mentionIds;
  }, []);

  // Salva menções no banco e envia notificações
  const saveMentions = useCallback(async (
    mentionData: MentionData,
    mentionedUserIds: string[]
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const mentionedUserId of mentionedUserIds) {
      // Não notificar a si mesmo
      if (mentionedUserId === user.id) continue;

      // Salvar menção no banco
      await supabase.from('mentions').insert({
        mentioner_id: user.id,
        mentioned_user_id: mentionedUserId,
        entity_type: mentionData.entityType,
        entity_id: mentionData.entityId,
      });

      // Enviar notificação
      const entityLabel = mentionData.entityType === 'candidate_note' 
        ? 'candidato' 
        : mentionData.entityType === 'empresa_note'
        ? 'empresa'
        : 'vaga';

      await createNotification({
        userId: mentionedUserId,
        kind: 'mention',
        title: 'Você foi mencionado',
        body: `${mentionData.mentionerName} mencionou você em uma nota de ${entityLabel}: ${mentionData.entityName}`,
      });
    }
  }, [createNotification]);

  // Processa o conteúdo e salva menções
  const processMentions = useCallback(async (
    htmlContent: string,
    entityType: 'candidate_note' | 'empresa_note' | 'job_history',
    entityId: string,
    entityName: string,
    mentionerName: string
  ) => {
    const mentionedUserIds = extractMentions(htmlContent);
    
    if (mentionedUserIds.length > 0) {
      await saveMentions(
        { mentionedUserId: '', mentionerName, entityType, entityId, entityName },
        mentionedUserIds
      );
    }
  }, [extractMentions, saveMentions]);

  return {
    mentionUsers,
    loading,
    extractMentions,
    saveMentions,
    processMentions,
  };
}
