import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Vagas from "./pages/Vagas";
import VagaForm from "./pages/VagaForm";
import PublicVagaForm from "./pages/PublicVagaForm";
import VagaDetalhes from "./pages/VagaDetalhes";
import FunilVagas from "./pages/FunilVagas";
import Candidatos from "./pages/Candidatos";
import CandidatoForm from "./pages/CandidatoForm";
import CandidatoDetalhes from "./pages/CandidatoDetalhes";
import FunilCandidatos from "./pages/FunilCandidatos";
import BancoTalentos from "./pages/BancoTalentos";
import Analises from "./pages/Analises";
import Relatorios from "./pages/Relatorios";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/solicitar-vaga" element={<PublicVagaForm />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vagas" element={<Vagas />} />
            <Route path="/vagas/nova" element={<VagaForm />} />
            <Route path="/vagas/:id" element={<VagaDetalhes />} />
            <Route path="/vagas/:id/editar" element={<VagaForm />} />
            <Route path="/funil-vagas" element={<FunilVagas />} />
            <Route path="/candidatos" element={<Candidatos />} />
            <Route path="/candidatos/novo" element={<CandidatoForm />} />
            <Route path="/candidatos/:id" element={<CandidatoDetalhes />} />
            <Route path="/candidatos/:id/editar" element={<CandidatoForm />} />
            <Route path="/funil-candidatos" element={<FunilCandidatos />} />
            <Route path="/banco-talentos" element={<BancoTalentos />} />
            <Route path="/analises" element={<Analises />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
