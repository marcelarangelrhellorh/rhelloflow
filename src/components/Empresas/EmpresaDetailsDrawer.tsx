import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Briefcase,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmpresaDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  empresaId: string;
}

export function EmpresaDetailsDrawer({
  open,
  onClose,
  empresaId,
}: EmpresaDetailsDrawerProps) {
  const { data: empresa } = useQuery({
    queryKey: ["empresa-details", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && open,
  });

  const { data: vagas } = useQuery({
    queryKey: ["empresa-vagas", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo, status, criado_em, status_slug")
        .eq("empresa_id", empresaId)
        .is("deleted_at", null)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && open,
  });

  const { data: contratacoes } = useQuery({
    queryKey: ["empresa-contratacoes", empresaId],
    queryFn: async () => {
      const { data: vagasData } = await supabase
        .from("vagas")
        .select("id")
        .eq("empresa_id", empresaId)
        .is("deleted_at", null);

      if (!vagasData || vagasData.length === 0) return [];

      const vagaIds = vagasData.map((v) => v.id);

      const { data, error } = await supabase
        .from("candidatos")
        .select("id, nome_completo, vaga_relacionada_id, criado_em")
        .in("vaga_relacionada_id", vagaIds)
        .eq("status", "Contratado")
        .is("deleted_at", null)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && open,
  });

  if (!empresa) return null;

  const vagasAbertas = vagas?.filter((v) => v.status_slug !== "concluida" && v.status_slug !== "cancelada").length || 0;
  const vagasConcluidas = vagas?.filter((v) => v.status_slug === "concluida").length || 0;
  const totalContratacoes = contratacoes?.length || 0;

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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="h-6 w-6" />
            {empresa.nome}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status e Métricas */}
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(empresa.status)}>
              {empresa.status || "ativo"}
            </Badge>
            <div className="text-sm text-[#36404A]">
              Cliente desde{" "}
              {empresa.data_primeiro_contato
                ? format(new Date(empresa.data_primeiro_contato), "dd/MM/yyyy", {
                    locale: ptBR,
                  })
                : format(new Date(empresa.created_at), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center border-gray-300">
              <div className="text-2xl font-bold text-[#00141D]">{vagasAbertas}</div>
              <div className="text-sm text-[#36404A]">Vagas Abertas</div>
            </Card>
            <Card className="p-4 text-center border-gray-300">
              <div className="text-2xl font-bold text-[#00141D]">{vagasConcluidas}</div>
              <div className="text-sm text-[#36404A]">Vagas Concluídas</div>
            </Card>
            <Card className="p-4 text-center border-gray-300">
              <div className="text-2xl font-bold text-[#00141D]">{totalContratacoes}</div>
              <div className="text-sm text-[#36404A]">Contratações</div>
            </Card>
          </div>

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
                <a
                  href={empresa.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#ffcd00] hover:underline"
                >
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
          {(empresa.contato_principal_nome ||
            empresa.contato_principal_email ||
            empresa.contato_principal_telefone) && (
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
                <div className="space-y-2">
                  {vagas.map((vaga) => (
                    <Card key={vaga.id} className="p-3 border-gray-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-[#00141D]">
                            {vaga.titulo}
                          </div>
                          <div className="text-sm text-[#36404A]">
                            Criada em{" "}
                            {format(new Date(vaga.criado_em), "dd/MM/yyyy", {
                              locale: ptBR,
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
                  {contratacoes.map((contratacao) => (
                    <Card key={contratacao.id} className="p-3 border-gray-300">
                      <div className="font-medium text-[#00141D]">
                        {contratacao.nome_completo}
                      </div>
                      <div className="text-sm text-[#36404A]">
                        Contratado em{" "}
                        {format(new Date(contratacao.criado_em), "dd/MM/yyyy", {
                          locale: ptBR,
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
  );
}
