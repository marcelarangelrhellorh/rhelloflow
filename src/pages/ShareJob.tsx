import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Building2,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatSalaryRange } from "@/lib/salaryUtils";

interface ShareLinkData {
  id: string;
  active: boolean;
  expires_at: string | null;
  max_submissions: number | null;
  submissions_count: number;
  requires_password: boolean;
  vagas: {
    id: string;
    titulo: string;
    empresa: string;
    confidencial: boolean;
    responsabilidades: string | null;
    requisitos_obrigatorios: string | null;
    requisitos_desejaveis: string | null;
    beneficios: string[] | null;
    beneficios_outros: string | null;
    modelo_trabalho: string | null;
    horario_inicio: string | null;
    horario_fim: string | null;
    dias_semana: string[] | null;
    salario_min: number | null;
    salario_max: number | null;
    salario_modalidade: string | null;
    cidade: string | null;
    estado: string | null;
  };
}

export default function ShareJob() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkData, setLinkData] = useState<ShareLinkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [protocol, setProtocol] = useState("");
  
  // Password state
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    linkedin: "",
    pretensao_salarial: "",
    disponibilidade_mudanca: "",
    curriculo_url: "",
    portfolio_url: "",
    mensagem: "",
  });

  // UTM tracking
  const utm = {
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
  };

  useEffect(() => {
    loadShareLink();
  }, [token]);

  const loadShareLink = async () => {
    if (!token) {
      setError("Token inválido");
      setLoading(false);
      return;
    }

    try {
      // Chamar edge function com token como query param
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-share-link?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Erro ao carregar link');
      } else {
        setLinkData(data);
        if (data.requires_password) {
          setShowPasswordPrompt(true);
        }
      }
    } catch (err) {
      console.error('Error loading share link:', err);
      setError("Erro ao carregar informações da vaga");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !linkData) return;

    // Validações básicas
    if (!formData.nome_completo || !formData.email || !formData.telefone) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-share-application', {
        body: {
          token,
          candidate: formData,
          password: showPasswordPrompt ? password : undefined,
          utm,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
      } else {
        setProtocol(data.protocol);
        setSubmitted(true);
        toast({
          title: "Candidatura enviada!",
          description: "Recebemos sua candidatura com sucesso",
        });
      }
    } catch (err) {
      console.error('Error submitting application:', err);
      toast({
        title: "Erro",
        description: "Erro ao enviar candidatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Link Indisponível</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-4">
              Se você recebeu este link recentemente, entre em contato com o recrutador responsável.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <CardTitle>Candidatura Enviada!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Recebemos sua candidatura com sucesso.</p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Protocolo:</p>
              <p className="font-mono font-bold text-lg">{protocol}</p>
            </div>
            <Alert>
              <AlertDescription>
                Aguarde o contato do nosso time de recrutamento. Analisaremos seu perfil e entraremos em contato em breve.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!linkData) return null;

  const vaga = linkData.vagas;

  return (
    <div className="min-h-screen bg-background">
      {/* Header com identidade Rhello */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">R</span>
            </div>
            <div>
              <h1 className="font-bold text-xl">Rhello</h1>
              <p className="text-xs text-muted-foreground">Recrutamento & Seleção</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Informações da Vaga */}
        <Card className="mb-8">
          <CardHeader>
            <div className="space-y-3">
              <div>
                <CardTitle className="text-3xl mb-2">{vaga.titulo}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {vaga.confidencial ? "Empresa Confidencial" : vaga.empresa}
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {vaga.modelo_trabalho && (
                  <Badge variant="secondary">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {vaga.modelo_trabalho}
                  </Badge>
                )}
                {(vaga.cidade || vaga.estado) && (
                  <Badge variant="secondary">
                    <MapPin className="h-3 w-3 mr-1" />
                    {[vaga.cidade, vaga.estado].filter(Boolean).join(", ")}
                  </Badge>
                )}
                {vaga.salario_modalidade && vaga.salario_modalidade !== 'A_COMBINAR' && vaga.salario_min && (
                  <Badge variant="secondary">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {vaga.responsabilidades && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Responsabilidades</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{vaga.responsabilidades}</p>
              </div>
            )}

            {vaga.requisitos_obrigatorios && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Requisitos Obrigatórios</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{vaga.requisitos_obrigatorios}</p>
              </div>
            )}

            {vaga.requisitos_desejaveis && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Requisitos Desejáveis</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{vaga.requisitos_desejaveis}</p>
              </div>
            )}

            {(vaga.beneficios && vaga.beneficios.length > 0) && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Benefícios</h3>
                <div className="flex flex-wrap gap-2">
                  {vaga.beneficios.map((beneficio) => (
                    <Badge key={beneficio} variant="outline">{beneficio}</Badge>
                  ))}
                </div>
                {vaga.beneficios_outros && (
                  <p className="text-sm text-muted-foreground mt-2">{vaga.beneficios_outros}</p>
                )}
              </div>
            )}

            {(vaga.horario_inicio || vaga.dias_semana) && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Horário de Trabalho</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {vaga.horario_inicio && vaga.horario_fim && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {vaga.horario_inicio} - {vaga.horario_fim}
                    </div>
                  )}
                  {vaga.dias_semana && vaga.dias_semana.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {vaga.dias_semana.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário de Candidatura */}
        <Card>
          <CardHeader>
            <CardTitle>Candidate-se</CardTitle>
            <CardDescription>
              Preencha o formulário abaixo para se candidatar a esta vaga
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    required
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    required
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    maxLength={2}
                    placeholder="SP"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pretensao_salarial">Pretensão Salarial (R$)</Label>
                  <Input
                    id="pretensao_salarial"
                    type="number"
                    placeholder="0.00"
                    value={formData.pretensao_salarial}
                    onChange={(e) => setFormData({ ...formData, pretensao_salarial: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="curriculo_url">Link do Currículo</Label>
                  <Input
                    id="curriculo_url"
                    placeholder="https://..."
                    value={formData.curriculo_url}
                    onChange={(e) => setFormData({ ...formData, curriculo_url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfólio (opcional)</Label>
                  <Input
                    id="portfolio_url"
                    placeholder="https://..."
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disponibilidade_mudanca">Disponibilidade para Mudança</Label>
                <Input
                  id="disponibilidade_mudanca"
                  placeholder="Ex: Disponível para mudança nacional"
                  value={formData.disponibilidade_mudanca}
                  onChange={(e) => setFormData({ ...formData, disponibilidade_mudanca: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensagem">Mensagem (opcional)</Label>
                <Textarea
                  id="mensagem"
                  rows={4}
                  placeholder="Conte-nos mais sobre você e por que se interessa por esta vaga..."
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                />
              </div>

              {showPasswordPrompt && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="Digite a senha fornecida"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Esta vaga requer uma senha. Se você não possui a senha, entre em contato com o recrutador.
                  </p>
                </div>
              )}

              <Separator />

              <div className="flex items-start gap-2">
                <input type="checkbox" id="privacy" required className="mt-1" />
                <Label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer">
                  Concordo com o tratamento dos meus dados pessoais conforme a LGPD e autorizo o contato para fins de recrutamento.
                </Label>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Candidatura"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Rhello - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
