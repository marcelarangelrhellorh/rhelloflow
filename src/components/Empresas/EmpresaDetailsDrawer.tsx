import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
import { 
  Building2, Mail, Phone, Globe, MapPin, User, Briefcase, FileText, 
  TrendingUp, Users, Pencil, Trash2, UserCircle, CheckCircle2, XCircle,
  Calendar, Banknote, Factory
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AtividadeEconomica {
  code: string;
  text: string;
}

interface Socio {
  nome: string;
  qual: string;
}

interface EmpresaDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  empresaId: string;
  onEdit?: () => void;
  onDeleted?: () => void;
}

// Utility to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function EmpresaDetailsDrawer({
  open,
  onClose,
  empresaId,
  onEdit,
  onDeleted,
}: EmpresaDetailsDrawerProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: empresa
  } = useQuery({
    queryKey: ["empresa-details", empresaId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && open
  });
  const {
    data: vagas
  } = useQuery({
    queryKey: ["empresa-vagas", empresaId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("vagas").select("id, titulo, status, criado_em, status_slug").eq("empresa_id", empresaId).is("deleted_at", null).order("criado_em", {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && open
  });

  const {
    data: linkedUsers
  } = useQuery({
    queryKey: ["empresa-linked-users", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("empresa_id", empresaId);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && open
  });

  const {
    data: contratacoes
  } = useQuery({
    queryKey: ["empresa-contratacoes", empresaId],
    queryFn: async () => {
      const {
        data: vagasData
      } = await supabase.from("vagas").select("id").eq("empresa_id", empresaId).is("deleted_at", null);
      if (!vagasData || vagasData.length === 0) return [];
      const vagaIds = vagasData.map(v => v.id);
      const {
        data,
        error
      } = await supabase.from("candidatos").select("id, nome_completo, vaga_relacionada_id, criado_em").in("vaga_relacionada_id", vagaIds).eq("status", "Contratado").is("deleted_at", null).order("criado_em", {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && open
  });

  if (!empresa) return null;

  const vagasAbertas = vagas?.filter(v => v.status_slug !== "concluida" && v.status_slug !== "cancelada").length || 0;
  const vagasConcluidas = vagas?.filter(v => v.status_slug === "concluida").length || 0;
  const totalContratacoes = contratacoes?.length || 0;

  const getStatusColor = (status: string | null) => {
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
  };

  const handleDelete = async () => {
    if (!empresaId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("empresas")
        .delete()
        .eq("id", empresaId);

      if (error) throw error;

      toast.success("Cliente excluído com sucesso!");
      setShowDeleteDialog(false);
      onClose();
      onDeleted?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir cliente");
    } finally {
      setIsDeleting(false);
    }
  };

  // Parse JSONB fields
  const atividadePrincipal = (empresa.atividade_principal as unknown as AtividadeEconomica[]) || [];
  const atividadesSecundarias = (empresa.atividades_secundarias as unknown as AtividadeEconomica[]) || [];
  const quadroSocietario = (empresa.quadro_societario as unknown as Socio[]) || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-2xl">
                <Building2 className="h-6 w-6" />
                {empresa.nome}
              </SheetTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit?.();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Status e Métricas */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(empresa.status)}>
                {empresa.status || "ativo"}
              </Badge>
              <div className="text-sm text-[#36404A]">
                Cliente desde{" "}
                {empresa.data_primeiro_contato ? format(new Date(empresa.data_primeiro_contato), "dd/MM/yyyy", {
                  locale: ptBR
                }) : format(new Date(empresa.created_at), "dd/MM/yyyy", {
                  locale: ptBR
                })}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center border-gray-300 shadow-lg">
                <div className="text-2xl font-bold text-[#00141D]">{vagasAbertas}</div>
                <div className="text-sm text-[#36404A]">Vagas Abertas</div>
              </Card>
              <Card className="p-4 text-center border-gray-300 shadow-lg">
                <div className="text-2xl font-bold text-[#00141D]">{vagasConcluidas}</div>
                <div className="text-sm text-[#36404A]">Vagas Concluídas</div>
              </Card>
              <Card className="p-4 text-center border-gray-300 shadow-lg">
                <div className="text-2xl font-bold text-[#00141D]">{totalContratacoes}</div>
                <div className="text-sm text-[#36404A]">Contratações</div>
              </Card>
            </div>

            {/* Dados da Receita Federal */}
            {empresa.situacao_cadastral && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-[#00141D] flex items-center gap-2">
                    <Factory className="h-5 w-5" />
                    Dados da Receita Federal
                  </h3>

                  <Card className="p-4 space-y-4 border-blue-200 bg-blue-50/30">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Situação Cadastral */}
                      <div className="flex items-center gap-2">
                        <span className="text-[#36404A]">Situação:</span>
                        <Badge 
                          variant={empresa.situacao_cadastral === 'ATIVA' ? 'default' : 'destructive'}
                          className="flex items-center gap-1"
                        >
                          {empresa.situacao_cadastral === 'ATIVA' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {empresa.situacao_cadastral}
                        </Badge>
                        {empresa.data_situacao_cadastral && (
                          <span className="text-xs text-muted-foreground">
                            desde {empresa.data_situacao_cadastral}
                          </span>
                        )}
                      </div>

                      {/* Data de Abertura */}
                      {empresa.data_abertura && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#36404A]" />
                          <span className="text-[#36404A]">Abertura:</span>
                          <span className="font-medium text-[#00141D]">
                            {empresa.data_abertura}
                          </span>
                        </div>
                      )}

                      {/* Natureza Jurídica */}
                      {empresa.natureza_juridica && (
                        <div className="col-span-2 flex items-start gap-2">
                          <FileText className="h-4 w-4 text-[#36404A] mt-0.5" />
                          <div>
                            <span className="text-[#36404A]">Natureza Jurídica:</span>
                            <span className="font-medium text-[#00141D] ml-2">
                              {empresa.natureza_juridica}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Capital Social */}
                      {empresa.capital_social && empresa.capital_social > 0 && (
                        <div className="col-span-2 flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-[#36404A]" />
                          <span className="text-[#36404A]">Capital Social:</span>
                          <span className="font-medium text-[#00141D]">
                            {formatCurrency(empresa.capital_social)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Atividade Principal */}
                    {atividadePrincipal.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-sm text-[#00141D]">Atividade Principal</h4>
                        <div className="bg-background rounded-lg p-3 border">
                          {atividadePrincipal.map((atividade, index) => (
                            <div key={index}>
                              <span className="text-xs text-muted-foreground font-mono">
                                {atividade.code}
                              </span>
                              <p className="text-sm text-[#00141D]">{atividade.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Atividades Secundárias */}
                    {atividadesSecundarias.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-sm text-[#00141D]">
                          Atividades Secundárias ({atividadesSecundarias.length})
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto bg-background rounded-lg border p-2">
                          {atividadesSecundarias.map((atividade, index) => (
                            <div key={index} className="text-sm p-2 hover:bg-muted/50 rounded">
                              <span className="text-xs text-muted-foreground font-mono">{atividade.code}</span>
                              <p className="text-xs text-[#36404A]">{atividade.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Última consulta */}
                    {empresa.cnpj_consultado_em && (
                      <p className="text-xs text-muted-foreground text-right">
                        Última consulta: {format(new Date(empresa.cnpj_consultado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </Card>
                </div>
              </>
            )}

            {/* Quadro Societário */}
            {quadroSocietario.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-[#00141D] flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Quadro Societário ({quadroSocietario.length})
                  </h3>
                  <div className="space-y-2">
                    {quadroSocietario.map((socio, index) => (
                      <Card key={index} className="p-3 border-gray-300 shadow-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-[#00141D]">{socio.nome}</span>
                          <Badge variant="secondary" className="text-xs">
                            {socio.qual}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Informações da Empresa */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-[#00141D]">
                Informações da Empresa
              </h3>

              {empresa.cnpj && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-[#36404A]" />
                  <span className="text-[#36404A]">CNPJ:</span>
                  <span className="font-medium text-[#00141D]">{empresa.cnpj}</span>
                </div>
              )}

              {empresa.setor && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-[#36404A]" />
                  <span className="text-[#36404A]">Setor:</span>
                  <span className="font-medium text-[#00141D]">{empresa.setor}</span>
                </div>
              )}

              {empresa.porte && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-[#36404A]" />
                  <span className="text-[#36404A]">Porte:</span>
                  <span className="font-medium text-[#00141D]">{empresa.porte}</span>
                </div>
              )}

              {empresa.telefone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-[#36404A]" />
                  <span className="text-[#36404A]">Telefone:</span>
                  <span className="font-medium text-[#00141D]">{empresa.telefone}</span>
                </div>
              )}

              {empresa.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-[#36404A]" />
                  <span className="text-[#36404A]">Email:</span>
                  <span className="font-medium text-[#00141D]">{empresa.email}</span>
                </div>
              )}

              {empresa.site && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-[#36404A]" />
                  <span className="text-[#36404A]">Site:</span>
                  <a href={empresa.site} target="_blank" rel="noopener noreferrer" className="font-medium text-[#ffcd00] hover:underline">
                    {empresa.site}
                  </a>
                </div>
              )}

              {(empresa.endereco || empresa.cidade || empresa.estado) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-[#36404A] mt-0.5" />
                  <div>
                    <span className="text-[#36404A]">Endereço:</span>
                    <div className="font-medium text-[#00141D]">
                      {empresa.endereco && <div>{empresa.endereco}</div>}
                      {(empresa.cidade || empresa.estado) && (
                        <div>
                          {empresa.cidade}
                          {empresa.cidade && empresa.estado && ", "}
                          {empresa.estado}
                          {empresa.cep && ` - ${empresa.cep}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contato Principal */}
            {(empresa.contato_principal_nome || empresa.contato_principal_email || empresa.contato_principal_telefone) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-[#00141D]">
                    Contato Principal
                  </h3>

                  {empresa.contato_principal_nome && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-[#36404A]" />
                      <span className="text-[#36404A]">Nome:</span>
                      <span className="font-medium text-[#00141D]">
                        {empresa.contato_principal_nome}
                      </span>
                    </div>
                  )}

                  {empresa.contato_principal_cargo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-[#36404A]" />
                      <span className="text-[#36404A]">Cargo:</span>
                      <span className="font-medium text-[#00141D]">
                        {empresa.contato_principal_cargo}
                      </span>
                    </div>
                  )}

                  {empresa.contato_principal_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-[#36404A]" />
                      <span className="text-[#36404A]">Email:</span>
                      <span className="font-medium text-[#00141D]">
                        {empresa.contato_principal_email}
                      </span>
                    </div>
                  )}

                  {empresa.contato_principal_telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-[#36404A]" />
                      <span className="text-[#36404A]">Telefone:</span>
                      <span className="font-medium text-[#00141D]">
                        {empresa.contato_principal_telefone}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Usuários Vinculados */}
            {linkedUsers && linkedUsers.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-[#00141D] flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    Usuários Vinculados ({linkedUsers.length})
                  </h3>
                  <div className="space-y-2">
                    {linkedUsers.map(user => (
                      <Card key={user.id} className="p-3 border-gray-300 shadow-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-[#00141D] text-white text-xs">
                              {user.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-[#00141D]">
                              {user.full_name}
                            </div>
                            <div className="text-xs text-[#36404A]">
                              Vinculado em{" "}
                              {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", {
                                locale: ptBR
                              }) : "-"}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Observações */}
            {empresa.observacoes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-[#00141D]">Observações</h3>
                  <p className="text-sm text-[#36404A] whitespace-pre-wrap">
                    {empresa.observacoes}
                  </p>
                </div>
              </>
            )}

            {/* Histórico de Processos */}
            {vagas && vagas.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-[#00141D] flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Histórico de Processos ({vagas.length})
                  </h3>
                  <div className="space-y-2 border-[#ffcd00]">
                    {vagas.map(vaga => (
                      <Card key={vaga.id} className="p-3 border-[#ffcd00] shadow-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-[#00141D]">
                              {vaga.titulo}
                            </div>
                            <div className="text-sm text-[#36404A]">
                              Criada em{" "}
                              {format(new Date(vaga.criado_em), "dd/MM/yyyy", {
                                locale: ptBR
                              })}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {vaga.status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Histórico de Contratações */}
            {contratacoes && contratacoes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-[#00141D] flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contratações ({contratacoes.length})
                  </h3>
                  <div className="space-y-2">
                    {contratacoes.map(contratacao => (
                      <Card key={contratacao.id} className="p-3 border-gray-300">
                        <div className="font-medium text-[#00141D]">
                          {contratacao.nome_completo}
                        </div>
                        <div className="text-sm text-[#36404A]">
                          Contratado em{" "}
                          {format(new Date(contratacao.criado_em), "dd/MM/yyyy", {
                            locale: ptBR
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{empresa?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
