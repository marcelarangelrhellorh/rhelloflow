import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreVertical, Edit, Trash2, AlertTriangle, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { calculateProgress } from "@/lib/jobStages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleDelete as performDeletion } from "@/lib/deletionUtils";
import { useUserRole } from "@/hooks/useUserRole";
interface VagaCardProps {
  vaga: {
    id: string;
    titulo: string;
    empresa: string;
    recrutador: string | null;
    recrutador_id?: string | null;
    status: string;
    criado_em: string | null;
    data_abertura?: string | null;
    candidatos_count?: number;
    salario_min?: number | null;
    salario_max?: number | null;
    salario_modalidade?: string | null;
    confidencial?: boolean | null;
  };
  draggable?: boolean;
  onDragStart?: () => void;
  onClick?: () => void;
  viewMode?: "grid" | "list";
}

// Função para obter iniciais do nome
const getInitials = (name: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

// Função para obter cor do badge de status
const getStatusBadgeColor = (status: string): {
  bg: string;
  text: string;
} => {
  if (status === "Concluído") return {
    bg: "#D9F99D",
    text: "#00141D"
  };
  if (status === "Cancelada") return {
    bg: "#FECACA",
    text: "#00141D"
  };
  if (status === "A iniciar") return {
    bg: "#BBF7D0",
    text: "#00141D"
  };
  if (status.includes("Urgente")) return {
    bg: "#FCA5A5",
    text: "#00141D"
  };
  return {
    bg: "#FAEC3E",
    text: "#00141D"
  };
};
export const VagaCard = React.memo(function VagaCard({
  vaga,
  draggable = false,
  onDragStart,
  onClick,
  viewMode = "grid"
}: VagaCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    isAdmin
  } = useUserRole();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [recrutadorName, setRecrutadorName] = useState<string | null>(vaga.recrutador);
  const progress = calculateProgress(vaga.status);
  const daysOpen = getBusinessDaysFromNow(vaga.data_abertura || vaga.criado_em);
  const statusColors = getStatusBadgeColor(vaga.status);
  useEffect(() => {
    if (vaga.recrutador_id && !vaga.recrutador) {
      loadRecrutadorName();
    }
  }, [vaga.recrutador_id]);
  const loadRecrutadorName = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('users').select('name').eq('id', vaga.recrutador_id).single();
      if (error) throw error;
      if (data) {
        setRecrutadorName(data.name);
      }
    } catch (error) {
      console.error('Erro ao carregar nome do recrutador:', error);
    }
  };
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/vagas/${vaga.id}`);
    }
  };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/vagas/${vaga.id}/editar`);
  };
  const handleDelete = async () => {
    if (!isAdmin && !deletionReason.trim()) {
      toast.error("❌ Por favor, informe o motivo da exclusão");
      return;
    }
    setIsDeleting(true);
    try {
      const preSnapshot = {
        id: vaga.id,
        titulo: vaga.titulo,
        empresa: vaga.empresa,
        recrutador: recrutadorName,
        status: vaga.status,
        candidatos_count: vaga.candidatos_count || 0,
        salario_min: vaga.salario_min,
        salario_max: vaga.salario_max
      };
      const result = await performDeletion("job", vaga.id, vaga.titulo, deletionReason.trim() || (isAdmin ? "Exclusão por admin sem motivo especificado" : ""), preSnapshot);
      if (!result.success) {
        toast.error(`❌ ${result.error || "Erro ao excluir a vaga"}`);
        return;
      }
      if (result.requiresApproval) {
        setRequiresApproval(true);
        toast.info("⚠️ Esta vaga possui candidatos ativos. Solicitação de exclusão enviada para aprovação de admin.", {
          duration: 5000
        });
        setShowDeleteDialog(false);
        return;
      }
      toast.success("✅ Vaga excluída com sucesso");
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['vagas'] });
    } catch (error) {
      console.error("Erro ao excluir vaga:", error);
      toast.error("❌ Erro ao excluir a vaga. Tente novamente.");
    } finally {
      setIsDeleting(false);
      if (!requiresApproval) {
        setShowDeleteDialog(false);
      }
    }
  };
  return <>
      <Card 
        draggable={draggable} 
        onDragStart={onDragStart} 
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className="relative cursor-pointer bg-white border border-gray-200 overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        role="article"
        tabIndex={0}
        aria-label={`Vaga: ${vaga.titulo} - ${vaga.empresa} - Status: ${vaga.status}`}
      >
        <CardContent className={viewMode === "list" ? "p-4" : "p-5 space-y-4"}>
          {viewMode === "list" ? (
            // Layout horizontal compacto para visualização em lista
            <div className="flex items-center gap-4">
              {/* Coluna 1: Título e Status */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-[#00141D] leading-tight line-clamp-1 flex-1">
                    {vaga.titulo}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 shrink-0 text-[#36404A] hover:text-[#00141D]"
                        aria-label={`Menu de ações da vaga ${vaga.titulo}`}
                        aria-haspopup="menu"
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white">
                      <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar vaga
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }} className="text-destructive cursor-pointer">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir vaga
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border font-semibold rounded-md px-2 py-0.5 text-xs" style={{
                    backgroundColor: statusColors.bg,
                    color: statusColors.text,
                    borderColor: statusColors.bg
                  }}>
                    {vaga.status}
                  </Badge>
                  {vaga.confidencial && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 border font-semibold rounded-md px-2 py-0.5 text-xs flex items-center gap-1">
                      <EyeOff className="h-3 w-3" />
                      Confidencial
                    </Badge>
                  )}
                </div>
              </div>

              {/* Coluna 2: Cliente e Recrutador */}
              <div className="flex gap-6">
                <div className="space-y-0.5">
                  <p className="text-[#36404A] text-xs font-semibold">Cliente</p>
                  <p className="text-sm font-semibold text-[#00141D] line-clamp-1 max-w-[150px]">{vaga.empresa}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[#36404A] text-xs font-semibold">Recrutador</p>
                  <p className="text-sm font-semibold text-[#00141D] line-clamp-1 max-w-[150px]">
                    {recrutadorName || "Não atribuído"}
                  </p>
                </div>
              </div>

              {/* Coluna 3: Progresso */}
              <div className="w-[200px] space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[#36404A] font-semibold text-xs">Progresso</p>
                  <p className="font-bold text-[#00141D] text-xs">{progress}%</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-300" style={{
                    width: `${progress}%`,
                    backgroundColor: "#FFCD00"
                  }} />
                </div>
              </div>

              {/* Coluna 4: Métricas */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-[#00141D]">{vaga.candidatos_count || 0}</p>
                  <p className="text-[#36404A] text-xs font-semibold">Candidatos</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#00141D]">{daysOpen}</p>
                  <p className="text-[#36404A] text-xs font-semibold">Dias</p>
                </div>
              </div>

              {/* Avatar do recrutador */}
              {recrutadorName && (
                <div className="flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shrink-0" style={{
                  backgroundColor: "#00141D",
                  color: "#FFFFFF"
                }} title={recrutadorName}>
                  {getInitials(recrutadorName)}
                </div>
              )}
            </div>
          ) : (
            // Layout vertical para visualização em grid (mantido original)
            <>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-[#00141D] leading-tight flex-1 line-clamp-2">
                    {vaga.titulo}
                  </h3>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-[#36404A] hover:text-[#00141D]">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white">
                      <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar vaga
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }} className="text-destructive cursor-pointer">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir vaga
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border font-semibold rounded-md px-2 py-1 text-sm" style={{
                    backgroundColor: statusColors.bg,
                    color: statusColors.text,
                    borderColor: statusColors.bg
                  }}>
                    {vaga.status}
                  </Badge>
                  
                  {vaga.confidencial && <Badge className="bg-orange-100 text-orange-700 border-orange-200 border font-semibold rounded-md px-2 py-1 text-sm flex items-center gap-1">
                      <EyeOff className="h-3.5 w-3.5" />
                      Confidencial
                    </Badge>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[#36404A] text-base font-semibold">Cliente</p>
                  <p className="text-sm font-semibold text-[#00141D] line-clamp-1">{vaga.empresa}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#36404A] text-base font-semibold">Recrutador</p>
                  <p className="text-sm font-semibold text-[#00141D] line-clamp-1">
                    {recrutadorName || "Não atribuído"}
                  </p>
                </div>
              </div>

              {(vaga.salario_min || vaga.salario_max) && <div className="space-y-1">
                  <p className="text-[#36404A] text-base font-semibold">Faixa Salarial</p>
                  <p className="text-sm font-semibold text-[#00141D]">
                    {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
                  </p>
                </div>}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[#36404A] font-semibold text-sm">Progresso do Pipeline</p>
                  <p className="font-bold text-[#00141D] text-sm">{progress}%</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-300" style={{
                    width: `${progress}%`,
                    backgroundColor: "#FFCD00"
                  }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-bold text-[#00141D]">{vaga.candidatos_count || 0}</p>
                    <p className="text-[#36404A] text-sm font-semibold">Total de Candidatos</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-bold text-[#00141D]">{daysOpen}</p>
                    <p className="text-[#36404A] text-sm font-semibold">Dias em Aberto</p>
                  </div>
                </div>

                {recrutadorName && <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm" style={{
                  backgroundColor: "#00141D",
                  color: "#FFFFFF"
                }} title={recrutadorName}>
                    {getInitials(recrutadorName)}
                  </div>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={() => {
      setShowDeleteDialog(false);
      setDeletionReason("");
      setRequiresApproval(false);
    }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {requiresApproval ? <>
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Solicitação Enviada
                </> : <>
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Confirmar Exclusão
                </>}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {requiresApproval ? "Sua solicitação de exclusão foi enviada para aprovação de um administrador." : <>
                  Tem certeza que deseja excluir a vaga <strong>{vaga.titulo}</strong>?
                  {!isAdmin && " Informe o motivo da exclusão:"}
                </>}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!requiresApproval && !isAdmin && <div className="space-y-2">
              <Label htmlFor="deletion-reason">Motivo da exclusão</Label>
              <Input id="deletion-reason" value={deletionReason} onChange={e => setDeletionReason(e.target.value)} placeholder="Ex: Vaga foi cancelada pelo cliente" className="w-full" />
            </div>}

          <AlertDialogFooter>
            {requiresApproval ? <AlertDialogAction onClick={() => {
            setShowDeleteDialog(false);
            setRequiresApproval(false);
          }}>
                Entendi
              </AlertDialogAction> : <>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
});