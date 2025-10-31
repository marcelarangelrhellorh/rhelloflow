import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Clock, AlertCircle, Users } from "lucide-react";

interface StatsHeaderProps {
  totalVagasAbertas: number;
  mediaDiasAbertos: number;
  vagasEmAtencao: number;
  totalCandidatosAtivos: number;
}

export function StatsHeader({
  totalVagasAbertas,
  mediaDiasAbertos,
  vagasEmAtencao,
  totalCandidatosAtivos,
}: StatsHeaderProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-primary/10 p-2">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de vagas abertas</p>
            <p className="text-2xl font-bold text-card-foreground">{totalVagasAbertas}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-info/10 p-2">
            <Clock className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Média de dias abertos</p>
            <p className="text-2xl font-bold text-card-foreground">{mediaDiasAbertos}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-warning/10 p-2">
            <AlertCircle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vagas em atenção</p>
            <p className="text-2xl font-bold text-card-foreground">{vagasEmAtencao}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full bg-success/10 p-2">
            <Users className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Candidatos ativos</p>
            <p className="text-2xl font-bold text-card-foreground">{totalCandidatosAtivos}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
