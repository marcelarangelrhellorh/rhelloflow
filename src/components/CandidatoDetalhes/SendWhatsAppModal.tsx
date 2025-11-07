import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Loader2 } from "lucide-react";

interface SendWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  candidatePhone: string | null;
  vacancyTitle?: string;
}

interface WhatsAppTemplate {
  id: string;
  key: string;
  name: string;
  content: string;
}

export function SendWhatsAppModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  candidatePhone,
  vacancyTitle,
}: SendWhatsAppModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [message, setMessage] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadTemplates = async () => {
      if (!open) return;
      
      try {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .select('id, key, name, content')
          .eq('active', true)
          .order('name');

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({
          title: "Erro ao carregar templates",
          description: "Não foi possível carregar os templates de mensagem.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [open, toast]);

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = templates.find(t => t.key === templateKey);
    if (template) {
      const firstName = candidateName.split(' ')[0];
      let msg = template.content
        .replace(/\{\{candidate_first_name\}\}/g, firstName)
        .replace(/\{\{candidate_name\}\}/g, candidateName)
        .replace(/\{\{recruiter_name\}\}/g, 'rhello')
        .replace(/\{\{vacancy_title\}\}/g, vacancyTitle || 'a vaga');
      setMessage(msg);
    }
  };

  const formatPhonePreview = (phone: string | null) => {
    if (!phone) return "Nenhum telefone cadastrado";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+55 (${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const isValidPhone = (phone: string | null): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const handleSend = async () => {
    if (!isValidPhone(candidatePhone)) {
      toast({
        title: "Número inválido",
        description: "O candidato não possui um telefone válido cadastrado.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Por favor, escreva uma mensagem antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    if (!consentConfirmed) {
      toast({
        title: "Consentimento necessário",
        description: "Você precisa confirmar que tem consentimento do candidato.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          candidate_id: candidateId,
          template_key: selectedTemplate,
          custom_message: message,
          consent_confirmed: consentConfirmed,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Mensagem enviada!",
          description: "WhatsApp enviado com sucesso para o candidato.",
        });
        onOpenChange(false);
        // Reset form
        setSelectedTemplate("");
        setMessage("");
        setConsentConfirmed(false);
      } else {
        throw new Error(data?.error || "Falha ao enviar mensagem");
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem via WhatsApp para {candidateName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <div className="text-sm font-medium text-foreground">
              {formatPhonePreview(candidatePhone)}
            </div>
            {!isValidPhone(candidatePhone) && (
              <p className="text-sm text-destructive">
                ⚠️ Número inválido ou não cadastrado
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange} disabled={loading}>
              <SelectTrigger id="template">
                <SelectValue placeholder={loading ? "Carregando templates..." : "Selecione um template"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite ou edite a mensagem aqui..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length} caracteres
            </p>
          </div>

          <div className="flex items-start space-x-2 rounded-lg border border-border p-4 bg-muted/50">
            <Checkbox
              id="consent"
              checked={consentConfirmed}
              onCheckedChange={(checked) => setConsentConfirmed(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Confirmo que tenho consentimento do candidato
              </label>
              <p className="text-xs text-muted-foreground">
                É obrigatório ter permissão do candidato para envio de mensagens via WhatsApp, conforme LGPD.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!isValidPhone(candidatePhone) || !message.trim() || !consentConfirmed || sending}
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}