import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/skeletons/PageSkeleton";

// Lazy load all pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vagas = lazy(() => import("./pages/Vagas"));
const VagaForm = lazy(() => import("./pages/VagaForm"));
const PublicVagaForm = lazy(() => import("./pages/PublicVagaForm"));
const VagaDetalhes = lazy(() => import("./pages/VagaDetalhes"));
const ShareJob = lazy(() => import("./pages/ShareJob"));
const ClientView = lazy(() => import("./pages/ClientView"));
const FeedbackCliente = lazy(() => import("./pages/FeedbackCliente"));
const FeedbacksPendentes = lazy(() => import("./pages/FeedbacksPendentes"));
const Candidatos = lazy(() => import("./pages/Candidatos"));
const CandidatoForm = lazy(() => import("./pages/CandidatoForm"));
const CandidatoDetalhes = lazy(() => import("./pages/CandidatoDetalhes"));
const BancoTalentos = lazy(() => import("./pages/BancoTalentos"));
const TalentPoolForm = lazy(() => import("./pages/TalentPoolForm"));
const Scorecards = lazy(() => import("./pages/Scorecards"));
const ScorecardForm = lazy(() => import("./pages/ScorecardForm"));
const Analises = lazy(() => import("./pages/Analises"));
const GerenciarUsuarios = lazy(() => import("./pages/GerenciarUsuarios"));
const GerenciarExclusoes = lazy(() => import("./pages/GerenciarExclusoes"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const EstudoMercado = lazy(() => import("./pages/EstudoMercado"));
const WhatsAppTemplates = lazy(() => import("./pages/WhatsAppTemplates"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Acompanhamento = lazy(() => import("./pages/Acompanhamento"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const GerenciarEmpresas = lazy(() => import("./pages/GerenciarEmpresas"));
const EmpresaDetalhes = lazy(() => import("./pages/EmpresaDetalhes"));
const GoogleCalendarCallback = lazy(() => import("./pages/GoogleCalendarCallback"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const ComparadorCargos = lazy(() => import("./pages/ComparadorCargos"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const App = () => <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton variant="cards" />}>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/auth/callback" element={<GoogleCalendarCallback />} />
            <Route path="/solicitar-vaga" element={<PublicVagaForm />} />
            <Route path="/share/:token" element={<ShareJob />} />
            <Route path="/client-view/:token" element={<ClientView />} />
            <Route path="/feedback/:token" element={<FeedbackCliente />} />
            <Route path="/banco-talentos/:token" element={<TalentPoolForm />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vagas" element={<Vagas />} />
              <Route path="/vagas/nova" element={<VagaForm />} />
              <Route path="/vagas/:id" element={<VagaDetalhes />} />
              <Route path="/vagas/:id/editar" element={<VagaForm />} />
              <Route path="/candidatos" element={<Candidatos />} />
              <Route path="/candidatos/novo" element={<CandidatoForm />} />
              <Route path="/candidatos/:id" element={<CandidatoDetalhes />} />
              <Route path="/candidatos/:id/editar" element={<CandidatoForm />} />
              
              <Route path="/banco-talentos" element={<BancoTalentos />} />
              <Route path="/feedbacks-pendentes" element={<FeedbacksPendentes />} />
              <Route path="/scorecards" element={<Scorecards />} />
              <Route path="/scorecards/novo" element={<ScorecardForm />} />
              <Route path="/scorecards/:id/editar" element={<ScorecardForm />} />
              <Route path="/analises" element={<Analises />} />
              <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
              <Route path="/gerenciar-exclusoes" element={<GerenciarExclusoes />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/estudo-mercado" element={<EstudoMercado />} />
              <Route path="/whatsapp-templates" element={<WhatsAppTemplates />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/acompanhamento" element={<Acompanhamento />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/gerenciar-empresas" element={<GerenciarEmpresas />} />
              <Route path="/empresas/:id" element={<EmpresaDetalhes />} />
              <Route path="/comparador-cargos" element={<ComparadorCargos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>;
export default App;