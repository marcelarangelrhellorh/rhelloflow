/**
 * EXEMPLOS DE USO DO SISTEMA DE NOTIFICAÇÕES
 * 
 * Este arquivo contém exemplos de como usar o sistema unificado de notificações.
 * NÃO use este arquivo diretamente - copie os exemplos para onde precisar.
 */

import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

export function NotificationExamples() {
  const {
    createNotification,
    createNotificationsForUsers,
    notifyJobTeam,
    notifyNewCandidate,
    notifyCandidateStatusChange,
    notifyNewFeedback,
  } = useNotifications();

  // ============= EXEMPLO 1: Notificar um único usuário =============
  const example1_SingleUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await createNotification({
      userId: user.id,
      kind: 'sistema',
      title: 'Bem-vindo ao Rhello!',
      body: 'Esta é sua primeira notificação',
    });
  };

  // ============= EXEMPLO 2: Notificar múltiplos usuários =============
  const example2_MultipleUsers = async () => {
    const userIds = ['uuid-1', 'uuid-2', 'uuid-3'];
    
    await createNotificationsForUsers({
      userIds,
      kind: 'vaga',
      title: 'Nova vaga disponível',
      body: 'Vaga de Desenvolvedor Full Stack foi publicada',
      jobId: 'job-uuid',
    });
  };

  // ============= EXEMPLO 3: Notificar equipe da vaga (recrutador + CS) =============
  const example3_JobTeam = async () => {
    const jobId = 'some-job-uuid';
    
    await notifyJobTeam(
      jobId,
      'feedback',
      'Ação necessária',
      'Feedback pendente para revisar'
    );
  };

  // ============= EXEMPLO 4: Novo candidato adicionado =============
  const example4_NewCandidate = async () => {
    const jobId = 'job-uuid';
    const candidateName = 'João Silva';
    const jobTitle = 'Desenvolvedor React';
    
    await notifyNewCandidate(jobId, candidateName, jobTitle);
    // Resultado: "João Silva foi adicionado à vaga Desenvolvedor React"
  };

  // ============= EXEMPLO 5: Mudança de status do candidato =============
  const example5_StatusChange = async () => {
    const jobId = 'job-uuid';
    
    await notifyCandidateStatusChange(
      jobId,
      'Maria Santos',
      'Entrevistas Solicitante'
    );
    // Resultado: "Maria Santos mudou para: Entrevistas Solicitante"
  };

  // ============= EXEMPLO 6: Novo feedback =============
  const example6_Feedback = async () => {
    const jobId = 'job-uuid';
    
    await notifyNewFeedback(
      jobId,
      'Pedro Costa',
      'técnico'
    );
    // Resultado: "Feedback técnico adicionado para Pedro Costa"
  };

  // ============= EXEMPLO 7: Notificação customizada com vínculo à vaga =============
  const example7_CustomWithJob = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await createNotification({
      userId: user.id,
      kind: 'vaga',
      title: 'Vaga atingiu prazo crítico',
      body: 'A vaga "Analista de Dados" está aberta há mais de 30 dias',
      jobId: 'job-uuid', // Ao clicar, vai para /vagas/job-uuid
    });
  };

  // ============= EXEMPLO 8: Notificar todos admins e recrutadores =============
  const example8_AllRecruiters = async () => {
    // Buscar todos os usuários com papel de admin ou recrutador
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'recrutador']);

    if (userRoles) {
      const userIds = [...new Set(userRoles.map(ur => ur.user_id))];
      
      await createNotificationsForUsers({
        userIds,
        kind: 'sistema',
        title: 'Manutenção programada',
        body: 'Sistema entrará em manutenção amanhã às 22h',
      });
    }
  };

  return null; // Este componente é apenas documentação
}

/**
 * TIPOS DE NOTIFICAÇÃO (kind):
 * 
 * - 'vaga': Relacionada a vagas
 * - 'candidato': Relacionada a candidatos
 * - 'feedback': Relacionada a feedbacks
 * - 'candidatura_externa': Candidatura via link público
 * - 'etapa_vaga': Mudança de etapa da vaga
 * - 'sistema': Notificações do sistema
 * - 'stage_age_threshold': Alertas de tempo em etapa
 * - 'no_activity': Alertas de falta de atividade
 */

/**
 * NOTIFICAÇÕES AUTOMÁTICAS JÁ IMPLEMENTADAS (via triggers):
 * 
 * 1. Candidatura via share link → Notifica recrutador + CS
 * 2. Mudança de etapa da vaga → Notifica recrutador + CS
 * 3. Vaga criada via formulário externo → Notifica admins e recrutadores
 * 
 * Essas notificações são criadas automaticamente no banco de dados,
 * não é necessário criar manualmente no código.
 */
