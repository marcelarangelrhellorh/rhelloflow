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
    <div className="rounded-lg border-2 border-[#ffcd00] bg-white dark:bg-background-dark shadow-sm">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold">Contato</h3>
            {isFromPublicLink && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-info/10 text-info border-info/20">
                <Link2 className="h-3 w-3" />
                Link Público
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyContact}
            className="h-8 text-xs font-semibold border-gray-200 dark:border-secondary-text-light/20"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar
          </Button>
        </div>
        {isFromPublicLink && (
          <p className="text-xs text-secondary-text-light dark:text-secondary-text-dark mt-2">
            Informações enviadas pelo candidato
          </p>
        )}
      </div>
      <div className="px-6 pb-6 space-y-1">
        {/* Email */}
        <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="h-4 w-4 text-secondary-text-light dark:text-secondary-text-dark flex-shrink-0" />
            <span className="text-base text-primary-text-light dark:text-primary-text-dark truncate">{email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            asChild
          >
            <a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        {/* Phone */}
        {telefone && (
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Phone className="h-4 w-4 text-secondary-text-light dark:text-secondary-text-dark flex-shrink-0" />
              <span className="text-sm text-primary-text-light dark:text-primary-text-dark">{telefone}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={openWhatsApp}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Location */}
        {(cidade || estado) && (
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-secondary-text-light dark:text-secondary-text-dark flex-shrink-0" />
              <span className="text-sm text-primary-text-light dark:text-primary-text-dark">{[cidade, estado].filter(Boolean).join(", ")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={openMaps}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* LinkedIn */}
        {linkedin && (
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Linkedin className="h-4 w-4 text-secondary-text-light dark:text-secondary-text-dark flex-shrink-0" />
              <span className="text-sm text-info font-medium">LinkedIn</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div className="flex items-center justify-between group hover:bg-primary/5 dark:hover:bg-primary/10 -mx-2 px-2 py-2 rounded transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-secondary-text-light dark:text-secondary-text-dark flex-shrink-0" />
              <span className="text-sm text-info font-medium">Ver Currículo</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              asChild
            >
              <a href={curriculoLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
