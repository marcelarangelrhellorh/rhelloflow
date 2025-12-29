import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Upload, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vagaId: string;
  vagaTitulo: string;
  empresaNome: string;
  token: string;
  requiresPassword: boolean;
  onSuccess: (protocol: string) => void;
}

export function ApplicationModal({
  isOpen,
  onClose,
  vagaId,
  vagaTitulo,
  empresaNome,
  token,
  requiresPassword,
  onSuccess
}: ApplicationModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [formStartTime] = useState(Date.now());
  
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    linkedin: "",
    pretensao_salarial: "",
    mensagem: "",
    password: "",
    company: "", // Honeypot field
  });

  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tamanho (max 20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 20MB",
          variant: "destructive"
        });
        return;
      }
      
      // Validar tipo
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Formato inválido",
          description: "Apenas arquivos PDF ou DOCX são aceitos",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  // Convert file to base64 for sending to edge function
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação do token
    if (!token || token.length === 0) {
      toast({
        title: "Erro de acesso",
        description: "Link de candidatura inválido. Verifique o link e tente novamente.",
        variant: "destructive"
      });
      return;
    }

    // Validações de campos obrigatórios
    if (!formData.nome_completo || formData.nome_completo.trim().length < 2) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha seu nome completo",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email || formData.email.trim().length === 0) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, preencha seu e-mail",
        variant: "destructive"
      });
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido",
        variant: "destructive"
      });
      return;
    }

    if (!formData.telefone || formData.telefone.trim().length < 8) {
      toast({
        title: "Telefone obrigatório",
        description: "Por favor, preencha seu telefone",
        variant: "destructive"
      });
      return;
    }

    if (!lgpdConsent) {
      toast({
        title: "Consentimento necessário",
        description: "Você precisa concordar com o tratamento dos dados",
        variant: "destructive"
      });
      return;
    }

    if (!file) {
      toast({
        title: "Currículo obrigatório",
        description: "Por favor, faça upload do seu currículo",
        variant: "destructive"
      });
      return;
    }

    if (requiresPassword && (!formData.password || formData.password.trim().length === 0)) {
      toast({
        title: "Senha obrigatória",
        description: "Esta vaga requer senha para candidatura",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Convert file to base64
      setUploadProgress(10);
      const fileBase64 = await fileToBase64(file);
      setUploadProgress(50);

      // Prepare candidate data (excluding password and company honeypot)
      const candidateData = {
        nome_completo: formData.nome_completo.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone.trim(),
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim() || null,
        linkedin: formData.linkedin.trim() || null,
        pretensao_salarial: formData.pretensao_salarial ? parseFloat(formData.pretensao_salarial) : null,
        mensagem: formData.mensagem.trim() || null,
        company: formData.company, // Honeypot
      };

      // Submit application with file
      const { data, error } = await supabase.functions.invoke('submit-share-application', {
        body: {
          token: token.trim(),
          candidate: candidateData,
          password: requiresPassword ? formData.password.trim() : undefined,
          formStartTime,
          files: {
            resume: {
              data: fileBase64,
              name: file.name,
            },
          },
        },
      });

      setUploadProgress(90);

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive"
        });
      } else {
        setUploadProgress(100);
        onSuccess(data.protocol);
        toast({
          title: "Candidatura enviada!",
          description: "Recebemos sua candidatura com sucesso",
        });
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      
      // Extrair mensagem de erro mais detalhada
      let errorMessage = "Erro ao enviar candidatura. Tente novamente.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#36404A]/10">
            <div>
              <h2 className="text-2xl font-extrabold text-[#00141D]">Candidatar-se</h2>
              <p className="text-sm text-[#36404A] mt-1">{vagaTitulo} · {empresaNome}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#36404A]/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5 text-[#36404A]" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo" className="text-[#00141D] font-medium">
                  Nome completo <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="nome_completo"
                  required
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#00141D] font-medium">
                  E-mail <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-[#00141D] font-medium">
                  Telefone/WhatsApp <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="telefone"
                  type="tel"
                  required
                  placeholder="(00) 00000-0000"
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="text-[#00141D] font-medium">
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/..."
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-[#00141D] font-medium">
                  Cidade
                </Label>
                <Input
                  id="cidade"
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado" className="text-[#00141D] font-medium">
                  Estado
                </Label>
                <Input
                  id="estado"
                  maxLength={2}
                  placeholder="SP"
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pretensao_salarial" className="text-[#00141D] font-medium">
                Pretensão salarial (R$)
              </Label>
              <Input
                id="pretensao_salarial"
                type="number"
                placeholder="0,00"
                className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                value={formData.pretensao_salarial}
                onChange={(e) => setFormData({ ...formData, pretensao_salarial: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="curriculo" className="text-[#00141D] font-medium">
                Currículo (PDF ou DOCX) <span className="text-red-600">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="curriculo"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                />
                {file && <CheckCircle className="h-5 w-5 text-green-600" />}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="h-2" />
              )}
              <p className="text-xs text-[#36404A]">Tamanho máximo: 20MB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagem" className="text-[#00141D] font-medium">
                Mensagem / Apresentação
              </Label>
              <Textarea
                id="mensagem"
                rows={4}
                placeholder="Conte-nos mais sobre você e por que se interessa por esta vaga..."
                className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                value={formData.mensagem}
                onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
              />
            </div>

            {requiresPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#00141D] font-medium">
                  Senha <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Digite a senha fornecida"
                  className="border-[#36404A]/20 focus:border-[#FFCD00] focus:ring-[#FFCD00]"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-[#FFCD00]/10 rounded-lg border border-[#FFCD00]/30">
              <Checkbox
                id="lgpd"
                checked={lgpdConsent}
                onCheckedChange={(checked) => setLgpdConsent(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="lgpd" className="text-sm text-[#00141D] leading-relaxed cursor-pointer">
                Autorizo o tratamento dos meus dados pessoais para este processo seletivo, conforme a Lei Geral de Proteção de Dados (LGPD). <span className="text-red-600">*</span>
              </Label>
            </div>

            <Alert className="border-[#36404A]/20">
              <AlertDescription className="text-xs text-[#36404A]">
                Ao enviar, seus dados serão utilizados exclusivamente para este processo seletivo e mantidos de forma segura conforme nossa política de privacidade.
              </AlertDescription>
            </Alert>
            
            {/* Honeypot field - hidden from users */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px' }}
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </form>

          {/* Footer */}
          <div className="border-t border-[#36404A]/10 p-6 bg-white">
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#00141D] hover:bg-[#00141D]/90 text-white font-bold py-3 rounded-full"
            >
              {submitting ? "Enviando..." : "Enviar candidatura"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
