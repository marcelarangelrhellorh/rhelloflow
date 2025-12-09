import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { Empresa } from "@/hooks/data/useEmpresaQuery";

interface Socio {
  nome: string;
  qual: string;
}

interface EmpresaSociosCardProps {
  empresa: Empresa;
}

export function EmpresaSociosCard({ empresa }: EmpresaSociosCardProps) {
  const quadroSocietario = (empresa.quadro_societario as Socio[]) || [];

  if (quadroSocietario.length === 0) return null;

  return (
    <Card className="border border-gray-300 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Quadro Societário ({quadroSocietario.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {quadroSocietario.map((socio, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-gray-200"
            >
              <span className="text-base font-medium text-foreground">{socio.nome}</span>
              <Badge variant="secondary" className="text-sm">
                {socio.qual}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
