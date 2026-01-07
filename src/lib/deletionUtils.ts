import { supabase } from "@/integrations/supabase/client";
import {
  logSoftDelete,
  logHardDelete,
  logDeleteAttemptDenied,
  logDeleteApprovalRequest,
} from "./auditLog";

export type ResourceType = "candidate" | "job" | "feedback";
export type RiskLevel = "medium" | "high" | "critical";

/**
 * Assess deletion risk level for a resource
 */
export async function assessDeletionRisk(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ riskLevel: RiskLevel; reason: string }> {
  const { data, error } = await supabase.rpc("assess_deletion_risk", {
    p_resource_type: resourceType,
    p_resource_id: resourceId,
  });

  if (error) {
    console.error("Failed to assess deletion risk:", error);
    return { riskLevel: "medium", reason: "Unable to assess risk" };
  }

  const riskLevel = data as RiskLevel;
  const reasons: Record<RiskLevel, string> = {
    medium: "Low-risk deletion",
    high: "Resource has active dependencies",
    critical: "Resource has many active dependencies (>10)",
  };

  return { riskLevel, reason: reasons[riskLevel] };
}

/**
 * Create a pre-delete snapshot for audit trail
 */
export async function createPreDeleteSnapshot(
  resourceType: ResourceType,
  resourceId: string,
  snapshotData: Record<string, any>,
  deletionType: "SOFT" | "HARD",
  correlationId: string
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("create_pre_delete_snapshot", {
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_snapshot_data: snapshotData,
    p_deletion_type: deletionType,
    p_correlation_id: correlationId,
  });

  if (error) {
    console.error("Failed to create pre-delete snapshot:", error);
    return { success: false, error: error.message };
  }

  return { success: true, snapshotId: data };
}

/**
 * Request deletion approval for high-risk operations
 */
export async function requestDeletionApproval(
  resourceType: ResourceType,
  resourceId: string,
  reason: string,
  riskLevel: RiskLevel,
  metadata?: Record<string, any>
): Promise<{ success: boolean; approvalId?: string; error?: string }> {
  const correlationId = crypto.randomUUID();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data, error } = await supabase
    .from("deletion_approvals")
    .insert({
      resource_type: resourceType,
      resource_id: resourceId,
      requested_by: userData.user.id,
      deletion_reason: reason,
      risk_level: riskLevel,
      requires_mfa: riskLevel === "critical",
      correlation_id: correlationId,
      metadata: metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to request deletion approval:", error);
    return { success: false, error: error.message };
  }

  // Log approval request
  await logDeleteApprovalRequest(
    resourceType,
    resourceId,
    metadata?.resource_name || "Unknown",
    userData.user.email || userData.user.id,
    reason,
    riskLevel,
    correlationId
  );

  return { success: true, approvalId: data.id };
}

/**
 * Perform soft-delete operation
 */
export async function performSoftDelete(
  resourceType: ResourceType,
  resourceId: string,
  resourceName: string,
  reason: string,
  preSnapshot: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const correlationId = crypto.randomUUID();

  // Create pre-delete snapshot
  const snapshotResult = await createPreDeleteSnapshot(
    resourceType,
    resourceId,
    preSnapshot,
    "SOFT",
    correlationId
  );

  if (!snapshotResult.success) {
    return { success: false, error: "Failed to create snapshot" };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: "User not authenticated" };
  }

  // Update the record to mark as soft-deleted based on resource type
  let error;
  
  if (resourceType === "candidate") {
    const result = await supabase
      .from("candidatos")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userData.user.id,
        deleted_reason: reason,
        deletion_type: "SOFT",
      })
      .eq("id", resourceId);
    error = result.error;
  } else if (resourceType === "job") {
    const result = await supabase
      .from("vagas")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userData.user.id,
        deleted_reason: reason,
        deletion_type: "SOFT",
      })
      .eq("id", resourceId);
    error = result.error;

    // Desativar links de compartilhamento associados à vaga
    if (!error) {
      await supabase
        .from("share_links")
        .update({ active: false, deleted: true, deleted_at: new Date().toISOString(), deleted_by: userData.user.id })
        .eq("vaga_id", resourceId);

      await supabase
        .from("client_view_links")
        .update({ active: false, deleted: true, deleted_at: new Date().toISOString(), deleted_by: userData.user.id })
        .eq("vaga_id", resourceId);
    }
  } else if (resourceType === "feedback") {
    const result = await supabase
      .from("feedbacks")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userData.user.id,
        deleted_reason: reason,
        deletion_type: "SOFT",
      })
      .eq("id", resourceId);
    error = result.error;
  }

  if (error) {
    console.error("Failed to soft-delete:", error);
    return { success: false, error: error.message };
  }

  // Log soft-delete event
  await logSoftDelete(
    resourceType,
    resourceId,
    resourceName,
    reason,
    preSnapshot,
    correlationId
  );

  return { success: true };
}

