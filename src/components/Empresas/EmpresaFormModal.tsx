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
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientUser {
  id: string;
  full_name: string;
  empresa_id: string | null;
}

const empresaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().optional(),
  setor: z.string().optional(),
  porte: z.enum(["Micro", "Pequena", "Média", "Grande"]).optional(),
  status: z.enum(["ativo", "inativo", "prospect"]),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  site: z.string().optional(),
  endereco: z.string().optional(),
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

export function EmpresaFormModal({
  open,
  onClose,
  empresa,
  onSuccess,
}: EmpresaFormModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Buscar usuários com role 'client'
  const { data: clientUsers = [] } = useQuery({
    queryKey: ["client-users-for-linking"],
    queryFn: async () => {
      // Buscar IDs de usuários com role 'client'
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map((r) => r.user_id);

      // Buscar profiles desses usuários
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, empresa_id")
        .in("id", userIds);

      if (profileError) throw profileError;
      return profiles as ClientUser[];
    },
    enabled: open,
  });

  // Usuários disponíveis (não vinculados ou vinculados a esta empresa)
  const availableUsers = clientUsers.filter(
    (user) => !user.empresa_id || user.empresa_id === empresa?.id
  );

  // Usuários já vinculados a esta empresa (para edição)
  const linkedUsers = clientUsers.filter(
    (user) => user.empresa_id === empresa?.id
  );

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nome: "",
      cnpj: "",
      setor: "",
      status: "prospect",
      telefone: "",
      email: "",
      site: "",
      endereco: "",
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
        cnpj: empresa.cnpj || "",
        setor: empresa.setor || "",
        porte: empresa.porte || undefined,
        status: empresa.status || "ativo",
        telefone: empresa.telefone || "",
        email: empresa.email || "",
        site: empresa.site || "",
        endereco: empresa.endereco || "",
        cidade: empresa.cidade || "",
        estado: empresa.estado || "",
        cep: empresa.cep || "",
        contato_principal_nome: empresa.contato_principal_nome || "",
        contato_principal_cargo: empresa.contato_principal_cargo || "",
        contato_principal_email: empresa.contato_principal_email || "",
        contato_principal_telefone: empresa.contato_principal_telefone || "",
        observacoes: empresa.observacoes || "",
      });
      // Setar usuários já vinculados
      setSelectedUserIds(linkedUsers.map((u) => u.id));
    } else {
      form.reset({
        nome: "",
        cnpj: "",
        setor: "",
        status: "prospect",
        telefone: "",
        email: "",
        site: "",
        endereco: "",
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
    }
  }, [empresa, form, linkedUsers.length]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      const empresaData = {
        ...data,
        email: data.email || null,
        contato_principal_email: data.contato_principal_email || null,
      };

      let empresaId = empresa?.id;

      if (empresa?.id) {
        const { error } = await supabase
          .from("empresas")
          .update(empresaData)
          .eq("id", empresa.id);

        if (error) throw error;
      } else {
        const { data: newEmpresa, error } = await supabase
          .from("empresas")
          .insert(empresaData)
          .select("id")
          .single();

        if (error) throw error;
        empresaId = newEmpresa.id;
      }

      // Atualizar vinculações de usuários
      if (empresaId) {
        // Desvincular usuários que foram removidos
        const previousUserIds = linkedUsers.map((u) => u.id);
        const usersToUnlink = previousUserIds.filter(
          (id) => !selectedUserIds.includes(id)
        );
        const usersToLink = selectedUserIds.filter(
          (id) => !previousUserIds.includes(id)
        );

        // Desvincular
        if (usersToUnlink.length > 0) {
          await supabase
            .from("profiles")
            .update({ empresa_id: null })
            .in("id", usersToUnlink);
        }

        // Vincular novos
        if (usersToLink.length > 0) {
          await supabase
            .from("profiles")
            .update({ empresa_id: empresaId })
            .in("id", usersToLink);
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      toast.error("Erro ao salvar empresa");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
              <h3 className="text-lg font-semibold text-[#00141D]">
                Informações Básicas
              </h3>

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
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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

            {/* Contato da Empresa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#00141D]">
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
              <h3 className="text-lg font-semibold text-[#00141D]">Endereço</h3>

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número, complemento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              <h3 className="text-lg font-semibold text-[#00141D]">
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
              <h3 className="text-lg font-semibold text-[#00141D]">
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#ffcd00] hover:bg-[#ffcd00]/90 text-black font-semibold"
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
