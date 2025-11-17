import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Vagas from "./pages/Vagas";
import VagaForm from "./pages/VagaForm";
import PublicVagaForm from "./pages/PublicVagaForm";
import VagaDetalhes from "./pages/VagaDetalhes";
import ShareJob from "./pages/ShareJob";
import ClientView from "./pages/ClientView";
import FeedbackCliente from "./pages/FeedbackCliente";
import FeedbacksPendentes from "./pages/FeedbacksPendentes";
import Candidatos from "./pages/Candidatos";
import CandidatoForm from "./pages/CandidatoForm";
import CandidatoDetalhes from "./pages/CandidatoDetalhes";
import FunilCandidatos from "./pages/FunilCandidatos";
import BancoTalentos from "./pages/BancoTalentos";
import Scorecards from "./pages/Scorecards";
import ScorecardForm from "./pages/ScorecardForm";
import Analises from "./pages/Analises";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import GerenciarExclusoes from "./pages/GerenciarExclusoes";
import AuditLog from "./pages/AuditLog";
import EstudoMercado from "./pages/EstudoMercado";
import WhatsAppTemplates from "./pages/WhatsAppTemplates";
import Relatorios from "./pages/Relatorios";
import Acompanhamento from "./pages/Acompanhamento";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();
const App = () => <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/solicitar-vaga" element={<PublicVagaForm />} />
          <Route path="/share/:token" element={<ShareJob />} />
          <Route path="/client-view/:token" element={<ClientView />} />
          <Route path="/feedback/:token" element={<FeedbackCliente />} />
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
            <Route path="/funil-candidatos" element={<FunilCandidatos />} />
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
</ErrorBoundary>;
export default App;