/**
 * Perform hard-delete operation (requires approval)
 */
export async function performHardDelete(
  resourceType: ResourceType,
  resourceId: string,
  resourceName: string,
  reason: string,
  approvalId: string,
  preSnapshot: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const correlationId = crypto.randomUUID();

  // Verify approval exists and is approved
  const { data: approval, error: approvalError } = await supabase
    .from("deletion_approvals")
    .select("*")
    .eq("id", approvalId)
    .eq("status", "approved")
    .single();

  if (approvalError || !approval) {
    return { success: false, error: "Valid approval required for hard-delete" };
  }

  // Create pre-delete snapshot
  const snapshotResult = await createPreDeleteSnapshot(
    resourceType,
    resourceId,
    preSnapshot,
    "HARD",
    correlationId
  );

  if (!snapshotResult.success) {
    return { success: false, error: "Failed to create snapshot" };
  }

  // Perform actual DELETE operation based on resource type (only admins can do this via RLS)
  let error;
  
  if (resourceType === "candidate") {
    const result = await supabase.from("candidatos").delete().eq("id", resourceId);
    error = result.error;
  } else if (resourceType === "job") {
    const result = await supabase.from("vagas").delete().eq("id", resourceId);
    error = result.error;
  } else if (resourceType === "feedback") {
    const result = await supabase.from("feedbacks").delete().eq("id", resourceId);
    error = result.error;
  }

  if (error) {
    console.error("Failed to hard-delete:", error);
    return { success: false, error: error.message };
  }

  // Log hard-delete event
  await logHardDelete(
    resourceType,
    resourceId,
    resourceName,
    reason,
    approvalId,
    preSnapshot,
    correlationId
  );

  return { success: true };
}

/**
 * Check if current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .single();

  return !error && !!data;
}

/**
 * Handle deletion with automatic risk assessment and workflow
 */
export async function handleDelete(
  resourceType: ResourceType,
  resourceId: string,
  resourceName: string,
  reason: string,
  preSnapshot: Record<string, any>
): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  approvalId?: string;
  error?: string;
}> {
  // Check if user is admin
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    // Log denied attempt
    const { data: userData } = await supabase.auth.getUser();
    await logDeleteAttemptDenied(
      resourceType,
      resourceId,
      resourceName,
      userData.user?.email || "unknown",
      "Non-admin user attempted deletion"
    );
    return { success: false, error: "Only admins can delete resources" };
  }

  // Verificar se já existe solicitação pendente para este recurso
  const { data: existingApproval } = await supabase
    .from("deletion_approvals")
    .select("id, status")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingApproval) {
    return {
      success: false,
      error: "Já existe uma solicitação de exclusão pendente para este recurso",
    };
  }

  // Assess deletion risk (apenas para logging, admins podem excluir diretamente)
  const { riskLevel } = await assessDeletionRisk(resourceType, resourceId);
  
  console.log(`Deletion risk for ${resourceType} ${resourceId}: ${riskLevel}`);

  // Admins podem executar soft-delete diretamente, independente do risco
  // Não há mais workflow de aprovação - se é admin, pode excluir

  // Low/medium risk: proceed with soft-delete
  const deleteResult = await performSoftDelete(
    resourceType,
    resourceId,
    resourceName,
    reason,
    preSnapshot
  );

  return deleteResult;
}
