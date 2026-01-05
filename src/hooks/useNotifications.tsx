import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { handleApiError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";

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
        logger.warn('Failed to send notification email:', emailError);
        // Não mostra erro ao usuário, pois a notificação foi criada com sucesso
      });

      return data;
    } catch (error) {
      handleApiError(error, { context: 'ao criar notificação' });
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
          logger.warn(`Failed to send notification email to user ${userId}:`, emailError);
        });
      });

      return data || 0;
    } catch (error) {
      handleApiError(error, { context: 'ao criar notificações' });
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
      logger.error('Error notifying job team:', error);
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

  /**
   * Notify external clients about a new candidate in Shortlist
   */
  const notifyClientsAboutShortlist = async (
    candidatoName: string,
    vagaId: string,
    vagaTitulo: string
  ): Promise<number> => {
    try {
      // Get empresa_id from job
      const { data: vaga, error: vagaError } = await supabase
        .from('vagas')
        .select('empresa_id')
        .eq('id', vagaId)
        .single();

      if (vagaError || !vaga?.empresa_id) {
        logger.warn('No empresa_id found for job:', vagaId);
        return 0;
      }

      // Get external clients linked to this empresa
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('empresa_id', vaga.empresa_id)
        .eq('user_type', 'external');

      if (clientsError) throw clientsError;
      if (!clients?.length) {
        logger.info('No external clients found for empresa:', vaga.empresa_id);
        return 0;
      }

      const clientIds = clients.map(c => c.id);
      return await createNotificationsForUsers({
        userIds: clientIds,
        kind: 'shortlist',
        title: 'Novo candidato em Shortlist',
        body: `${candidatoName} foi adicionado à shortlist da vaga ${vagaTitulo}`,
        jobId: vagaId,
      });
    } catch (error) {
      logger.error('Error notifying clients about shortlist:', error);
      return 0;
    }
  };

  return {
    createNotification,
    createNotificationsForUsers,
    notifyJobTeam,
    notifyNewCandidate,
    notifyCandidateStatusChange,
    notifyNewFeedback,
    notifyClientsAboutShortlist,
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
