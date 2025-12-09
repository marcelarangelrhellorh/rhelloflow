import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Eye, Pencil, LayoutGrid, List, FileSpreadsheet, Kanban } from "lucide-react";
import { EmpresaFormModal } from "@/components/Empresas/EmpresaFormModal";
import { ImportEmpresasModal } from "@/components/Empresas/ImportEmpresasModal";
import { ClientPipelineBoard } from "@/components/Empresas/ClientPipelineBoard";
import { EmpresasDashboard } from "@/components/Empresas/EmpresasDashboard";
import { EmpresasRecentList } from "@/components/Empresas/EmpresasRecentList";
import { useEmpresaPrefetch } from "@/hooks/data/useEmpresaPrefetch";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { CardSkeletonGrid } from "@/components/skeletons/CardSkeleton";
type Empresa = {
  id: string;
  nome: string;
  cnpj: string | null;
  setor: string | null;
  porte: string | null;
  status: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
  data_primeiro_contato: string | null;
  pipeline_stage?: string | null;
};
export default function GerenciarEmpresas() {
  const navigate = useNavigate();
  const {
    prefetchEmpresa
  } = useEmpresaPrefetch();
  const [searchTerm, setSearchTerm] = useState("");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"cards" | "list" | "funnel">("cards");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const {
    data: empresas,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["empresas", searchTerm, filterStatus],
    queryFn: async () => {
      let query = supabase.from("empresas").select("*").order("nome");
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`);
      }
      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return data as Empresa[];
    }
  });
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex
  } = usePagination(empresas || [], 12);
  const handleEdit = useCallback((empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFormModalOpen(true);
  }, []);
  const handleViewDetails = useCallback((empresa: Empresa) => {
    navigate(`/empresas/${empresa.id}`);
  }, [navigate]);
  const handleCloseModal = useCallback(() => {
    setFormModalOpen(false);
    setSelectedEmpresa(null);
  }, []);
  const handleSuccess = useCallback(() => {
    refetch();
    toast.success("Empresa salva com sucesso!");
  }, [refetch]);
  const getStatusColor = useCallback((status: string | null) => {
    switch (status) {
      case "ativo":
        return "bg-green-100 text-green-800 border-green-200";
      case "inativo":
        return "bg-red-100 text-red-800 border-red-200";
      case "prospect":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);
  const handleClientMove = useCallback(async (empresaId: string, fromSlug: string, toSlug: string) => {
    try {
      const {
        error
      } = await supabase.from("empresas").update({
        pipeline_stage: toSlug
      }).eq("id", empresaId);
      if (error) throw error;
      toast.success("Cliente movido com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao mover cliente");
    }
  }, [refetch]);
  return <div className="min-h-screen bg-[#FFFBF0] p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#00141D] flex items-center gap-2">
              Gerenciar Clientes
            </h1>
            <p className="text-[#36404A] mt-1">
              Cadastro completo de empresas e histórico de processos
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setImportModalOpen(true)} variant="outline" className="font-semibold">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
            <Button onClick={() => {
            setSelectedEmpresa(null);
            setFormModalOpen(true);
          }} className="bg-[#00141D] hover:bg-[#00141D]/90 text-white font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Layout 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna Principal (3/4) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filters and View Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#36404A]" />
                <Input placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <Button variant={filterStatus === "todos" ? "default" : "outline"} onClick={() => setFilterStatus("todos")} className={filterStatus === "todos" ? "bg-[#00141D] text-white" : ""}>
                    Todos
                  </Button>
                  <Button variant={filterStatus === "ativo" ? "default" : "outline"} onClick={() => setFilterStatus("ativo")} className={filterStatus === "ativo" ? "bg-green-600 text-white" : ""}>
                    Ativos
                  </Button>
                  <Button variant={filterStatus === "prospect" ? "default" : "outline"} onClick={() => setFilterStatus("prospect")} className={filterStatus === "prospect" ? "bg-blue-600 text-white" : ""}>
                    Prospects
                  </Button>
                  <Button variant={filterStatus === "inativo" ? "default" : "outline"} onClick={() => setFilterStatus("inativo")} className={filterStatus === "inativo" ? "bg-red-600 text-white" : ""}>
                    Inativos
                  </Button>
                </div>
                <div className="flex gap-1 border rounded-md">
                  <Button variant="ghost" size="sm" onClick={() => setViewMode("cards")} className={viewMode === "cards" ? "bg-muted" : ""}>
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-muted" : ""}>
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setViewMode("funnel")} className={viewMode === "funnel" ? "bg-muted" : ""}>
                    <Kanban className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            {isLoading ? <CardSkeletonGrid count={6} /> : empresas && empresas.length > 0 ? viewMode === "funnel" ? <div className="overflow-x-auto">
                <ClientPipelineBoard empresas={empresas} onClientClick={handleViewDetails} onClientMove={handleClientMove} />
              </div> : viewMode === "cards" ? <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedData.map(empresa => <Card key={empresa.id} className="p-4 transition-shadow cursor-pointer border-gray-300 shadow-md hover:shadow-lg">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg line-clamp-1 text-[#00141d]">
                              {empresa.nome}
                            </h3>
                            {empresa.cnpj && <p className="text-sm text-[#36404A]">CNPJ: {empresa.cnpj}</p>}
                          </div>
                          <Badge className={getStatusColor(empresa.status)}>
                            {(empresa.status || "ativo").charAt(0).toUpperCase() + (empresa.status || "ativo").slice(1)}
                          </Badge>
                        </div>

                        {empresa.setor && <p className="text-sm text-[#36404A]">
                          <span className="font-semibold">Setor:</span> {empresa.setor}
                        </p>}

                        {empresa.porte && <p className="text-sm text-[#36404A]">
                          <span className="font-semibold">Porte:</span> {empresa.porte}
                        </p>}

                        {(empresa.cidade || empresa.estado) && <p className="text-sm text-[#36404A]">
                          <span className="font-semibold">Localização:</span>{" "}
                          {empresa.cidade}
                          {empresa.cidade && empresa.estado && ", "}
                          {empresa.estado}
                        </p>}

                        <div className="flex gap-1.5 pt-2 border-t border-gray-200">
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(empresa)} className="px-2 py-1 h-7 text-xs bg-[#00141d] text-white">
                            <Eye className="mr-1 h-2.5 w-2.5" />
                            Detalhes
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(empresa)} className="px-2 py-1 h-7 text-xs">
                            <Pencil className="mr-1 h-2.5 w-2.5" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </Card>)}
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} canGoPrevious={canGoPrevious} canGoNext={canGoNext} startIndex={startIndex} endIndex={endIndex} totalItems={empresas?.length || 0} />
              </> : <Card className="border-gray-300 shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Porte</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresas.map(empresa => <TableRow key={empresa.id}>
                        <TableCell className="font-semibold text-[#00141D]">
                          {empresa.nome}
                        </TableCell>
                        <TableCell className="text-[#36404A]">{empresa.cnpj || "-"}</TableCell>
                        <TableCell className="text-[#36404A]">{empresa.setor || "-"}</TableCell>
                        <TableCell className="text-[#36404A]">{empresa.porte || "-"}</TableCell>
                        <TableCell className="text-[#36404A]">
                          {empresa.cidade && empresa.estado ? `${empresa.cidade}, ${empresa.estado}` : empresa.cidade || empresa.estado || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(empresa.status)}>
                            {(empresa.status || "ativo").charAt(0).toUpperCase() + (empresa.status || "ativo").slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleViewDetails(empresa)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(empresa)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </Card> : <Card className="p-8 text-center border-gray-300 shadow-md">
                <Building2 className="h-12 w-12 text-[#36404A] mx-auto mb-4" />
                <p className="text-[#36404A]">
                  Nenhum cliente encontrado. Cadastre o primeiro cliente!
                </p>
              </Card>}
          </div>

          {/* Sidebar Direita (1/4) */}
          <div className="lg:col-span-1 space-y-4">
            <EmpresasDashboard empresas={empresas || []} />
            <EmpresasRecentList empresas={empresas || []} onViewDetails={handleViewDetails} />
          </div>
        </div>
      </div>

      <EmpresaFormModal open={formModalOpen} onClose={handleCloseModal} empresa={selectedEmpresa} onSuccess={handleSuccess} />
      <ImportEmpresasModal open={importModalOpen} onOpenChange={setImportModalOpen} onSuccess={refetch} />
    </div>;
}