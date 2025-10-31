import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Linkedin, FileText, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ContactCardProps {
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  linkedin: string | null;
  curriculoLink: string | null;
}

export function ContactCard({
  email,
  telefone,
  cidade,
  estado,
  linkedin,
  curriculoLink,
}: ContactCardProps) {
  const handleCopyContact = () => {
    const contactText = `
Nome: Ver no sistema
E-mail: ${email}
Telefone: ${telefone || "Não informado"}
Localização: ${[cidade, estado].filter(Boolean).join(", ") || "Não informada"}
    `.trim();

    navigator.clipboard.writeText(contactText);
    toast.success("Contato copiado para a área de transferência");
  };

  const openWhatsApp = () => {
    if (!telefone) return;
    const cleanPhone = telefone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  const openMaps = () => {
    if (!cidade || !estado) return;
    const query = encodeURIComponent(`${cidade}, ${estado}, Brasil`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Contato</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyContact}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Email */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            asChild
          >
            <a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Phone */}
        {telefone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{telefone}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={openWhatsApp}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Location */}
        {(cidade || estado) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{[cidade, estado].filter(Boolean).join(", ")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={openMaps}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* LinkedIn */}
        {linkedin && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Linkedin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-info">LinkedIn</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              asChild
            >
              <a href={linkedin} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        {/* Curriculum */}
        {curriculoLink && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-info">Ver Currículo</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              asChild
            >
              <a href={curriculoLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
