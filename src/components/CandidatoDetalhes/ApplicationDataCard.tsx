import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, Mail, Phone, MapPin, Linkedin } from "lucide-react";

interface ApplicationDataCardProps {
  nomeCompleto: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  linkedin: string | null;
}

export function ApplicationDataCard({
  nomeCompleto,
  email,
  telefone,
  cidade,
  estado,
  linkedin,
}: ApplicationDataCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Dados da Candidatura</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Informações enviadas pelo candidato via link público
        </p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {/* Nome */}
        <div className="flex items-start gap-2">
          <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
            Nome:
          </span>
          <span className="text-sm">{nomeCompleto}</span>
        </div>

        {/* Email */}
        <div className="flex items-start gap-2">
          <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-sm">{email}</span>
        </div>

        {/* Telefone */}
        {telefone && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm">{telefone}</span>
          </div>
        )}

        {/* Localização */}
        {(cidade || estado) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm">{[cidade, estado].filter(Boolean).join(", ")}</span>
          </div>
        )}

        {/* LinkedIn */}
        {linkedin && (
          <div className="flex items-start gap-2">
            <Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <a 
              href={linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-info hover:underline"
            >
              LinkedIn
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
