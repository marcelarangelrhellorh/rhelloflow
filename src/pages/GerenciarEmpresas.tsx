import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Eye, Pencil } from "lucide-react";
import { EmpresaFormModal } from "@/components/Empresas/EmpresaFormModal";
import { EmpresaDetailsDrawer } from "@/components/Empresas/EmpresaDetailsDrawer";
import { toast } from "sonner";

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
};

export default function GerenciarEmpresas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const { data: empresas, isLoading, refetch } = useQuery({
    queryKey: ["empresas", searchTerm, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("empresas")
        .select("*")
        .order("nome");

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`);
      }

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Empresa[];
    },
  });

  const handleEdit = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setFormModalOpen(true);
  };

  const handleViewDetails = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setDetailsDrawerOpen(true);
  };

  const handleCloseModal = () => {
    setFormModalOpen(false);
    setSelectedEmpresa(null);
  };

  const handleSuccess = () => {
    refetch();
    toast.success("Empresa salva com sucesso!");
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "ativo":
        return "bg-green-100 text-green-800 border-green-200";
      case "inativo":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "prospect":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#00141D] flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Gerenciar Clientes
            </h1>
            <p className="text-[#36404A] mt-1">
              Cadastro completo de empresas e histórico de processos
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedEmpresa(null);
              setFormModalOpen(true);
            }}
            className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#36404A]" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "todos" ? "default" : "outline"}
              onClick={() => setFilterStatus("todos")}
              className={filterStatus === "todos" ? "bg-[#00141D] text-white" : ""}
            >
              Todos
            </Button>
            <Button
              variant={filterStatus === "ativo" ? "default" : "outline"}
              onClick={() => setFilterStatus("ativo")}
              className={filterStatus === "ativo" ? "bg-green-600 text-white" : ""}
            >
              Ativos
            </Button>
            <Button
              variant={filterStatus === "prospect" ? "default" : "outline"}
              onClick={() => setFilterStatus("prospect")}
              className={filterStatus === "prospect" ? "bg-blue-600 text-white" : ""}
            >
              Prospects
            </Button>
            <Button
              variant={filterStatus === "inativo" ? "default" : "outline"}
              onClick={() => setFilterStatus("inativo")}
              className={filterStatus === "inativo" ? "bg-gray-600 text-white" : ""}
            >
              Inativos
            </Button>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : empresas && empresas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresas.map((empresa) => (
              <Card
                key={empresa.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-gray-300"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-[#00141D] line-clamp-1">
                        {empresa.nome}
                      </h3>
                      {empresa.cnpj && (
                        <p className="text-sm text-[#36404A]">CNPJ: {empresa.cnpj}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(empresa.status)}>
                      {empresa.status || "ativo"}
                    </Badge>
                  </div>

                  {empresa.setor && (
                    <p className="text-sm text-[#36404A]">
                      <span className="font-semibold">Setor:</span> {empresa.setor}
                    </p>
                  )}

                  {empresa.porte && (
                    <p className="text-sm text-[#36404A]">
                      <span className="font-semibold">Porte:</span> {empresa.porte}
                    </p>
                  )}

                  {(empresa.cidade || empresa.estado) && (
                    <p className="text-sm text-[#36404A]">
                      <span className="font-semibold">Localização:</span>{" "}
                      {empresa.cidade}
                      {empresa.cidade && empresa.estado && ", "}
                      {empresa.estado}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(empresa)}
                      className="flex-1"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(empresa)}
                      className="flex-1"
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Building2 className="h-12 w-12 text-[#36404A] mx-auto mb-4" />
            <p className="text-[#36404A]">
              Nenhum cliente encontrado. Cadastre o primeiro cliente!
            </p>
          </Card>
        )}
      </div>

      <EmpresaFormModal
        open={formModalOpen}
        onClose={handleCloseModal}
        empresa={selectedEmpresa}
        onSuccess={handleSuccess}
      />

      <EmpresaDetailsDrawer
        open={detailsDrawerOpen}
        onClose={() => {
          setDetailsDrawerOpen(false);
          setSelectedEmpresa(null);
        }}
        empresaId={selectedEmpresa?.id || ""}
      />
    </div>
  );
}
