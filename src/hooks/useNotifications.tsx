import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreateNotificationParams {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  jobId?: string;
}

interface CreateNotificationsForUsersParams {
  userIds: string[];
  kind: string;
  title: string;
  body?: string;
  jobId?: string;
}

/**
 * Hook for creating and managing notifications
 */
export const useNotifications = () => {
  /**
   * Create a notification for a single user
   */
  const createNotification = async ({
    userId,
    kind,
    title,
    body,
    jobId,
  }: CreateNotificationParams): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_kind: kind,
        p_title: title,
        p_body: body || null,
        p_job_id: jobId || null,
      });

      if (error) throw error;

      // Enviar email em background (não aguarda para não bloquear)
      supabase.functions.invoke('send-notification-email', {
        body: {
          user_id: userId,
          kind,
          title,
          body,
          job_id: jobId,
        },
      }).catch((emailError) => {
        console.warn('Failed to send notification email:', emailError);
        // Não mostra erro ao usuário, pois a notificação foi criada com sucesso
      });

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a notificação",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Create notifications for multiple users at once
   */
  const createNotificationsForUsers = async ({
    userIds,
    kind,
    title,
    body,
    jobId,
  }: CreateNotificationsForUsersParams): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('create_notifications_for_users', {
        p_user_ids: userIds,
        p_kind: kind,
        p_title: title,
        p_body: body || null,
        p_job_id: jobId || null,
      });

      if (error) throw error;

      // Enviar emails em background para todos os usuários
      userIds.forEach((userId) => {
        supabase.functions.invoke('send-notification-email', {
          body: {
            user_id: userId,
            kind,
            title,
            body,
            job_id: jobId,
          },
        }).catch((emailError) => {
          console.warn(`Failed to send notification email to user ${userId}:`, emailError);
        });
      });

      return data || 0;
    } catch (error) {
      console.error('Error creating notifications:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar as notificações",
        variant: "destructive",
      });
      return 0;
    }
  };

  /**
   * Notify job team (recruiter + CS) about an event
   */
  const notifyJobTeam = async (
    jobId: string,
    kind: string,
    title: string,
    body?: string
  ): Promise<number> => {
    try {
      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('vagas')
        .select('recrutador_id, cs_id')
        .eq('id', jobId)
        .is('deleted_at', null)
        .single();

      if (jobError) throw jobError;

      const userIds: string[] = [];
      if (job.recrutador_id) userIds.push(job.recrutador_id);
      if (job.cs_id && job.cs_id !== job.recrutador_id) userIds.push(job.cs_id);

      if (userIds.length === 0) return 0;

      return await createNotificationsForUsers({
        userIds,
        kind,
        title,
        body,
        jobId,
      });
    } catch (error) {
      console.error('Error notifying job team:', error);
      return 0;
    }
  };

  /**
   * Notify about new candidate added to job
   */
  const notifyNewCandidate = async (
    jobId: string,
    candidateName: string,
    jobTitle: string
  ) => {
    return await notifyJobTeam(
      jobId,
      'candidato',
      'Novo candidato adicionado',
      `${candidateName} foi adicionado à vaga ${jobTitle}`
    );
  };

  /**
   * Notify about candidate status change
   */
  const notifyCandidateStatusChange = async (
    jobId: string,
    candidateName: string,
    newStatus: string
  ) => {
    return await notifyJobTeam(
      jobId,
      'candidato',
      'Status de candidato atualizado',
      `${candidateName} mudou para: ${newStatus}`
    );
  };

  /**
   * Notify about new feedback
   */
  const notifyNewFeedback = async (
    jobId: string,
    candidateName: string,
    feedbackType: string
  ) => {
    return await notifyJobTeam(
      jobId,
      'feedback',
      'Novo feedback adicionado',
      `Feedback ${feedbackType} adicionado para ${candidateName}`
    );
  };

  return {
    createNotification,
    createNotificationsForUsers,
    notifyJobTeam,
    notifyNewCandidate,
    notifyCandidateStatusChange,
    notifyNewFeedback,
  };
};

/**
 * Notification kinds reference:
 * - 'vaga': Job-related notifications
 * - 'candidato': Candidate-related notifications
 * - 'feedback': Feedback notifications
 * - 'candidatura_externa': External application via share link
 * - 'etapa_vaga': Job stage change
 * - 'sistema': System notifications
 * - 'stage_age_threshold': Stage age alerts
 * - 'no_activity': No activity alerts
 */
