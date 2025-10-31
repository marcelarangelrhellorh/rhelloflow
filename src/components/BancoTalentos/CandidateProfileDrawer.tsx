import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Calendar,
  ExternalLink,
  Download
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CandidateProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: {
    nome_completo: string;
    email: string;
    telefone: string | null;
    cidade: string | null;
    estado: string | null;
    area: string | null;
    nivel: string | null;
    pretensao_salarial: number | null;
    linkedin: string | null;
    status: string;
    recruiter_name: string;
    days_in_bank: number;
    curriculo_link: string | null;
    feedback: string | null;
  };
}

export function CandidateProfileDrawer({ open, onOpenChange, candidate }: CandidateProfileDrawerProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return "Não informado";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Perfil do Candidato</SheetTitle>
          <SheetDescription>
            Informações completas do candidato no banco de talentos
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header com nome e status */}
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="h-16 w-16 rounded-full bg-[#F9EC3F]/20 flex items-center justify-center">
                <User className="h-8 w-8 text-[#00141D]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#00141D]">{candidate.nome_completo}</h3>
                <p className="text-[#36404A]">{candidate.nivel} - {candidate.area}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              🟢 {candidate.status}
            </Badge>
          </div>

          <Separator />

          {/* Informações de contato */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#00141D]">Contato</h4>
            
            <div className="flex items-center gap-3 text-[#36404A]">
              <Mail className="h-4 w-4" />
              <span>{candidate.email}</span>
            </div>

            {candidate.telefone && (
              <div className="flex items-center gap-3 text-[#36404A]">
                <Phone className="h-4 w-4" />
                <span>{candidate.telefone}</span>
              </div>
            )}

            {(candidate.cidade || candidate.estado) && (
              <div className="flex items-center gap-3 text-[#36404A]">
                <MapPin className="h-4 w-4" />
                <span>
                  {[candidate.cidade, candidate.estado].filter(Boolean).join(" / ")}
                </span>
              </div>
            )}

            {candidate.linkedin && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-[#36404A]" />
                <a 
                  href={candidate.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Ver LinkedIn
                </a>
              </div>
            )}
          </div>

          <Separator />

          {/* Informações profissionais */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#00141D]">Informações Profissionais</h4>

            <div className="flex items-center gap-3 text-[#36404A]">
              <Briefcase className="h-4 w-4" />
              <span>{candidate.area} - {candidate.nivel}</span>
            </div>

            <div className="flex items-center gap-3 text-[#36404A]">
              <DollarSign className="h-4 w-4" />
              <span>Pretensão: {formatCurrency(candidate.pretensao_salarial)}</span>
            </div>

            <div className="flex items-center gap-3 text-[#36404A]">
              <User className="h-4 w-4" />
              <span>Recrutador: {candidate.recruiter_name}</span>
            </div>

            <div className="flex items-center gap-3 text-[#36404A]">
              <Calendar className="h-4 w-4" />
              <span>No banco há {candidate.days_in_bank} dias</span>
            </div>
          </div>

          {candidate.feedback && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-[#00141D]">Observações</h4>
                <p className="text-[#36404A] whitespace-pre-wrap">{candidate.feedback}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Ações */}
          <div className="space-y-3">
            {candidate.curriculo_link && (
              <Button 
                className="w-full bg-[#F9EC3F] hover:bg-[#F9EC3F]/90 text-[#00141D] font-semibold"
                asChild
              >
                <a href={candidate.curriculo_link} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Currículo
                </a>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
