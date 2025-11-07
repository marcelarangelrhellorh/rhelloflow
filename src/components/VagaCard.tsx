import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Briefcase, User, MoreVertical, Users, Calendar, Edit, Trash2, AlertTriangle, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
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
const statusProgressMap: Record<string, number> = {
  "A iniciar": 10,
  "Discovery": 20,
  "Triagem": 25,
  "Entrevistas rhello": 40,
  "Aguardando retorno do cliente": 50,
  "Apresentação de Candidatos": 60,
  "Entrevista cliente": 75,
  "Em processo de contratação": 85,
  "Concluído": 100,
  "Cancelada": 0
};
const getStatusColor = (status: string): string => {
  if (status === "Concluído") return "bg-success/20 text-success border-success/30";
  if (status === "Cancelada") return "bg-destructive/20 text-destructive border-destructive/30";
  if (status === "A iniciar") return "bg-info/20 text-info border-info/30";
  return "bg-warning/20 text-warning border-warning/30";
};
const getStatusIndicator = (status: string) => {
  if (status === "Concluído") return "✓";
  if (status === "Cancelada") return "✕";
  if (status === "A iniciar") return "○";
  return "●";
};
export function VagaCard({
  vaga,
  draggable = false,
  onDragStart,
  onClick,
  viewMode = "grid"
}: VagaCardProps) {
  const navigate = useNavigate();
  const {
    isAdmin
  } = useUserRole();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [recrutadorName, setRecrutadorName] = useState<string | null>(vaga.recrutador);
  const progress = statusProgressMap[vaga.status] || 0;
  const daysOpen = vaga.criado_em ? getBusinessDaysFromNow(vaga.criado_em) : 0;
  useEffect(() => {
    // Se tiver recrutador_id, buscar o nome
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
  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/vagas/${vaga.id}`);
  };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/vagas/${vaga.id}/editar`);
  };
  const handleDelete = async () => {
    // Para admins, o motivo é opcional
    if (!isAdmin && !deletionReason.trim()) {
      toast.error("❌ Por favor, informe o motivo da exclusão");
      return;
    }
    setIsDeleting(true);
    try {
      // Create pre-delete snapshot with current vaga data
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
      toast.success("✅ Vaga marcada para exclusão com sucesso");

      // Recarregar a página após exclusão
      setTimeout(() => window.location.reload(), 1000);
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
  return <Card draggable={draggable} onDragStart={onDragStart} onClick={handleClick} className="relative cursor-pointer hover-lift card-shadow bg-white border border-gray-200 overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
      {/* Confidential Indicator */}
      {vaga.confidencial && <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-sm z-10" style={{
      backgroundColor: "rgba(254, 243, 242, 0.5)",
      borderColor: "#FEE4E2",
      color: "#B42318"
    }} title="Vaga confidencial">
          <EyeOff className="h-3 w-3" />
          <span className="text-xs font-medium hidden sm:inline" style={{
        fontFamily: "Manrope, sans-serif"
      }}>
            Confidencial
          </span>
        </div>}

      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-[#00141D] leading-tight pr-2 line-clamp-2" style={{
          fontFamily: "Manrope, sans-serif"
        }}>
            {vaga.titulo}
          </h3>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[#00141D] hover:opacity-70">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white rounded-lg shadow-lg border border-[#E5E7EB] p-1" onClick={e => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleEdit} className="flex items-center gap-2 px-3 py-2 text-[#00141D] font-medium hover:bg-[#F9EC3F] hover:font-bold cursor-pointer rounded" style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "14px"
            }}>
                <Edit className="h-4 w-4" />
                Editar vaga
              </DropdownMenuItem>
              <div className="my-1 h-px bg-[#E5E7EB]" />
              <DropdownMenuItem onClick={e => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }} className="flex items-center gap-2 px-3 py-2 text-[#D32F2F] font-medium hover:bg-[#FEE] hover:font-bold cursor-pointer rounded" style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "14px"
            }}>
                <Trash2 className="h-4 w-4" />
                Excluir vaga
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <div>
          <Badge className={`${getStatusColor(vaga.status)} border font-bold rounded-lg px-4 py-2 text-sm`}>
            <span className="mr-2 text-base">{getStatusIndicator(vaga.status)}</span>
            {vaga.status}
          </Badge>
        </div>

        {/* Cliente e Recrutador */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-[#00141D]/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-[#00141D]/80" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#00141D]/60">Cliente</p>
              <p className="text-sm font-semibold truncate text-[#00141D]">{vaga.empresa}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-[#F9EC3F]/20 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-[#00141D]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#00141D]/60">Recrutador</p>
              <p className="text-sm font-semibold truncate text-[#00141D]">{recrutadorName || "Não atribuído"}</p>
            </div>
          </div>
        </div>

        {/* Salary Range */}
        {(vaga.salario_min || vaga.salario_max || vaga.salario_modalidade) && <div className="pt-2 border-t border-[#E5E7EB]">
            <p className="text-xs text-[#00141D]/60 mb-1">Faixa Salarial</p>
            <p className="text-sm font-bold text-[#00141D]">
              {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
            </p>
          </div>}

        {/* Progresso do Pipeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#00141D]" style={{
            fontFamily: "Manrope, sans-serif"
          }}>Progresso do Pipeline</p>
            <p className="text-sm font-bold text-[#00141D]" style={{
            fontFamily: "Manrope, sans-serif"
          }}>{progress}%</p>
          </div>
          <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-300 rounded-full" style={{
            width: `${progress}%`,
            backgroundColor: "#F9EC3F"
          }} />
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00141D]">{vaga.candidatos_count || 0}</div>
            <div className="text-xs text-[#00141D]/60 mt-1 font-medium">Total de Candidatos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00141D]">{daysOpen}</div>
            <div className="text-xs text-[#00141D]/60 mt-1 font-medium">Dias em Aberto</div>
          </div>
        </div>

        {/* Botão Ver Detalhes */}
        <Button onClick={handleViewDetails} className="w-full text-[#00141D] font-bold rounded-xl transition-all duration-200 hover:scale-[1.03] shadow-sm bg-[#ffcd00]">
          Ver Detalhes
        </Button>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border border-[#E5E7EB]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#00141D] flex items-center gap-2" style={{
            fontFamily: "Manrope, sans-serif"
          }}>
              <AlertTriangle className="h-5 w-5 text-[#D32F2F]" />
              Excluir vaga
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-[#6B7280] space-y-4" style={{
          fontFamily: "Manrope, sans-serif"
        }}>
            <p>Tem certeza de que deseja excluir esta vaga?</p>
            <div className="bg-[#FFF3CD] border border-[#FFE69C] rounded-lg p-3 text-[#856404]">
              <p className="text-sm font-semibold mb-1">⚠️ Atenção:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Vagas com candidatos ativos requerem aprovação de admin</li>
                <li>Todos os dados serão preservados para auditoria</li>
                <li>Esta ação pode ser revertida por administradores</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletion-reason" className="text-[#00141D] font-medium">
                Motivo da exclusão {!isAdmin && "*"}
              </Label>
              {isAdmin && <p className="text-xs text-[#6B7280]">
                  Como admin, você pode excluir sem especificar um motivo
                </p>}
              <Input id="deletion-reason" placeholder="Ex: Vaga cancelada pelo cliente, duplicada, preenchida externamente..." value={deletionReason} onChange={e => setDeletionReason(e.target.value)} className="border-[#D1D5DB]" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-[#D1D5DB] text-[#00141D] bg-transparent hover:bg-[#F9FAFB]" style={{
            fontFamily: "Manrope, sans-serif"
          }} onClick={() => setDeletionReason("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting || !isAdmin && !deletionReason.trim()} className="bg-[#D32F2F] text-white hover:bg-[#B71C1C] disabled:opacity-50" style={{
            fontFamily: "Manrope, sans-serif"
          }}>
              {isDeleting ? "Processando..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>;
}