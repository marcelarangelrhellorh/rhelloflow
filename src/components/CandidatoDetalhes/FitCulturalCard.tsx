import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import type { FitCulturalData } from "@/constants/fitCultural";
interface FitCulturalCardProps {
  fitCultural: FitCulturalData | null | undefined;
}
export function FitCulturalCard({
  fitCultural
}: FitCulturalCardProps) {
  if (!fitCultural) return null;
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-primary" />
          Fit Cultural
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fitCultural.motivacao && <div>
            <p className="text-sm text-muted-foreground font-semibold">O que te motiva profissionalmente?</p>
            <p className="text-sm mt-1">{fitCultural.motivacao}</p>
          </div>}

        {fitCultural.valores?.length > 0 && <div>
            <p className="text-sm text-muted-foreground mb-2 font-semibold">Valores importantes</p>
            <div className="flex flex-wrap gap-1.5">
              {fitCultural.valores.map(valor => <Badge key={valor} variant="secondary" className="text-xs">
                  {valor}
                </Badge>)}
            </div>
          </div>}

        {fitCultural.preferencia_trabalho && <div>
            <p className="text-sm text-muted-foreground font-semibold">Preferência de trabalho</p>
            <p className="text-sm mt-1">{fitCultural.preferencia_trabalho}</p>
          </div>}

        {fitCultural.desafios_interesse && <div>
            <p className="text-sm text-muted-foreground font-semibold">Desafios que interessam</p>
            <p className="text-sm mt-1">{fitCultural.desafios_interesse}</p>
          </div>}

        {fitCultural.ponto_forte && <div>
            <p className="text-sm text-muted-foreground font-semibold">Principal ponto forte</p>
            <p className="text-sm mt-1">{fitCultural.ponto_forte}</p>
          </div>}

        {fitCultural.area_desenvolvimento && <div>
            <p className="text-sm text-muted-foreground font-semibold">Área para desenvolver</p>
            <p className="text-sm mt-1">{fitCultural.area_desenvolvimento}</p>
          </div>}

        {fitCultural.situacao_aprendizado && <div>
            <p className="text-sm text-muted-foreground font-semibold">Situação de aprendizado rápido</p>
            <p className="text-sm mt-1">{fitCultural.situacao_aprendizado}</p>
          </div>}
      </CardContent>
    </Card>;
}