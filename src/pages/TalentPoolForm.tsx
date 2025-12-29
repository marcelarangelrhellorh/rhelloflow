import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Upload,
  User,
  Briefcase,
  Heart,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import logoLight from "@/assets/logo-rhello-light.png";
import {
  FIT_CULTURAL_VALUES,
  FIT_CULTURAL_WORK_PREFERENCES,
  FIT_CULTURAL_QUESTIONS,
  MODELO_CONTRATACAO_OPTIONS,
  FORMATO_TRABALHO_OPTIONS,
  ORIGEM_OPTIONS,
  CARGO_OPTIONS,
  ESTADOS_BRASILEIROS,
  type FitCulturalData,
} from "@/constants/fitCultural";

interface LinkData {
  id: string;
  active: boolean;
  expires_at: string | null;
  max_submissions: number | null;
  submissions_count: number;
  requires_password: boolean;
}

export default function TalentPoolForm() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formStartTime] = useState(Date.now());
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // UTM tracking
  const utm = {
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
  };

  // Form data
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    linkedin: "",
    idade: "",
    nivel: "",
    cargo: "",
    area: "",
    pretensao_salarial: "",
    modelo_contratacao: "",
    formato_trabalho: "",
    origem: "",
    password: "",
    company: "", // Honeypot
  });

  // File states
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  // Fit Cultural data
  const [fitCultural, setFitCultural] = useState<FitCulturalData>({
    motivacao: "",
    valores: [],
    preferencia_trabalho: "",
    desafios_interesse: "",
    ponto_forte: "",
    area_desenvolvimento: "",
    situacao_aprendizado: "",
  });

  useEffect(() => {
    loadLink();
  }, [token]);

  const loadLink = async () => {
    if (!token) {
      setError("Link inválido");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-talent-pool-link?token=${token}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Link não encontrado');
      } else {
        setLinkData(data);
      }
    } catch (err) {
      console.error('Error loading talent pool link:', err);
      setError("Erro ao carregar formulário");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 20MB");
        return;
      }

      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Apenas arquivos PDF ou DOCX são aceitos");
        return;
      }

      setFile(selectedFile);
    }
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 20MB");
        return;
      }

      const validTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Apenas arquivos PDF, PNG, JPG ou PPTX são aceitos para portfólio");
        return;
      }

      setPortfolioFile(selectedFile);
    }
  };

  const handleValorToggle = (valor: string) => {
    setFitCultural(prev => {
      const current = prev.valores;
      if (current.includes(valor)) {
        return { ...prev, valores: current.filter(v => v !== valor) };
      } else if (current.length < 3) {
        return { ...prev, valores: [...current, valor] };
      }
      toast.error("Selecione no máximo 3 valores");
      return prev;
    });
  };

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

    // Validations
    if (!formData.nome_completo.trim()) {
      toast.error("Preencha seu nome completo");
      return;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Preencha um e-mail válido");
      return;
    }

    if (!formData.telefone.trim()) {
      toast.error("Preencha seu telefone");
      return;
    }

    if (!formData.modelo_contratacao) {
      toast.error("Selecione o modelo de contratação");
      return;
    }

    if (!formData.formato_trabalho) {
      toast.error("Selecione o formato de trabalho");
      return;
    }

    if (!formData.origem) {
      toast.error("Selecione por onde teve acesso ao formulário");
      return;
    }

    // Validate Fit Cultural
    if (!fitCultural.motivacao.trim()) {
      toast.error("Preencha o que te motiva profissionalmente");
      return;
    }

    if (fitCultural.valores.length === 0) {
      toast.error("Selecione pelo menos um valor importante");
      return;
    }

    if (!fitCultural.preferencia_trabalho) {
      toast.error("Selecione como você prefere trabalhar");
      return;
    }

    if (!fitCultural.desafios_interesse.trim() || !fitCultural.ponto_forte.trim() ||
        !fitCultural.area_desenvolvimento.trim() || !fitCultural.situacao_aprendizado.trim()) {
      toast.error("Preencha todas as perguntas de Fit Cultural");
      return;
    }

    if (!lgpdConsent) {
      toast.error("Você precisa concordar com o tratamento dos dados");
      return;
    }

    if (!file) {
      toast.error("Anexe seu currículo");
      return;
    }

    if (linkData?.requires_password && !formData.password) {
      toast.error("Digite a senha de acesso");
      return;
    }

    setSubmitting(true);

    try {
      setUploadProgress(10);
      const fileBase64 = await fileToBase64(file);
      setUploadProgress(50);

      // Prepare portfolio file if present
      let portfolioBase64 = null;
      if (portfolioFile) {
        portfolioBase64 = await fileToBase64(portfolioFile);
      }

      const candidateData = {
        nome_completo: formData.nome_completo.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone.trim(),
        cidade: formData.cidade.trim() || null,
        estado: formData.estado || null,
        linkedin: formData.linkedin.trim() || null,
        idade: formData.idade ? parseInt(formData.idade) : null,
        nivel: formData.nivel || null,
        cargo: formData.cargo || null,
        area: formData.area || null,
        pretensao_salarial: formData.pretensao_salarial || null,
        modelo_contratacao: formData.modelo_contratacao,
        formato_trabalho: formData.formato_trabalho,
        origem: formData.origem,
        fit_cultural: fitCultural,
        company: formData.company, // Honeypot
      };

      const { data, error } = await supabase.functions.invoke('submit-talent-pool-application', {
        body: {
          token,
          candidate: candidateData,
          password: linkData?.requires_password ? formData.password : undefined,
          formStartTime,
          utm,
          files: {
            resume: {
              data: fileBase64,
              name: file.name,
            },
            portfolio: portfolioBase64 && portfolioFile ? {
              data: portfolioBase64,
              name: portfolioFile.name,
            } : undefined,
          },
        },
      });

      setUploadProgress(90);

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
      } else {
        setUploadProgress(100);
        setProtocol(data.protocol);
        setSubmitted(true);
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error?.message || "Erro ao enviar cadastro");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFCD00]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-[#FFCD00] bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-xl font-bold">Link Indisponível</h2>
            </div>
            <p className="text-[#36404A] mb-4">{error}</p>
            <p className="text-sm text-[#36404A]/70">
              Este link não está mais disponível ou expirou. Entre em contato com o recrutador responsável.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-[#FFCD00] bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle className="h-5 w-5" />
              <h2 className="text-xl font-bold text-[#00141D]">Cadastro Realizado!</h2>
            </div>
            <p className="text-[#36404A] mb-4">Seu cadastro no Banco de Talentos foi realizado com sucesso.</p>
            <div className="p-4 bg-[#FFCD00]/10 rounded-lg border border-[#FFCD00]/30 mb-4">
              <p className="text-sm text-[#36404A] font-medium">Protocolo:</p>
              <p className="font-mono font-bold text-lg text-[#00141D]">{protocol}</p>
            </div>
            <Alert className="border-[#36404A]/20">
              <AlertDescription className="text-[#36404A]">
                Seu perfil foi adicionado ao nosso banco de talentos. Quando surgir uma oportunidade compatível com seu perfil, entraremos em contato.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-['Manrope',system-ui,sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-[#36404A]/10 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logoLight} alt="Rhello" className="h-8" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-[#36404A]/10 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#00141D] mb-2">
            Banco de Talentos
          </h1>
          <p className="text-lg text-[#36404A]">
            Cadastre-se e faça parte do nosso banco de talentos. Quando surgir uma oportunidade compatível com seu perfil, entraremos em contato.
          </p>
        </div>
      </section>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <Card className="border-[#FFCD00] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00141D]">
                <User className="h-5 w-5 text-[#FFCD00]" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome_completo" className="text-[#00141D]">
                    Nome completo <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="nome_completo"
                    required
                    className="mt-1 border-[#36404A]/20"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-[#00141D]">
                    E-mail <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    className="mt-1 border-[#36404A]/20"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="telefone" className="text-[#00141D]">
                    Telefone/WhatsApp <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="telefone"
                    type="tel"
                    required
                    placeholder="(00) 00000-0000"
                    className="mt-1 border-[#36404A]/20"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin" className="text-[#00141D]">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/..."
                    className="mt-1 border-[#36404A]/20"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="cidade" className="text-[#00141D]">Cidade</Label>
                  <Input
                    id="cidade"
                    className="mt-1 border-[#36404A]/20"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="estado" className="text-[#00141D]">Estado</Label>
                  <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                    <SelectTrigger className="mt-1 border-[#36404A]/20">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {ESTADOS_BRASILEIROS.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>{estado.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="idade" className="text-[#00141D]">Idade</Label>
                  <Input
                    id="idade"
                    type="number"
                    min="18"
                    max="100"
                    placeholder="Ex: 30"
                    className="mt-1 border-[#36404A]/20"
                    value={formData.idade}
                    onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Perfil Profissional */}
          <Card className="border-[#FFCD00] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00141D]">
                <Briefcase className="h-5 w-5 text-[#FFCD00]" />
                Perfil Profissional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area" className="text-[#00141D]">Área de atuação</Label>
                  <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                    <SelectTrigger className="mt-1 border-[#36404A]/20">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Constants.public.Enums.area_candidato.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cargo" className="text-[#00141D]">Cargo</Label>
                  <Select value={formData.cargo} onValueChange={(value) => setFormData({ ...formData, cargo: value })}>
                    <SelectTrigger className="mt-1 border-[#36404A]/20">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {CARGO_OPTIONS.map((cargo) => (
                        <SelectItem key={cargo.value} value={cargo.value}>{cargo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nivel" className="text-[#00141D]">Senioridade</Label>
                  <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                    <SelectTrigger className="mt-1 border-[#36404A]/20">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Constants.public.Enums.nivel_candidato.map((nivel) => (
                        <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pretensao_salarial" className="text-[#00141D]">Pretensão salarial (R$)</Label>
                  <Input
                    id="pretensao_salarial"
                    type="number"
                    placeholder="0,00"
                    className="mt-1 border-[#36404A]/20"
                    value={formData.pretensao_salarial}
                    onChange={(e) => setFormData({ ...formData, pretensao_salarial: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="modelo_contratacao" className="text-[#00141D]">
                    Modelo de contratação <span className="text-red-600">*</span>
                  </Label>
                  <Select value={formData.modelo_contratacao} onValueChange={(value) => setFormData({ ...formData, modelo_contratacao: value })}>
                    <SelectTrigger className="mt-1 border-[#36404A]/20">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {MODELO_CONTRATACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="formato_trabalho" className="text-[#00141D]">
                    Formato de trabalho <span className="text-red-600">*</span>
                  </Label>
                  <Select value={formData.formato_trabalho} onValueChange={(value) => setFormData({ ...formData, formato_trabalho: value })}>
                    <SelectTrigger className="mt-1 border-[#36404A]/20">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {FORMATO_TRABALHO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File upload - Currículo */}
              <div>
                <Label htmlFor="curriculo" className="text-[#00141D]">
                  Currículo (PDF ou DOCX) <span className="text-red-600">*</span>
                </Label>
                <div className="flex items-center gap-3 mt-1">
                  <Input
                    id="curriculo"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="border-[#36404A]/20"
                  />
                  {file && <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Progress value={uploadProgress} className="h-2 mt-2" />
                )}
                <p className="text-xs text-[#36404A] mt-1">Tamanho máximo: 20MB</p>
              </div>

              {/* File upload - Portfólio */}
              <div>
                <Label htmlFor="portfolio" className="text-[#00141D]">
                  Portfólio (PDF, PNG, JPG ou PPTX) - opcional
                </Label>
                <div className="flex items-center gap-3 mt-1">
                  <Input
                    id="portfolio"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.pptx"
                    onChange={handlePortfolioChange}
                    className="border-[#36404A]/20"
                  />
                  {portfolioFile && <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
                <p className="text-xs text-[#36404A] mt-1">Tamanho máximo: 20MB</p>
              </div>
            </CardContent>
          </Card>

          {/* Origem */}
          <Card className="border-[#FFCD00] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00141D]">
                <FileText className="h-5 w-5 text-[#FFCD00]" />
                Por onde teve acesso ao formulário? <span className="text-red-600">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.origem} onValueChange={(value) => setFormData({ ...formData, origem: value })}>
                <SelectTrigger className="border-[#36404A]/20">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {ORIGEM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Fit Cultural */}
          <Card className="border-[#FFCD00] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00141D]">
                <Heart className="h-5 w-5 text-[#FFCD00]" />
                Fit Cultural
              </CardTitle>
              <p className="text-sm text-[#36404A]">
                Queremos conhecer você melhor! Responda às perguntas abaixo.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 1. Motivação */}
              <div>
                <Label className="text-[#00141D]">
                  {FIT_CULTURAL_QUESTIONS.motivacao.label} <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  className="mt-1 border-[#36404A]/20"
                  rows={3}
                  value={fitCultural.motivacao}
                  onChange={(e) => setFitCultural({ ...fitCultural, motivacao: e.target.value })}
                />
              </div>

              {/* 2. Valores */}
              <div>
                <Label className="text-[#00141D]">
                  {FIT_CULTURAL_QUESTIONS.valores.label} <span className="text-red-600">*</span>
                </Label>
                <p className="text-xs text-[#36404A] mb-2">Selecione até 3 valores</p>
                <div className="flex flex-wrap gap-2">
                  {FIT_CULTURAL_VALUES.map((valor) => {
                    const isSelected = fitCultural.valores.includes(valor);
                    return (
                      <Badge
                        key={valor}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-[#FFCD00] text-[#00141D] border-[#FFCD00] hover:bg-[#FFCD00]/80" 
                            : "border-[#36404A]/30 hover:border-[#FFCD00] hover:bg-[#FFCD00]/10"
                        }`}
                        onClick={() => handleValorToggle(valor)}
                      >
                        {valor}
                      </Badge>
                    );
                  })}
                </div>
                {fitCultural.valores.length > 0 && (
                  <p className="text-xs text-[#36404A] mt-2">
                    Selecionados: {fitCultural.valores.length}/3
                  </p>
                )}
              </div>

              {/* 3. Preferência de trabalho */}
              <div>
                <Label className="text-[#00141D]">
                  {FIT_CULTURAL_QUESTIONS.preferencia_trabalho.label} <span className="text-red-600">*</span>
                </Label>
                <Select 
                  value={fitCultural.preferencia_trabalho} 
                  onValueChange={(value) => setFitCultural({ ...fitCultural, preferencia_trabalho: value })}
                >
                  <SelectTrigger className="mt-1 border-[#36404A]/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {FIT_CULTURAL_WORK_PREFERENCES.map((pref) => (
                      <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Desafios */}
              <div>
                <Label className="text-[#00141D]">
                  {FIT_CULTURAL_QUESTIONS.desafios_interesse.label} <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  className="mt-1 border-[#36404A]/20"
                  rows={3}
                  value={fitCultural.desafios_interesse}
                  onChange={(e) => setFitCultural({ ...fitCultural, desafios_interesse: e.target.value })}
                />
              </div>

              {/* 5. Ponto forte */}
              <div>
                <Label className="text-[#00141D]">
                  {FIT_CULTURAL_QUESTIONS.ponto_forte.label} <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  className="mt-1 border-[#36404A]/20"
                  rows={3}
                  value={fitCultural.ponto_forte}
                  onChange={(e) => setFitCultural({ ...fitCultural, ponto_forte: e.target.value })}
                />
              </div>

              {/* 6. Área de desenvolvimento */}
              <div>
                <Label className="text-[#00141D]">
                  {FIT_CULTURAL_QUESTIONS.area_desenvolvimento.label} <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  className="mt-1 border-[#36404A]/20"
                  rows={3}
                  value={fitCultural.area_desenvolvimento}
                  onChange={(e) => setFitCultural({ ...fitCultural, area_desenvolvimento: e.target.value })}
                />
              </div>

              {/* 7. Situação de aprendizado */}
              <div>
                <Label className="text-[#00141D]">
                  {FIT_CULTURAL_QUESTIONS.situacao_aprendizado.label} <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  className="mt-1 border-[#36404A]/20"
                  rows={4}
                  value={fitCultural.situacao_aprendizado}
                  onChange={(e) => setFitCultural({ ...fitCultural, situacao_aprendizado: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Password if required */}
          {linkData?.requires_password && (
            <Card className="border-[#FFCD00] bg-white">
              <CardContent className="pt-6">
                <Label htmlFor="password" className="text-[#00141D]">
                  Senha de acesso <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Digite a senha fornecida"
                  className="mt-1 border-[#36404A]/20"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </CardContent>
            </Card>
          )}

          {/* LGPD Consent */}
          <div className="flex items-start gap-3 p-4 bg-[#FFCD00]/10 rounded-lg border border-[#FFCD00]/30">
            <Checkbox
              id="lgpd"
              checked={lgpdConsent}
              onCheckedChange={(checked) => setLgpdConsent(checked as boolean)}
              className="mt-1"
            />
            <Label htmlFor="lgpd" className="text-sm text-[#00141D] leading-relaxed cursor-pointer">
              Autorizo o tratamento dos meus dados pessoais para fazer parte do banco de talentos da Rhello, conforme a Lei Geral de Proteção de Dados (LGPD). <span className="text-red-600">*</span>
            </Label>
          </div>

          <Alert className="border-[#36404A]/20">
            <AlertDescription className="text-xs text-[#36404A]">
              Ao enviar, seus dados serão utilizados exclusivamente para processos seletivos e mantidos de forma segura conforme nossa política de privacidade.
            </AlertDescription>
          </Alert>

          {/* Honeypot field */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            style={{ position: 'absolute', left: '-9999px' }}
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#00141D] hover:bg-[#00141D]/90 text-white font-bold py-6 rounded-full text-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Cadastrar no Banco de Talentos"
            )}
          </Button>
        </form>
      </main>

      {/* Footer */}
      <footer className="bg-[#00141D] text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm">
          <p className="text-[#FFFDF6]/70">
            © {new Date().getFullYear()} Rhello Recrutamento & Seleção. Todos os direitos reservados.
          </p>
          <p className="text-[#FFFDF6]/50 mt-2 text-xs">
            Ao enviar seu cadastro, seus dados serão tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </div>
  );
}
