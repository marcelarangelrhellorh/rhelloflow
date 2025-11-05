import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  TrendingUp,
  Award
} from "lucide-react";
import { formatSalaryRange } from "@/lib/salaryUtils";
import { ApplicationModal } from "@/components/ShareJob/ApplicationModal";
import logoLight from "@/assets/logo-rhello-light.png";

interface ShareLinkData {
  id: string;
  active: boolean;
  expires_at: string | null;
  max_submissions: number | null;
  submissions_count: number;
  requires_password: boolean;
  created_at: string;
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
    observacoes: string | null;
    prioridade: string | null;
    complexidade: string | null;
    criado_em: string;
  };
}

export default function ShareJob() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState<ShareLinkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("sobre");
  const [shareConfig, setShareConfig] = useState<any>(null);

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
        setShareConfig(data.share_config || {
          exibir_sobre: true,
          exibir_responsabilidades: true,
          exibir_requisitos: true,
          exibir_beneficios: true,
          exibir_localizacao: true,
          exibir_salario: true,
          empresa_confidencial: false,
          exibir_observacoes: true,
        });
        // Track page view
        // TODO: Add analytics tracking
      }
    } catch (err) {
      console.error('Error loading share link:', err);
      setError("Erro ao carregar informações da vaga");
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getDaysOpen = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading || !shareConfig) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFCD00]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-[#36404A]/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-xl font-bold">Link Indisponível</h2>
            </div>
            <p className="text-[#36404A] mb-4">{error}</p>
            <p className="text-sm text-[#36404A]/70">
              Esta vaga não está mais disponível ou o link expirou. Entre em contato com o recrutador responsável.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FFFDF6] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-[#FFCD00]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle className="h-5 w-5" />
              <h2 className="text-xl font-bold text-[#00141D]">Candidatura Enviada!</h2>
            </div>
            <p className="text-[#36404A] mb-4">Recebemos sua candidatura com sucesso.</p>
            <div className="p-4 bg-[#FFCD00]/10 rounded-lg border border-[#FFCD00]/30 mb-4">
              <p className="text-sm text-[#36404A] font-medium">Protocolo:</p>
              <p className="font-mono font-bold text-lg text-[#00141D]">{protocol}</p>
            </div>
            <Alert className="border-[#36404A]/20">
              <AlertDescription className="text-[#36404A]">
                Nosso time de recrutamento analisará seu perfil e entrará em contato em breve. 
                Tempo estimado de retorno: <strong>até 5 dias úteis</strong>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!linkData) return null;

  const vaga = linkData.vagas;
  const daysOpen = getDaysOpen(vaga.criado_em);

  return (
    <div className="min-h-screen bg-[#FFFDF6] font-['Manrope',system-ui,sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-[#36404A]/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoLight} alt="Rhello" className="h-8" />
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              className="hidden md:flex bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D] font-bold rounded-full px-6"
            >
              Candidatar-se
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-[#36404A]/10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Content */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#00141D] mb-2">
                  {vaga.titulo}
                </h1>
                <p className="text-lg text-[#36404A]">
                  {shareConfig.empresa_confidencial ? "Empresa Confidencial" : vaga.empresa}
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {shareConfig.exibir_localizacao && vaga.modelo_trabalho && (
                  <Badge className="bg-[#FFCD00]/20 text-[#00141D] border-[#FFCD00]/40 hover:bg-[#FFCD00]/30">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {vaga.modelo_trabalho}
                  </Badge>
                )}
                {shareConfig.exibir_salario && vaga.salario_modalidade && vaga.salario_modalidade !== 'A_COMBINAR' && vaga.salario_min && (
                  <Badge className="bg-[#FAEC3E]/20 text-[#00141D] border-[#FAEC3E]/40 hover:bg-[#FAEC3E]/30">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
                  </Badge>
                )}
                {vaga.prioridade && (
                  <Badge variant="outline" className="border-[#36404A]/20">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {vaga.prioridade}
                  </Badge>
                )}
                {vaga.complexidade && (
                  <Badge variant="outline" className="border-[#36404A]/20">
                    <Award className="h-3 w-3 mr-1" />
                    {vaga.complexidade}
                  </Badge>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 text-sm text-[#36404A]">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFDF6] rounded-md border border-[#36404A]/10">
                  <Clock className="h-4 w-4" />
                  {daysOpen} dias no ar
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFDF6] rounded-md border border-[#36404A]/10">
                  <Users className="h-4 w-4" />
                  {linkData.submissions_count} candidatos
                </span>
              </div>
            </div>

            {/* CTA Desktop */}
            <div className="hidden md:block flex-shrink-0">
              <Button
                onClick={() => setModalOpen(true)}
                size="lg"
                className="bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D] font-bold rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Candidatar-se
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-[#36404A]/10 sticky top-[73px] z-30">
        <div className="max-w-6xl mx-auto px-4">
          <ul className="flex gap-8 overflow-x-auto">
            {[
              shareConfig.exibir_sobre && { id: "sobre", label: "Sobre a vaga" },
              shareConfig.exibir_responsabilidades && { id: "responsabilidades", label: "Responsabilidades" },
              shareConfig.exibir_requisitos && { id: "requisitos", label: "Requisitos" },
              shareConfig.exibir_beneficios && { id: "beneficios", label: "Benefícios" },
              (vaga.horario_inicio || vaga.dias_semana) && { id: "horario", label: "Horário" },
            ].filter(Boolean).map((section: any) => (
              <li key={section.id}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeSection === section.id
                      ? "border-[#FFCD00] text-[#00141D]"
                      : "border-transparent text-[#36404A] hover:text-[#00141D]"
                  }`}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Sobre a vaga */}
        {shareConfig.exibir_sobre && (
          <section id="sobre" className="scroll-mt-32">
            <Card className="border-[#36404A]/20">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[#00141D] mb-4">Sobre a vaga</h2>
                <div className="prose prose-sm max-w-none text-[#36404A] whitespace-pre-wrap">
                  {shareConfig.texto_sobre_customizado || vaga.observacoes || "Estamos em busca de um profissional qualificado para integrar nossa equipe e contribuir para o crescimento da empresa."}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Responsabilidades */}
        {shareConfig.exibir_responsabilidades && vaga.responsabilidades && (
          <section id="responsabilidades" className="scroll-mt-32">
            <Card className="border-[#36404A]/20">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[#00141D] mb-4">Responsabilidades</h2>
                <div className="prose prose-sm max-w-none text-[#36404A] whitespace-pre-wrap">
                  {shareConfig.responsabilidades_customizadas || vaga.responsabilidades}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Requisitos */}
        {shareConfig.exibir_requisitos && (
          <section id="requisitos" className="scroll-mt-32">
            <Card className="border-[#36404A]/20">
              <CardContent className="p-6 space-y-6">
                {vaga.requisitos_obrigatorios && (
                  <div>
                    <h3 className="text-xl font-bold text-[#00141D] mb-3">Requisitos Obrigatórios</h3>
                    <div className="prose prose-sm max-w-none text-[#36404A] whitespace-pre-wrap">
                      {shareConfig.requisitos_customizados || vaga.requisitos_obrigatorios}
                    </div>
                  </div>
                )}
                {vaga.requisitos_desejaveis && (
                  <div>
                    <h3 className="text-xl font-bold text-[#00141D] mb-3">Requisitos Desejáveis</h3>
                    <div className="prose prose-sm max-w-none text-[#36404A] whitespace-pre-wrap">
                      {vaga.requisitos_desejaveis}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Benefícios */}
        {shareConfig.exibir_beneficios && vaga.beneficios && vaga.beneficios.length > 0 && (
          <section id="beneficios" className="scroll-mt-32">
            <Card className="border-[#36404A]/20">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[#00141D] mb-4">Benefícios</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {vaga.beneficios.map((beneficio) => (
                    <Badge 
                      key={beneficio}
                      className="bg-[#FFCD00]/20 text-[#00141D] border-[#FFCD00]/40 hover:bg-[#FFCD00]/30"
                    >
                      {beneficio}
                    </Badge>
                  ))}
                </div>
                {vaga.beneficios_outros && (
                  <p className="text-sm text-[#36404A] mt-3">{vaga.beneficios_outros}</p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Horário */}
        {(vaga.horario_inicio || vaga.dias_semana) && (
          <section id="horario" className="scroll-mt-32">
            <Card className="border-[#36404A]/20">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[#00141D] mb-4">Horário de Trabalho</h2>
                <div className="flex flex-wrap gap-4 text-[#36404A]">
                  {vaga.horario_inicio && vaga.horario_fim && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFDF6] rounded-lg border border-[#36404A]/10">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">{vaga.horario_inicio} - {vaga.horario_fim}</span>
                    </div>
                  )}
                  {vaga.dias_semana && vaga.dias_semana.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFDF6] rounded-lg border border-[#36404A]/10">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">{vaga.dias_semana.join(", ")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {/* Fixed Bottom CTA (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#36404A]/10 p-4 shadow-lg z-40">
        <Button
          onClick={() => setModalOpen(true)}
          className="w-full bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D] font-bold rounded-full py-6 text-lg"
        >
          Candidatar-se
        </Button>
      </div>

      {/* Footer */}
      <footer className="bg-[#00141D] text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="text-[#FFFDF6]/70">
            © {new Date().getFullYear()} Rhello Recrutamento & Seleção. Todos os direitos reservados.
          </p>
          <p className="text-[#FFFDF6]/50 mt-2 text-xs">
            Ao enviar sua candidatura, seus dados serão tratados conforme a LGPD.
          </p>
        </div>
      </footer>

      {/* Application Modal */}
      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        vagaId={vaga.id}
        vagaTitulo={vaga.titulo}
        empresaNome={shareConfig.empresa_confidencial ? "Empresa Confidencial" : vaga.empresa}
        token={token!}
        requiresPassword={linkData.requires_password}
        onSuccess={(protocol) => {
          setProtocol(protocol);
          setSubmitted(true);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
