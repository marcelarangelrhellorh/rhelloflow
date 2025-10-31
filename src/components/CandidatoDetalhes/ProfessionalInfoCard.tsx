import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, DollarSign, Calendar, ExternalLink } from "lucide-react";

interface ProfessionalInfoCardProps {
  recrutador: string | null;
  pretensaoSalarial: number | null;
  vagaTitulo: string | null;
  vagaId: string | null;
  dataCadastro: string;
  nivel: string | null;
  area: string | null;
  onVagaClick?: () => void;
}

export function ProfessionalInfoCard({
  recrutador,
  pretensaoSalarial,
  vagaTitulo,
  vagaId,
  dataCadastro,
  nivel,
  area,
  onVagaClick,
}: ProfessionalInfoCardProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Informações Profissionais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid Layout */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Recrutador */}
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Recrutador Responsável
            </p>
            {recrutador ? (
              <Badge variant="secondary" className="font-medium">
                {recrutador}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">Não atribuído</p>
            )}
          </div>

          {/* Pretensão Salarial */}
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Pretensão Salarial
            </p>
            <p className="text-base font-semibold text-card-foreground">
              {formatCurrency(pretensaoSalarial)}
            </p>
          </div>

          {/* Nível */}
          {nivel && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nível</p>
              <p className="text-base font-medium text-card-foreground">{nivel}</p>
            </div>
          )}

          {/* Área */}
          {area && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Área</p>
              <p className="text-base font-medium text-card-foreground">{area}</p>
            </div>
          )}

          {/* Data de Cadastro */}
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Data de Cadastro
            </p>
            <p className="text-base font-medium text-card-foreground">{formatDate(dataCadastro)}</p>
          </div>
        </div>

        {/* Vaga Relacionada */}
        <div className="pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            Vaga Relacionada
          </p>
          {vagaTitulo && vagaId ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={onVagaClick}
            >
              <span className="truncate">{vagaTitulo}</span>
              <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma vaga relacionada</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
