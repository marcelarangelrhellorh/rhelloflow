import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2, 
  Eye,
  Shield,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DeletionApproval {
  id: string;
  resource_type: string;
  resource_id: string;
  requested_by: string;
  requested_at: string;
  deletion_reason: string;
  risk_level: string;
  status: string;
  metadata: any;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  requires_mfa: boolean;
}

interface SoftDeletedItem {
  id: string;
  resource_type: 'job' | 'candidate';
  resource_id: string;
  resource_name: string;
  deleted_at: string;
  deleted_by: string;
  deleted_reason: string;
  snapshot_data: any;
}

export default function GerenciarExclusoes() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [approvals, setApprovals] = useState<DeletionApproval[]>([]);
  const [softDeletes, setSoftDeletes] = useState<SoftDeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<DeletionApproval | null>(null);
  const [selectedSoftDelete, setSelectedSoftDelete] = useState<SoftDeletedItem | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, roleLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadApprovals(), loadSoftDeletes()]);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovals = async () => {
    const { data, error } = await supabase
      .from("deletion_approvals")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error loading approvals:", error);
      toast.error("Erro ao carregar solicitações");
      return;
    }

    setApprovals(data || []);
  };

  const loadSoftDeletes = async () => {
    try {
      // Load soft-deleted jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("vagas")
        .select("id, titulo, deleted_at, deleted_by, deleted_reason")
        .not("deleted_at", "is", null)
        .eq("deletion_type", "soft")
        .order("deleted_at", { ascending: false });

      if (jobsError) throw jobsError;

      // Load soft-deleted candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidatos")
        .select("id, nome_completo, deleted_at, deleted_by, deleted_reason")
        .not("deleted_at", "is", null)
        .eq("deletion_type", "soft")
        .order("deleted_at", { ascending: false });

      if (candidatesError) throw candidatesError;

      // Transform to unified format
      const jobs: SoftDeletedItem[] = (jobsData || []).map(job => ({
        id: job.id,
        resource_type: 'job' as const,
        resource_id: job.id,
        resource_name: job.titulo,
        deleted_at: job.deleted_at!,
        deleted_by: job.deleted_by!,
        deleted_reason: job.deleted_reason || 'Não especificado',
        snapshot_data: job
      }));

      const candidates: SoftDeletedItem[] = (candidatesData || []).map(cand => ({
        id: cand.id,
        resource_type: 'candidate' as const,
        resource_id: cand.id,
        resource_name: cand.nome_completo,
        deleted_at: cand.deleted_at!,
        deleted_by: cand.deleted_by!,
        deleted_reason: cand.deleted_reason || 'Não especificado',
        snapshot_data: cand
      }));

      setSoftDeletes([...jobs, ...candidates]);
    } catch (error) {
      console.error("Error loading soft deletes:", error);
      toast.error("Erro ao carregar exclusões");
    }
  };

  const handleApprove = async (approval: DeletionApproval) => {
    setProcessing(true);
    const toastId = toast.loading("Aprovando solicitação...");

    try {
      const { error } = await supabase
        .from("deletion_approvals")
        .update({
          status: "approved",
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", approval.id);

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success("Solicitação aprovada com sucesso");
      setShowApprovalDialog(false);
      loadData();
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Error approving:", error);
      toast.error("Erro ao aprovar solicitação");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
      return;
    }

    setProcessing(true);
    const toastId = toast.loading("Rejeitando solicitação...");

    try {
      const { error } = await supabase
        .from("deletion_approvals")
        .update({
          status: "rejected",
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedApproval.id);

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success("Solicitação rejeitada");
      setShowRejectDialog(false);
      setRejectionReason("");
      loadData();
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Error rejecting:", error);
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setProcessing(false);
    }
  };

  const handleHardDelete = async (item: SoftDeletedItem) => {
    setProcessing(true);
    const toastId = toast.loading("Executando exclusão permanente...");

    try {
      // Perform hard delete
      const tableName = item.resource_type === 'job' ? 'vagas' : 'candidatos';
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', item.resource_id);

      if (deleteError) throw deleteError;

      // Update snapshot to mark as hard deleted
      const { error: updateError } = await supabase
        .from("pre_delete_snapshots")
        .update({ deletion_type: "HARD" })
        .eq("id", item.id);

      if (updateError) {
        console.warn("Warning updating snapshot:", updateError);
      }

      toast.dismiss(toastId);
      toast.success("Exclusão permanente realizada com sucesso");
      setShowHardDeleteDialog(false);
      loadData();
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Error performing hard delete:", error);
      toast.error("Erro ao realizar exclusão permanente");
    } finally {
      setProcessing(false);
    }
  };

  const getRiskBadge = (level: string) => {
    const config = {
      medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Médio" },
      high: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "Alto" },
      critical: { color: "bg-red-100 text-red-800 border-red-300", label: "Crítico" }
    };
    const { color, label } = config[level as keyof typeof config] || config.medium;
    return <Badge className={`${color} border`}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { icon: Clock, color: "bg-blue-100 text-blue-800", label: "Pendente" },
      approved: { icon: CheckCircle, color: "bg-green-100 text-green-800", label: "Aprovado" },
      rejected: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Rejeitado" }
    };
    const { icon: Icon, color, label } = config[status as keyof typeof config] || config.pending;
    return (
      <Badge className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const processedApprovals = approvals.filter(a => a.status !== 'pending');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Gerenciamento de Exclusões</h1>
        <p className="text-muted-foreground">
          Aprovar solicitações de exclusão e gerenciar exclusões permanentes
        </p>
      </div>

      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="approvals">
            <Shield className="h-4 w-4 mr-2" />
            Solicitações de Aprovação
            {pendingApprovals.length > 0 && (
              <Badge className="ml-2 bg-red-500">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="soft-deletes">
            <Trash2 className="h-4 w-4 mr-2" />
            Exclusões Temporárias
            {softDeletes.length > 0 && (
              <Badge className="ml-2">{softDeletes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Solicitações Pendentes ({pendingApprovals.length})
              </CardTitle>
              <CardDescription>
                Solicitações de exclusão aguardando aprovação de administrador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingApprovals.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Não há solicitações pendentes no momento
                  </AlertDescription>
                </Alert>
              ) : (
                pendingApprovals.map((approval) => (
                  <Card key={approval.id} className="border-2 border-orange-200">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {approval.resource_type === 'job' ? 'Vaga' : 'Candidato'}
                            </Badge>
                            {getRiskBadge(approval.risk_level)}
                            {approval.requires_mfa && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Shield className="h-3 w-3 mr-1" />
                                MFA Requerido
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg">
                            {approval.metadata?.resource_name || 'Recurso'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            <strong>Motivo:</strong> {approval.deletion_reason}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Solicitado em {new Date(approval.requested_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApproval(approval);
                              setShowRejectDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedApproval(approval);
                              setShowApprovalDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Processed Approvals */}
          {processedApprovals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Solicitações</CardTitle>
                <CardDescription>
                  Solicitações já processadas (aprovadas ou rejeitadas)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {processedApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {approval.resource_type === 'job' ? 'Vaga' : 'Candidato'}
                        </Badge>
                        {getStatusBadge(approval.status)}
                      </div>
                      <p className="text-sm font-medium">
                        {approval.metadata?.resource_name || 'Recurso'}
                      </p>
                      {approval.rejection_reason && (
                        <p className="text-xs text-muted-foreground">
                          Motivo da rejeição: {approval.rejection_reason}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(approval.approved_at || approval.requested_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="soft-deletes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-orange-500" />
                Exclusões Temporárias ({softDeletes.length})
              </CardTitle>
              <CardDescription>
                Recursos marcados para exclusão que podem ser promovidos para exclusão permanente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {softDeletes.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Não há exclusões temporárias no momento
                  </AlertDescription>
                </Alert>
              ) : (
                softDeletes.map((item) => (
                  <Card key={item.id} className="border-2 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {item.resource_type === 'job' ? 'Vaga' : 'Candidato'}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              Exclusão Temporária
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{item.resource_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            <strong>Motivo:</strong> {item.deleted_reason}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Excluído em {new Date(item.deleted_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Show snapshot details
                              toast.info("Visualização de snapshot em desenvolvimento");
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Dados
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedSoftDelete(item);
                              setShowHardDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir Permanentemente
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aprovar Solicitação de Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a aprovar a exclusão de{" "}
              <strong>{selectedApproval?.metadata?.resource_name}</strong>.
              <br />
              <br />
              Esta ação permitirá que a exclusão seja executada. O recurso será marcado como
              excluído mas os dados permanecerão no banco para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedApproval && handleApprove(selectedApproval)}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rejeitar Solicitação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição desta solicitação de exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Ex: Dados ainda estão sendo utilizados em relatórios ativos"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Dialog */}
      <AlertDialog open={showHardDeleteDialog} onOpenChange={setShowHardDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Exclusão Permanente
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-red-600">ATENÇÃO: Esta ação é irreversível!</strong>
              <br />
              <br />
              Você está prestes a excluir permanentemente{" "}
              <strong>{selectedSoftDelete?.resource_name}</strong>.
              <br />
              <br />
              Os dados serão removidos completamente do banco de dados. Apenas o snapshot será
              mantido para fins de auditoria.
              <br />
              <br />
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSoftDelete && handleHardDelete(selectedSoftDelete)}
              disabled={processing}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Exclusão Permanente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
