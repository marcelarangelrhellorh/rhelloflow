import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "ROLE_ASSIGN"
  | "ROLE_REVOKE"
  | "ADMIN_PRIV_CHANGE"
  | "CANDIDATE_VIEW"
  | "CANDIDATE_EXPORT"
  | "CANDIDATE_CREATE"
  | "CANDIDATE_UPDATE"
  | "CANDIDATE_DELETE"
  | "CANDIDATE_SOFT_DELETE"
  | "CANDIDATE_HARD_DELETE"
  | "CANDIDATE_IMPORT_XLS"
  | "FILE_DOWNLOAD"
  | "JOB_CREATE"
  | "JOB_UPDATE"
  | "JOB_DELETE"
  | "JOB_SOFT_DELETE"
  | "JOB_HARD_DELETE"
  | "FEEDBACK_CREATE"
  | "FEEDBACK_UPDATE"
  | "FEEDBACK_DELETE"
  | "FEEDBACK_SOFT_DELETE"
  | "FEEDBACK_HARD_DELETE"
  | "DELETE_ATTEMPT_DENIED"
  | "DELETE_APPROVAL_REQUEST"
  | "DELETE_APPROVAL_GRANTED"
  | "DELETE_APPROVAL_REJECTED"
  | "GDPR_ERASURE_REQUEST"
  | "GDPR_ERASURE_COMPLETE"
  | "RECORD_REDACTED";

export interface AuditActor {
  id: string;
  type: "user" | "system" | "anonymous";
  display_name: string;
  auth_method?: string;
}

export interface AuditResource {
  type: string;
  id?: string;
  path?: string;
}

export interface AuditClient {
  ip?: string;
  user_agent: string;
}

export interface LogAuditEventParams {
  action: AuditAction;
  resource: AuditResource;
  payload?: Record<string, any>;
  correlationId?: string;
}

/**
 * Get client metadata (IP and user agent)
 */
function getClientMetadata(): AuditClient {
  return {
    user_agent: navigator.userAgent,
    // Note: IP will be captured server-side for accuracy
  };
}

/**
 * Get current actor information
 */
async function getCurrentActor(): Promise<AuditActor> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      id: "anonymous",
      type: "anonymous",
      display_name: "Anonymous User",
    };
  }

  // Try to get user profile for display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    type: "user",
    display_name: profile?.full_name || user.email || "Unknown User",
    auth_method: user.app_metadata.provider || "email",
  };
}

/**
 * Log an audit event
 */
