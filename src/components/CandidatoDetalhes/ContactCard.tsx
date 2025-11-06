import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Linkedin, FileText, Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ContactCardProps {
  email: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  linkedin: string | null;
  curriculoLink: string | null;
  isFromPublicLink?: boolean;
}

export function ContactCard({
  email,
  telefone,
  cidade,
  estado,
  linkedin,
  curriculoLink,
  isFromPublicLink = false,
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Contato</CardTitle>
            {isFromPublicLink && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Link2 className="h-3 w-3" />
                Link Público
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyContact}
            className="h-7 text-xs"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar
          </Button>
        </div>
        {isFromPublicLink && (
          <p className="text-xs text-muted-foreground mt-1">
            Informações enviadas pelo candidato
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {/* Email */}
        <div className="flex items-center justify-between group hover:bg-accent/5 -mx-2 px-2 py-1.5 rounded transition-colors">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs truncate">{email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            asChild
          >
            <a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        {/* Phone */}
        {telefone && (
          <div className="flex items-center justify-between group hover:bg-accent/5 -mx-2 px-2 py-1.5 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs">{telefone}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={openWhatsApp}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Location */}
        {(cidade || estado) && (
          <div className="flex items-center justify-between group hover:bg-accent/5 -mx-2 px-2 py-1.5 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs">{[cidade, estado].filter(Boolean).join(", ")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={openMaps}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* LinkedIn */}
        {linkedin && (
          <div className="flex items-center justify-between group hover:bg-accent/5 -mx-2 px-2 py-1.5 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Linkedin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-info">LinkedIn</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              asChild
            >
              <a href={linkedin} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}

        {/* Curriculum */}
        {curriculoLink && (
          <div className="flex items-center justify-between group hover:bg-accent/5 -mx-2 px-2 py-1.5 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-info">Ver Currículo</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              asChild
            >
              <a href={curriculoLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
