import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useEmpresaQuery } from "@/hooks/data/useEmpresaQuery";
import { EmpresaHeader } from "@/components/Empresas/EmpresaHeader";
import { EmpresaKPICards } from "@/components/Empresas/EmpresaKPICards";
import { EmpresaInfoCard } from "@/components/Empresas/EmpresaInfoCard";
import { EmpresaReceitaCard } from "@/components/Empresas/EmpresaReceitaCard";
import { EmpresaSociosCard } from "@/components/Empresas/EmpresaSociosCard";
import { EmpresaVagasTable } from "@/components/Empresas/EmpresaVagasTable";
import { EmpresaContratacoesTable } from "@/components/Empresas/EmpresaContratacoesTable";
import { EmpresaLinkedUsersCard } from "@/components/Empresas/EmpresaLinkedUsersCard";
import { EmpresaFormModal } from "@/components/Empresas/EmpresaFormModal";
import { EmpresaCSSelector } from "@/components/Empresas/EmpresaCSSelector";
import { EmpresaNotesSection } from "@/components/Empresas/EmpresaNotesSection";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";

export default function EmpresaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const {
    empresa,
    vagas,
    contratacoes,
    linkedUsers,
    isLoading,
    vagasLoading,
    contratacoesLoading,
    deleteEmpresa,
    refetch,
    vagasAbertas,
    vagasConcluidas,
    totalContratacoes,
  } = useEmpresaQuery(id);

  const handleDelete = async () => {
    try {
      await deleteEmpresa.mutateAsync();
      toast.success("Cliente excluído com sucesso!");
      navigate("/gerenciar-empresas");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao excluir cliente";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="cards" />;
  }

  if (!empresa) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">
            Empresa não encontrada
          </h2>
          <p className="text-muted-foreground mt-2">
            A empresa solicitada não existe ou foi removida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <EmpresaHeader
          nome={empresa.nome}
          status={empresa.status}
          dataPrimeiroContato={empresa.data_primeiro_contato}
          createdAt={empresa.created_at}
          onEdit={() => setShowEditModal(true)}
          onDelete={() => setShowDeleteDialog(true)}
        />

        {/* KPI Cards */}
        <EmpresaKPICards
          vagasAbertas={vagasAbertas}
          vagasConcluidas={vagasConcluidas}
          totalContratacoes={totalContratacoes}
          clienteSince={empresa.data_primeiro_contato || empresa.created_at}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Informações da Empresa */}
            <EmpresaInfoCard empresa={empresa} />

            {/* Dados da Receita Federal */}
            <EmpresaReceitaCard empresa={empresa} />

            {/* Quadro Societário */}
            <EmpresaSociosCard empresa={empresa} />

            {/* Histórico de Contratações */}
            <EmpresaContratacoesTable
              contratacoes={contratacoes}
              isLoading={contratacoesLoading}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* CS Responsável */}
            <EmpresaCSSelector
              empresaId={empresa.id}
              currentCSId={empresa.cs_responsavel_id}
              onUpdate={() => refetch()}
            />

            {/* Usuários Vinculados */}
            <EmpresaLinkedUsersCard users={linkedUsers} />

            {/* Histórico / Anotações */}
            <EmpresaNotesSection empresaId={empresa.id} empresaName={empresa.nome} />

            {/* Histórico de Vagas */}
            <EmpresaVagasTable 
              vagas={vagas} 
              isLoading={vagasLoading} 
              empresaId={empresa.id}
              empresaNome={empresa.nome}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EmpresaFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        empresa={{
          id: empresa.id,
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          setor: empresa.setor,
          porte: empresa.porte,
          status: empresa.status,
          telefone: empresa.telefone,
          email: empresa.email,
          cidade: empresa.cidade,
          estado: empresa.estado,
          created_at: empresa.created_at || "",
          data_primeiro_contato: empresa.data_primeiro_contato,
          pipeline_stage: empresa.pipeline_stage,
        }}
        onSuccess={() => {
          setShowEditModal(false);
          toast.success("Empresa atualizada com sucesso!");
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{empresa.nome}</strong>? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
