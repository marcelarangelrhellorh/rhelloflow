import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, Search, Loader2, Building, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCNPJ } from "@/lib/cnpjUtils";
import { useCNPJLookup, Socio, AtividadeEconomica, CNPJData } from "@/hooks/useCNPJLookup";

interface ClientUser {
  id: string;
  full_name: string;
  empresa_id: string | null;
}

const empresaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().optional(),
  setor: z.string().optional(),
  porte: z.enum(["Micro", "Pequena", "Média", "Grande"]).optional(),
  status: z.enum(["ativo", "inativo", "prospect"]),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  site: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  contato_principal_nome: z.string().optional(),
  contato_principal_cargo: z.string().optional(),
  contato_principal_email: z.string().email("Email inválido").optional().or(z.literal("")),
  contato_principal_telefone: z.string().optional(),
  observacoes: z.string().optional(),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

interface EmpresaFormModalProps {
  open: boolean;
  onClose: () => void;
  empresa?: any;
  onSuccess: () => void;
}

// Utility to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function EmpresaFormModal({
  open,
  onClose,
  empresa,
  onSuccess,
}: EmpresaFormModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [quadroSocietario, setQuadroSocietario] = useState<Socio[]>([]);
  const [dadosReceita, setDadosReceita] = useState<CNPJData | null>(null);
  const { loading: cnpjLoading, consultarCNPJ, limparDados } = useCNPJLookup();

  const handleClose = () => {
    if (!empresa) {
      form.reset();
      setSelectedUserIds([]);
      setQuadroSocietario([]);
      setDadosReceita(null);
      limparDados();
    }
    onClose();
  };

  // Buscar usuários com role 'client'
  const { data: clientUsers = [] } = useQuery({
    queryKey: ["client-users-for-linking"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map((r) => r.user_id);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, empresa_id")
        .in("id", userIds);

      if (profileError) throw profileError;
      return profiles as ClientUser[];
    },
    enabled: open,
  });

  const availableUsers = clientUsers.filter(
    (user) => !user.empresa_id || user.empresa_id === empresa?.id
  );

  const linkedUsers = clientUsers.filter(
    (user) => user.empresa_id === empresa?.id
  );

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nome: "",
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      setor: "",
      status: "prospect",
      telefone: "",
      email: "",
      site: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      contato_principal_nome: "",
      contato_principal_cargo: "",
      contato_principal_email: "",
      contato_principal_telefone: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (empresa) {
      form.reset({
        nome: empresa.nome || "",
        razao_social: empresa.razao_social || "",
        nome_fantasia: empresa.nome_fantasia || "",
        cnpj: empresa.cnpj || "",
        setor: empresa.setor || "",
        porte: empresa.porte || undefined,
        status: empresa.status || "ativo",
        telefone: empresa.telefone || "",
        email: empresa.email || "",
        site: empresa.site || "",
        endereco: empresa.endereco || "",
        numero: empresa.numero || "",
        complemento: empresa.complemento || "",
        bairro: empresa.bairro || "",
        cidade: empresa.cidade || "",
        estado: empresa.estado || "",
        cep: empresa.cep || "",
        contato_principal_nome: empresa.contato_principal_nome || "",
        contato_principal_cargo: empresa.contato_principal_cargo || "",
        contato_principal_email: empresa.contato_principal_email || "",
        contato_principal_telefone: empresa.contato_principal_telefone || "",
        observacoes: empresa.observacoes || "",
      });
      setSelectedUserIds(linkedUsers.map((u) => u.id));
      
      // Load saved quadro societario if editing
      if (empresa.quadro_societario && Array.isArray(empresa.quadro_societario)) {
        setQuadroSocietario(empresa.quadro_societario);
      }
    } else {
      form.reset({
        nome: "",
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        setor: "",
        status: "prospect",
        telefone: "",
        email: "",
        site: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        contato_principal_nome: "",
        contato_principal_cargo: "",
        contato_principal_email: "",
        contato_principal_telefone: "",
        observacoes: "",
      });
      setSelectedUserIds([]);
      setQuadroSocietario([]);
      setDadosReceita(null);
    }
  }, [empresa, form, linkedUsers.length]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleConsultarCNPJ = async () => {
    const cnpjValue = form.getValues("cnpj");
    if (!cnpjValue || cnpjValue.length < 18) {
      toast.error("Digite um CNPJ válido para consultar");
      return;
    }

    const dados = await consultarCNPJ(cnpjValue);
    
    if (dados) {
      // Preencher campos automaticamente
      form.setValue("razao_social", dados.razao_social);
      form.setValue("nome_fantasia", dados.nome_fantasia);
      form.setValue("endereco", dados.endereco);
      form.setValue("numero", dados.numero);
      form.setValue("complemento", dados.complemento);
      form.setValue("bairro", dados.bairro);
      form.setValue("cidade", dados.cidade);
      form.setValue("estado", dados.estado);
      form.setValue("cep", dados.cep);
      form.setValue("telefone", dados.telefone);
      form.setValue("email", dados.email);
      
      // Se nome da empresa estiver vazio, preencher com nome fantasia ou razão social
      const nomeAtual = form.getValues("nome");
      if (!nomeAtual) {
        form.setValue("nome", dados.nome_fantasia || dados.razao_social);
      }

      // Salvar dados da Receita para exibição
      setDadosReceita(dados);

      // Buscar novamente para pegar quadro societário
      const response = await supabase.functions.invoke('consultar-cnpj', {
        body: { cnpj: cnpjValue.replace(/\D/g, '') }
      });
      
      if (response.data?.qsa) {
        setQuadroSocietario(response.data.qsa.map((s: any) => ({
          nome: s.nome || '',
          qual: s.qual || 'Sócio'
        })));
      }
    }
  };

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      const empresaPayload = {
        ...data,
        email: data.email || null,
        contato_principal_email: data.contato_principal_email || null,
        // Dados da Receita Federal
        situacao_cadastral: dadosReceita?.situacao_cadastral || empresa?.situacao_cadastral || null,
        data_situacao_cadastral: dadosReceita?.data_situacao_cadastral || empresa?.data_situacao_cadastral || null,
        data_abertura: dadosReceita?.data_abertura || empresa?.data_abertura || null,
        natureza_juridica: dadosReceita?.natureza_juridica || empresa?.natureza_juridica || null,
        capital_social: dadosReceita?.capital_social || empresa?.capital_social || null,
        atividade_principal: dadosReceita?.atividade_principal || empresa?.atividade_principal || [],
        atividades_secundarias: dadosReceita?.atividades_secundarias || empresa?.atividades_secundarias || [],
        quadro_societario: quadroSocietario.length > 0 ? quadroSocietario : (empresa?.quadro_societario || []),
        cnpj_consultado_em: dadosReceita ? new Date().toISOString() : empresa?.cnpj_consultado_em || null,
      };

      let empresaId = empresa?.id;

      if (empresa?.id) {
        const { error } = await supabase
          .from("empresas")
          .update(empresaPayload)
          .eq("id", empresa.id);

        if (error) throw error;
      } else {
        const { data: newEmpresa, error } = await supabase
          .from("empresas")
          .insert(empresaPayload)
          .select("id")
          .single();

        if (error) throw error;
        empresaId = newEmpresa.id;
      }

      if (empresaId) {
        const previousUserIds = linkedUsers.map((u) => u.id);
        const usersToUnlink = previousUserIds.filter(
          (id) => !selectedUserIds.includes(id)
        );
        const usersToLink = selectedUserIds.filter(
          (id) => !previousUserIds.includes(id)
        );

        if (usersToUnlink.length > 0) {
          await supabase
            .from("profiles")
            .update({ empresa_id: null })
            .in("id", usersToUnlink);
        }

        if (usersToLink.length > 0) {
          await supabase
            .from("profiles")
            .update({ empresa_id: empresaId })
            .in("id", usersToLink);
        }
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      toast.error("Erro ao salvar empresa");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {empresa ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Informações Básicas
              </h3>

              {/* CNPJ com botão de consulta */}
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00.000.000/0000-00"
                          value={field.value}
                          onChange={(e) => {
                            const formatted = formatCNPJ(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={18}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConsultarCNPJ}
                  disabled={cnpjLoading || !form.watch("cnpj") || form.watch("cnpj")?.length < 18}
                  className="mt-8 gap-2"
                >
                  {cnpjLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Consultar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="razao_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Razão social" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome_fantasia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome fantasia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="setor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setor</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Tecnologia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="porte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porte</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Micro">Micro</SelectItem>
                          <SelectItem value="Pequena">Pequena</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Grande">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dados da Receita Federal */}
            {(dadosReceita || empresa?.situacao_cadastral) && (
              <Card className="p-4 space-y-4 bg-blue-50/50 border-blue-200">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Dados da Receita Federal
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Situação Cadastral */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Situação:</span>
                    <Badge 
                      variant={(dadosReceita?.situacao_cadastral || empresa?.situacao_cadastral) === 'ATIVA' ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {(dadosReceita?.situacao_cadastral || empresa?.situacao_cadastral) === 'ATIVA' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {dadosReceita?.situacao_cadastral || empresa?.situacao_cadastral}
                    </Badge>
                    {(dadosReceita?.data_situacao_cadastral || empresa?.data_situacao_cadastral) && (
                      <span className="text-xs text-muted-foreground">
                        desde {dadosReceita?.data_situacao_cadastral || empresa?.data_situacao_cadastral}
                      </span>
                    )}
                  </div>

                  {/* Data de Abertura */}
                  {(dadosReceita?.data_abertura || empresa?.data_abertura) && (
                    <div>
                      <span className="text-muted-foreground">Abertura:</span>
                      <span className="font-medium ml-2">
                        {dadosReceita?.data_abertura || empresa?.data_abertura}
                      </span>
                    </div>
                  )}

                  {/* Natureza Jurídica */}
                  {(dadosReceita?.natureza_juridica || empresa?.natureza_juridica) && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Natureza Jurídica:</span>
                      <span className="font-medium ml-2">
                        {dadosReceita?.natureza_juridica || empresa?.natureza_juridica}
                      </span>
                    </div>
                  )}

                  {/* Capital Social */}
                  {((dadosReceita?.capital_social && dadosReceita.capital_social > 0) || 
                    (empresa?.capital_social && empresa.capital_social > 0)) && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Capital Social:</span>
                      <span className="font-medium ml-2">
                        {formatCurrency(dadosReceita?.capital_social || empresa?.capital_social || 0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Atividade Principal */}
                {((dadosReceita?.atividade_principal && dadosReceita.atividade_principal.length > 0) ||
                  (empresa?.atividade_principal && empresa.atividade_principal.length > 0)) && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Atividade Principal</h4>
                    <div className="bg-background rounded-lg p-3 border">
                      {((dadosReceita?.atividade_principal || empresa?.atividade_principal) as AtividadeEconomica[])?.map((atividade, index) => (
                        <div key={index}>
                          <span className="text-xs text-muted-foreground font-mono">
                            {atividade.code}
                          </span>
                          <p className="text-sm">{atividade.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Atividades Secundárias */}
                {((dadosReceita?.atividades_secundarias && dadosReceita.atividades_secundarias.length > 0) ||
                  (empresa?.atividades_secundarias && empresa.atividades_secundarias.length > 0)) && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm">
                      Atividades Secundárias ({((dadosReceita?.atividades_secundarias || empresa?.atividades_secundarias) as AtividadeEconomica[])?.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto bg-background rounded-lg border p-2">
                      {((dadosReceita?.atividades_secundarias || empresa?.atividades_secundarias) as AtividadeEconomica[])?.map((atividade, index) => (
                        <div key={index} className="text-sm p-2 hover:bg-muted/50 rounded">
                          <span className="text-xs text-muted-foreground font-mono">{atividade.code}</span>
                          <p className="text-xs">{atividade.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Quadro Societário */}
            {quadroSocietario.length > 0 && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                <h3 className="text-lg font-semibold text-foreground">
                  Quadro Societário
                </h3>
                <div className="grid gap-2">
                  {quadroSocietario.map((socio, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-background rounded-lg border"
                    >
                      <span className="font-medium text-sm">{socio.nome}</span>
                      <Badge variant="secondary" className="text-xs">
                        {socio.qual}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contato da Empresa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Contato da Empresa
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 0000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="contato@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Endereço</h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Nº" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Sala, Andar..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contato Principal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Contato Principal
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contato_principal_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do contato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contato_principal_cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="Cargo do contato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contato_principal_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contato_principal_telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Usuários Externos Vinculados */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Usuários Externos Vinculados
              </h3>
              
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário externo disponível para vincular.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedUserIds.map((userId) => {
                        const user = clientUsers.find((u) => u.id === userId);
                        return user ? (
                          <Badge
                            key={userId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {user.full_name}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => toggleUserSelection(userId)}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={user.id}
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <label
                          htmlFor={user.id}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {user.full_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o cliente..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {empresa ? "Salvar Alterações" : "Criar Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
