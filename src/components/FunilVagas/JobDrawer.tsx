import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Users, Clock, Building2, UserCircle, Briefcase, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { useNavigate } from "react-router-dom";
interface JobDrawerProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}
export function JobDrawer({
  jobId,
  open,
  onOpenChange,
  onEdit
}: JobDrawerProps) {
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (jobId && open) {
      loadJobDetails();
    }
  }, [jobId, open]);
  const loadJobDetails = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      // Load job details
      const {
        data: jobData,
        error: jobError
      } = await supabase.from("vagas").select("*").eq("id", jobId).single();
      if (jobError) throw jobError;

      // Count candidates
      const {
        count
      } = await supabase.from("candidatos").select("*", {
        count: "exact",
        head: true
      }).eq("vaga_relacionada_id", jobId);
      setJob(jobData);
      setCandidateCount(count || 0);
    } catch (error) {
      console.error("Error loading job details:", error);
    } finally {
      setLoading(false);
    }
  };
  if (!job) {
    return null;
  }
  const businessDays = getBusinessDaysFromNow(job.criado_em);
  const isOutOfSLA = businessDays > 30;
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-8">
            {job.confidencial && <Lock className="inline h-4 w-4 mr-2" />}
            {job.titulo}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badge */}
          <div>
            <Badge variant="outline" className="text-sm">
              {job.status}
            </Badge>
          </div>

          {/* Informações principais */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Informações</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm font-semibold">Cliente</p>
                  <p className="text-sm font-medium">{job.empresa}</p>
                </div>
              </div>

              {job.recrutador && <div className="flex items-start gap-3">
                  <UserCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Recrutador</p>
                    <p className="text-sm font-medium">{job.recrutador}</p>
                  </div>
                </div>}

              {job.cs_responsavel && <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">CS Responsável</p>
                    <p className="text-sm font-medium">{job.cs_responsavel}</p>
                  </div>
                </div>}

              {job.confidencial && <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <Lock className="h-4 w-4 mt-0.5 text-warning" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-warning">Vaga Confidencial</p>
                    {job.motivo_confidencial && <p className="text-xs text-muted-foreground mt-1">
                        {job.motivo_confidencial}
                      </p>}
                  </div>
                </div>}
            </div>
          </div>

          <Separator />

          {/* Progresso e prazo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Progresso e Prazo</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-muted-foreground font-semibold text-sm">Dias úteis em aberto</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-2xl font-bold ${isOutOfSLA ? "text-destructive" : businessDays > 20 ? "text-warning" : "text-success"}`}>
                      {businessDays}
                    </p>
                    <span className="text-muted-foreground text-sm font-medium">dias úteis</span>
                  </div>
                </div>
              </div>

              {isOutOfSLA ? <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-destructive" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-destructive">Fora do SLA</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vaga aberta há mais de 30 dias úteis
                    </p>
                  </div>
                </div> : <div className="flex items-start gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-success" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-success">Dentro do prazo</p>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                      {30 - businessDays} dias úteis restantes
                    </p>
                  </div>
                </div>}
            </div>
          </div>

          <Separator />

          {/* Contadores */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Contadores</h3>
            
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">Candidatos vinculados</p>
                <p className="text-2xl font-bold">{candidateCount}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
              navigate(`/candidatos?vaga=${jobId}`);
              onOpenChange(false);
            }}>
                Ver lista
              </Button>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="space-y-3">
            <Button onClick={() => {
            navigate(`/vagas/${jobId}`);
            onOpenChange(false);
          }} className="w-full px-0 my-0 mx-0 text-center font-semibold">
              <Briefcase className="h-4 w-4 mr-2" />
              Ver ficha completa da vaga
            </Button>

            <Button variant="outline" onClick={() => {
            onEdit();
            onOpenChange(false);
          }} className="w-full font-semibold">
              <Edit className="h-4 w-4 mr-2" />
              Editar vaga
            </Button>

            <Button variant="outline" onClick={() => {
            navigate(`/candidatos?vaga=${jobId}`);
            onOpenChange(false);
          }} className="w-full font-semibold">
              <Users className="h-4 w-4 mr-2" />
              Ver candidatos da vaga
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>;
}