export async function logAuditEvent({
  action,
  resource,
  payload,
  correlationId,
}: LogAuditEventParams): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await getCurrentActor();
    const client = getClientMetadata();

    const { error } = await supabase.rpc("log_audit_event", {
      p_actor: actor as any,
      p_action: action,
      p_resource: resource as any,
      p_correlation_id: correlationId || null,
      p_payload: payload || null,
      p_client: client as any,
    });

    if (error) {
      console.error("Failed to log audit event:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to log audit event:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Log authentication success
 */
export async function logLoginSuccess(userId: string, email: string) {
  return logAuditEvent({
    action: "LOGIN_SUCCESS",
    resource: { type: "auth", id: userId, path: "/login" },
    payload: { email },
  });
}

/**
 * Log authentication failure
 */
export async function logLoginFailure(email: string, reason: string) {
  return logAuditEvent({
    action: "LOGIN_FAILURE",
    resource: { type: "auth", path: "/login" },
    payload: { email, reason },
  });
}

/**
 * Log logout
 */
export async function logLogout(userId: string) {
  return logAuditEvent({
    action: "LOGOUT",
    resource: { type: "auth", id: userId, path: "/logout" },
  });
}

/**
 * Log role assignment
 */
export async function logRoleAssign(
  targetUserId: string,
  targetUserName: string,
  role: string
) {
  return logAuditEvent({
    action: "ROLE_ASSIGN",
    resource: { type: "user", id: targetUserId },
    payload: {
      target_user_name: targetUserName,
      role_assigned: role,
    },
  });
}

/**
 * Log role revocation
 */
export async function logRoleRevoke(
  targetUserId: string,
  targetUserName: string,
  role: string
) {
  return logAuditEvent({
    action: "ROLE_REVOKE",
    resource: { type: "user", id: targetUserId },
    payload: {
      target_user_name: targetUserName,
      role_revoked: role,
    },
  });
}

/**
 * Log candidate view access
 */
export async function logCandidateView(candidateId: string, candidateName: string) {
  return logAuditEvent({
    action: "CANDIDATE_VIEW",
    resource: { type: "candidate", id: candidateId },
    payload: { candidate_name: candidateName },
  });
}

/**
 * Log candidate data export
 */
export async function logCandidateExport(candidateIds: string[], exportType: string) {
  return logAuditEvent({
    action: "CANDIDATE_EXPORT",
    resource: { type: "candidate", path: "/export" },
    payload: {
      candidate_ids: candidateIds,
      export_type: exportType,
      count: candidateIds.length,
    },
  });
}

/**
 * Log candidate XLS import
 */
export async function logCandidateImport(
  fileName: string,
  sourceType: 'vaga' | 'banco_talentos',
  vagaId: string | undefined,
  successCount: number,
  errorCount: number,
  totalProcessed: number
) {
  return logAuditEvent({
    action: "CANDIDATE_IMPORT_XLS",
    resource: { 
      type: "candidate", 
      path: "/import",
      ...(vagaId && { id: vagaId })
    },
    payload: {
      file_name: fileName,
      source_type: sourceType,
      vaga_id: vagaId || null,
      total_processed: totalProcessed,
      success_count: successCount,
      error_count: errorCount,
      success_rate: totalProcessed > 0 ? ((successCount / totalProcessed) * 100).toFixed(2) + '%' : '0%',
    },
  });
}

/**
 * Log job create/update/delete
 */
export async function logJobChange(
  action: "JOB_CREATE" | "JOB_UPDATE" | "JOB_DELETE",
  jobId: string,
  jobTitle: string,
  changes?: { before?: any; after?: any }
) {
  return logAuditEvent({
    action,
    resource: { type: "job", id: jobId },
    payload: {
      job_title: jobTitle,
      ...changes,
    },
  });
}

/**
 * Log GDPR erasure request
 */
export async function logGDPRErasure(
  resourceType: string,
  resourceId: string,
  reason: string
) {
  return logAuditEvent({
    action: "GDPR_ERASURE_REQUEST",
    resource: { type: resourceType, id: resourceId },
    payload: { reason },
  });
}

/**
 * Log soft-delete operation
 */
export async function logSoftDelete(
  resourceType: "candidate" | "job" | "feedback",
  resourceId: string,
  resourceName: string,
  reason: string,
  preSnapshot: Record<string, any>,
  correlationId?: string
) {
  const actionMap = {
    candidate: "CANDIDATE_SOFT_DELETE" as const,
    job: "JOB_SOFT_DELETE" as const,
    feedback: "FEEDBACK_SOFT_DELETE" as const,
  };

  return logAuditEvent({
    action: actionMap[resourceType],
    resource: { type: resourceType, id: resourceId },
    payload: {
      resource_name: resourceName,
      deletion_type: "SOFT",
      deletion_reason: reason,
      pre_snapshot: preSnapshot,
      recoverable: true,
    },
    correlationId,
  });
}

/**
 * Log hard-delete operation (irreversible)
 */
export async function logHardDelete(
  resourceType: "candidate" | "job" | "feedback",
  resourceId: string,
  resourceName: string,
  reason: string,
  approvalId: string | null,
  preSnapshot: Record<string, any>,
  correlationId?: string
) {
  const actionMap = {
    candidate: "CANDIDATE_HARD_DELETE" as const,
    job: "JOB_HARD_DELETE" as const,
    feedback: "FEEDBACK_HARD_DELETE" as const,
  };

  return logAuditEvent({
    action: actionMap[resourceType],
    resource: { type: resourceType, id: resourceId },
    payload: {
      resource_name: resourceName,
      deletion_type: "HARD",
      deletion_reason: reason,
      approval_id: approvalId,
      pre_snapshot: preSnapshot,
      recoverable: false,
      irreversible: true,
    },
    correlationId,
  });
}

/**
 * Log denied deletion attempt (non-admin trying to delete)
 */
export async function logDeleteAttemptDenied(
  resourceType: "candidate" | "job" | "feedback",
  resourceId: string,
  resourceName: string,
  attemptedBy: string,
  reason: string
) {
  return logAuditEvent({
    action: "DELETE_ATTEMPT_DENIED",
    resource: { type: resourceType, id: resourceId },
    payload: {
      resource_name: resourceName,
      attempted_by: attemptedBy,
      denial_reason: reason,
      security_violation: true,
    },
  });
}

/**
 * Log deletion approval request
 */
export async function logDeleteApprovalRequest(
  resourceType: "candidate" | "job" | "feedback",
  resourceId: string,
  resourceName: string,
  requestedBy: string,
  reason: string,
  riskLevel: "medium" | "high" | "critical",
  correlationId: string
) {
  return logAuditEvent({
    action: "DELETE_APPROVAL_REQUEST",
    resource: { type: resourceType, id: resourceId },
    payload: {
      resource_name: resourceName,
      requested_by: requestedBy,
      deletion_reason: reason,
      risk_level: riskLevel,
      requires_approval: true,
    },
    correlationId,
  });
}

/**
 * Log deletion approval granted
 */
export async function logDeleteApprovalGranted(
  approvalId: string,
  resourceType: "candidate" | "job" | "feedback",
  resourceId: string,
  approvedBy: string,
  correlationId: string
) {
  return logAuditEvent({
    action: "DELETE_APPROVAL_GRANTED",
    resource: { type: "deletion_approval", id: approvalId },
    payload: {
      approval_id: approvalId,
      resource_type: resourceType,
      resource_id: resourceId,
      approved_by: approvedBy,
    },
    correlationId,
  });
}

/**
 * Log deletion approval rejected
 */
export async function logDeleteApprovalRejected(
  approvalId: string,
  resourceType: "candidate" | "job" | "feedback",
  resourceId: string,
  rejectedBy: string,
  rejectionReason: string,
  correlationId: string
) {
  return logAuditEvent({
    action: "DELETE_APPROVAL_REJECTED",
    resource: { type: "deletion_approval", id: approvalId },
    payload: {
      approval_id: approvalId,
      resource_type: resourceType,
      resource_id: resourceId,
      rejected_by: rejectedBy,
      rejection_reason: rejectionReason,
    },
    correlationId,
  });
}
