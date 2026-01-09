import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, User, Calendar, ExternalLink, Link as LinkIcon, Download, Star } from "lucide-react";
interface CandidateCardProps {
  candidate: {
    id: string;
    nome_completo: string;
    area: string | null;
    nivel: string | null;
    cidade: string | null;
    estado: string | null;
    days_in_bank: number;
    status: string;
    curriculo_link: string | null;
    mediaRating?: number | null;
    qtdAvaliacoes?: number;
    tags?: Array<{ id: string; label: string; category: string }>;
  };
  onViewProfile: () => void;
  onLinkToJob: () => void;
  viewMode?: "grid" | "list";
}
export function CandidateCard({
  candidate,
  onViewProfile,
  onLinkToJob,
  viewMode = "grid"
}: CandidateCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Banco de Talentos":
        return "bg-success/10 text-success border-success/20";
      case "Em processo":
        return "bg-warning/10 text-warning border-warning/20";
      case "Realocado":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Banco de Talentos":
        return "🟢";
      case "Em processo":
        return "🟡";
      case "Realocado":
        return "🔴";
      default:
        return "⚪";
    }
  };
  if (viewMode === "list") {
    return <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.01] bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-6 flex-1">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-[#F9EC3F]/20 flex items-center justify-center">
                  <User className="h-8 w-8 text-[#00141D]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-[#00141D] truncate">{candidate.nome_completo}</h3>
                  <Badge variant="outline" className={getStatusColor(candidate.status)}>
                    <span className="mr-1">{getStatusIcon(candidate.status)}</span>
                    {candidate.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-[#36404A]">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="truncate">{candidate.nivel} - {candidate.area}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{candidate.cidade}, {candidate.estado}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Disponível há {candidate.days_in_bank} dias</span>
                  </div>
                </div>
                {/* Tags no modo lista */}
                {candidate.tags && candidate.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {candidate.tags.slice(0, 3).map((tag) => (
                      <Badge 
                        key={tag.id} 
                        variant="secondary" 
                        className="text-xs bg-[#F9EC3F]/20 text-[#00141D]"
                      >
                        {tag.label}
                      </Badge>
                    ))}
                    {candidate.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{candidate.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={e => {
              e.stopPropagation();
              onViewProfile();
            }} className="hover:bg-[#F9EC3F] hover:text-[#00141D] hover:border-[#F9EC3F]">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver perfil
              </Button>
              <Button variant="outline" size="sm" onClick={e => {
              e.stopPropagation();
              onLinkToJob();
            }} className="hover:bg-[#F9EC3F] hover:text-[#00141D] hover:border-[#F9EC3F]">
                <LinkIcon className="mr-2 h-4 w-4" />
                Vincular
              </Button>
              {candidate.curriculo_link && <Button variant="ghost" size="icon" asChild onClick={e => e.stopPropagation()}>
                  <a href={candidate.curriculo_link} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>}
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.01] bg-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" role="article" aria-label={`Candidato: ${candidate.nome_completo} - ${candidate.nivel} - ${candidate.area} - ${candidate.status}`}>
      <CardContent className="p-6 mx-0 shadow-lg">
        {/* Header do card */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#F9EC3F]/20 flex items-center justify-center" role="img" aria-label={`Avatar de ${candidate.nome_completo}`}>
              <User className="h-6 w-6 text-[#00141D]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#00141D]">{candidate.nome_completo}</h3>
              <p className="text-sm text-[#36404A]">{candidate.nivel} – {candidate.area}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-[#36404A] hover:text-[#F9EC3F]" aria-label={`Favoritar ${candidate.nome_completo}`}>
            <Star className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Informações */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-[#36404A]">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{candidate.cidade} / {candidate.estado}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-[#36404A]">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="font-semibold">Disponível há {candidate.days_in_bank} dias</span>
          </div>

          {candidate.mediaRating !== undefined && candidate.mediaRating !== null && candidate.qtdAvaliacoes! > 0 && <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 flex-shrink-0 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-[#00141D]">
                {candidate.mediaRating.toFixed(1)} ★ ({candidate.qtdAvaliacoes})
              </span>
            </div>}
        </div>

        {/* Status */}
        <div className="mb-4">
          <Badge variant="outline" className={getStatusColor(candidate.status)}>
            <span className="mr-1">{getStatusIcon(candidate.status)}</span>
            {candidate.status}
          </Badge>
        </div>

        {/* Tags */}
        {candidate.tags && candidate.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {candidate.tags.slice(0, 5).map((tag) => (
              <Badge 
                key={tag.id} 
                variant="secondary" 
                className="text-xs bg-[#F9EC3F]/20 text-[#00141D] hover:bg-[#F9EC3F]/30"
              >
                {tag.label}
              </Badge>
            ))}
            {candidate.tags.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{candidate.tags.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2" role="group" aria-label="Ações do candidato">
          <Button variant="outline" size="sm" className="flex-1 hover:bg-[#F9EC3F] hover:text-[#00141D] hover:border-[#F9EC3F]" onClick={onViewProfile} aria-label={`Ver perfil de ${candidate.nome_completo}`}>
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Ver perfil
          </Button>
          <Button variant="outline" size="sm" className="flex-1 hover:bg-[#F9EC3F] hover:text-[#00141D] hover:border-[#F9EC3F]" onClick={onLinkToJob} aria-label={`Vincular ${candidate.nome_completo} a uma vaga`}>
            <LinkIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Vincular
          </Button>
          {candidate.curriculo_link && <Button variant="ghost" size="icon" asChild aria-label={`Baixar currículo de ${candidate.nome_completo}`}>
              <a href={candidate.curriculo_link} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>}
        </div>
      </CardContent>
    </Card>;
}