import { useState, useEffect } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, UserPlus, Mail, UserCircle, Shield, Edit, AlertCircle, Trash2, KeyRound, Building2, Briefcase, Link as LinkIcon, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AppRole = "recrutador" | "cs" | "viewer" | "admin" | "cliente";

export default function GerenciarUsuarios() {
  const navigate = useNavigate();
  const { users, loading, reload } = useUsers();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "recrutador" as AppRole,
    password: ""
  });
  const [clientFormData, setClientFormData] = useState({
    email: "",
    name: "",
    company: "",
    password: ""
  });
  const [showClientForm, setShowClientForm] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientJobs, setClientJobs] = useState<Record<string, any[]>>({});
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<Record<string, AppRole[]>>({});

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;

      const rolesMap: Record<string, AppRole[]> = {};
      data?.forEach((ur) => {
        if (!rolesMap[ur.user_id]) {
          rolesMap[ur.user_id] = [];
        }
        rolesMap[ur.user_id].push(ur.role as AppRole);
      });

      setUserRoles(rolesMap);
    } catch (error) {
      console.error("Erro ao carregar roles:", error);
    }
  };

  // Verifica se é admin antes de carregar a página
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("❌ Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    loadUserRoles();
    loadClients();
    loadAvailableJobs();
  }, [users]);

  const loadClients = async () => {
    try {
      const { data: clientRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "cliente");

      if (rolesError) throw rolesError;

      const clientIds = clientRoles?.map(r => r.user_id) || [];

      if (clientIds.length === 0) {
        setClients([]);
        return;
      }

      const { data: clientUsers, error: usersError } = await supabase
        .from("users")
        .select("*")
        .in("id", clientIds)
        .order("name");

      if (usersError) throw usersError;

      setClients(clientUsers || []);

      // Carregar vagas de cada cliente
      const jobsMap: Record<string, any[]> = {};
      for (const client of clientUsers || []) {
        const { data: jobs } = await supabase
          .from("vagas")
          .select("id, titulo, empresa, status")
          .eq("cliente_id", client.id);
        jobsMap[client.id] = jobs || [];
      }
      setClientJobs(jobsMap);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo, empresa, status")
        .order("titulo");

      if (error) throw error;
      setAvailableJobs(data || []);
    } catch (error) {
      console.error("Erro ao carregar vagas:", error);
    }
  };

  // Não renderiza nada se não for admin
  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            role: formData.role
          }
        }
      });

      if (authError) throw authError;

      toast.success("✅ Usuário criado com sucesso! Um email de confirmação foi enviado.");
      setShowAddForm(false);
      setFormData({ email: "", name: "", role: "recrutador", password: "" });
      reload();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast.error(`❌ Erro ao criar usuário: ${error.message}`);
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Criar usuário cliente no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: clientFormData.email,
        password: clientFormData.password,
        options: {
          data: {
            full_name: clientFormData.name,
            role: "cliente"
          }
        }
      });

      if (authError) throw authError;

      toast.success("✅ Cliente criado com sucesso! Um email de confirmação foi enviado.");
      setShowClientForm(false);
      setClientFormData({ email: "", name: "", company: "", password: "" });
      loadClients();
      reload();
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      toast.error(`❌ Erro ao criar cliente: ${error.message}`);
    }
  };

  const handleLinkJob = async (clientId: string, jobId: string) => {
    try {
      const { error } = await supabase
        .from("vagas")
        .update({ cliente_id: clientId })
        .eq("id", jobId);

      if (error) throw error;

      toast.success("✅ Vaga vinculada ao cliente com sucesso!");
      loadClients();
      loadAvailableJobs();
    } catch (error: any) {
      console.error("Erro ao vincular vaga:", error);
      toast.error(`❌ Erro ao vincular vaga: ${error.message}`);
    }
  };

  const handleUnlinkJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("vagas")
        .update({ cliente_id: null })
        .eq("id", jobId);

      if (error) throw error;

      toast.success("✅ Vaga desvinculada do cliente!");
      loadClients();
      loadAvailableJobs();
    } catch (error: any) {
      console.error("Erro ao desvincular vaga:", error);
      toast.error(`❌ Erro ao desvincular vaga: ${error.message}`);
    }
  };

  const handleUpdateRoles = async (userId: string, selectedRoles: AppRole[]) => {
    try {
      // Remove todas as roles atuais
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Adiciona as novas roles selecionadas
      if (selectedRoles.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(
            selectedRoles.map(role => ({
              user_id: userId,
              role: role
            }))
          );

        if (insertError) throw insertError;
      }

      toast.success("✅ Permissões atualizadas com sucesso!");
      setEditingUser(null);
      reload();
      loadUserRoles();
    } catch (error: any) {
      console.error("Erro ao atualizar roles:", error);
      toast.error(`❌ Erro ao atualizar permissões: ${error.message}`);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ active: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`✅ Status do usuário atualizado`);
      reload();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("❌ Erro ao atualizar status do usuário");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast.success(`✅ Usuário ${userName} excluído com sucesso`);
      reload();
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast.error(`❌ ${error.message}`);
    }
  };

  const handleResetPassword = async (userId: string, userName: string, newPassword: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId, newPassword }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to reset password");
      }

      toast.success(`✅ Senha de ${userName} redefinida com sucesso`);
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast.error(`❌ ${error.message}`);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: <Badge variant="destructive">Admin</Badge>,
      recrutador: <Badge className="bg-blue-500">Recrutador</Badge>,
      cs: <Badge className="bg-green-500">CS</Badge>,
      viewer: <Badge variant="outline">Visualizador</Badge>,
      cliente: <Badge className="bg-purple-500">Cliente</Badge>
    };
    return badges[role as keyof typeof badges] || <Badge>{role}</Badge>;
  };

  const LinkJobDialog = ({ client }: { client: any }) => {
    const [selectedJobId, setSelectedJobId] = useState("");
    const [open, setOpen] = useState(false);
    
    const unlinkedJobs = availableJobs.filter(job => 
      !job.cliente_id || job.cliente_id === client.id
    );

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <LinkIcon className="h-4 w-4 mr-2" />
            Vincular Vaga
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Vaga - {client.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="job-select">Selecione a vaga</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma vaga" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.titulo} - {job.empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => {
                if (selectedJobId) {
                  handleLinkJob(client.id, selectedJobId);
                  setOpen(false);
                  setSelectedJobId("");
                }
              }}
              disabled={!selectedJobId}
              className="w-full"
            >
              Vincular
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const RoleEditDialog = ({ user }: { user: any }) => {
    const currentRoles = userRoles[user.id] || [];
    const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(currentRoles);

    const toggleRole = (role: AppRole) => {
      setSelectedRoles(prev => 
        prev.includes(role) 
          ? prev.filter(r => r !== role)
          : [...prev, role]
      );
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Permissões - {user.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione todas as funções que este usuário deve ter:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-admin-${user.id}`}
                  checked={selectedRoles.includes("admin")}
                  onCheckedChange={() => toggleRole("admin")}
                />
                <Label htmlFor={`role-admin-${user.id}`} className="flex items-center gap-2">
                  {getRoleBadge("admin")}
                  <span className="text-sm">- Acesso total ao sistema</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-recrutador-${user.id}`}
                  checked={selectedRoles.includes("recrutador")}
                  onCheckedChange={() => toggleRole("recrutador")}
                />
                <Label htmlFor={`role-recrutador-${user.id}`} className="flex items-center gap-2">
                  {getRoleBadge("recrutador")}
                  <span className="text-sm">- Gerencia vagas e candidatos</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-cs-${user.id}`}
                  checked={selectedRoles.includes("cs")}
                  onCheckedChange={() => toggleRole("cs")}
                />
                <Label htmlFor={`role-cs-${user.id}`} className="flex items-center gap-2">
                  {getRoleBadge("cs")}
                  <span className="text-sm">- Gestão de clientes (mesmos acessos que recrutador)</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-viewer-${user.id}`}
                  checked={selectedRoles.includes("viewer")}
                  onCheckedChange={() => toggleRole("viewer")}
                />
                <Label htmlFor={`role-viewer-${user.id}`} className="flex items-center gap-2">
                  {getRoleBadge("viewer")}
                  <span className="text-sm">- Apenas visualização</span>
                </Label>
              </div>
            </div>

            {selectedRoles.length === 0 && (
              <p className="text-sm text-destructive">
                ⚠️ Selecione pelo menos uma função
              </p>
            )}

            <Button 
              onClick={() => handleUpdateRoles(user.id, selectedRoles)}
              disabled={selectedRoles.length === 0}
              className="w-full"
            >
              Salvar Permissões
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const PasswordResetDialog = ({ user }: { user: any }) => {
    const [newPassword, setNewPassword] = useState("");
    const [open, setOpen] = useState(false);

    const handleSubmit = async () => {
      await handleResetPassword(user.id, user.name, newPassword);
      setNewPassword("");
      setOpen(false);
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" title="Redefinir senha">
            <KeyRound className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha - {user.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={newPassword.length < 6}
              className="w-full"
            >
              Redefinir Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const internalUsers = users.filter(user => !userRoles[user.id]?.includes("cliente"));

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#00141d' }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Gerenciar Usuários
            </h1>
            <p className="text-muted-foreground mt-2">
              Administre usuários internos e clientes do sistema
            </p>
          </div>
          <Button onClick={() => navigate("/vagas")} variant="outline">
            Voltar
          </Button>
        </div>

        <Tabs defaultValue="internal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="internal">
              <Users className="h-4 w-4 mr-2" />
              Usuários Internos ({internalUsers.length})
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Building2 className="h-4 w-4 mr-2" />
              Clientes ({clients.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB: Usuários Internos */}
          <TabsContent value="internal" className="space-y-6">

        {/* Adicionar Usuário */}
        {!showAddForm && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Button onClick={() => setShowAddForm(true)} className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Novo Usuário
              </Button>
            </CardContent>
          </Card>
        )}

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Novo Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="joao@empresa.com"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Senha Temporária *</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O usuário receberá um email para confirmar e alterar a senha
                  </p>
                </div>

                <div>
                  <Label htmlFor="role">Função *</Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recrutador">Recrutador</SelectItem>
                      <SelectItem value="cs">CS (Customer Success)</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Criar Usuário
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Usuários Internos */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Internos Cadastrados ({internalUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : internalUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário interno cadastrado
              </div>
            ) : (
              <div className="space-y-4">
                {internalUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{user.name}</h3>
                          {(userRoles[user.id] || []).map((role) => (
                            <span key={role}>{getRoleBadge(role)}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <RoleEditDialog user={user} />
                      <PasswordResetDialog user={user} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Excluir usuário">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o usuário <strong>{user.name}</strong>?
                              Esta ação não pode ser desfeita e removerá todos os dados associados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${user.id}`} className="text-sm">
                          {user.active ? "Ativo" : "Inativo"}
                        </Label>
                        <Switch
                          id={`active-${user.id}`}
                          checked={user.active}
                          onCheckedChange={() => toggleUserStatus(user.id, user.active)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre Usuários Internos */}
        <Card className="mt-6 bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-blue-500">Sobre as Funções:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><strong>Recrutador:</strong> Pode gerenciar vagas e candidatos atribuídos a si</li>
                  <li><strong>CS (Customer Success):</strong> Mesmos acessos que recrutador + foco em clientes</li>
                  <li><strong>Visualizador:</strong> Acesso apenas para visualização</li>
                  <li><strong>Administrador:</strong> Acesso completo ao sistema</li>
                </ul>
                <p className="mt-3 text-sm font-semibold text-blue-500">💡 Múltiplas Funções:</p>
                <p className="text-sm text-muted-foreground">
                  Um usuário pode ter várias funções simultaneamente. Por exemplo, um CS pode também ser Admin, tendo todos os privilégios de ambas as funções.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* TAB: Clientes */}
          <TabsContent value="clients" className="space-y-6">
            {/* Adicionar Cliente */}
            {!showClientForm && (
              <Card>
                <CardContent className="pt-6">
                  <Button onClick={() => setShowClientForm(true)} className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Novo Cliente
                  </Button>
                </CardContent>
              </Card>
            )}

            {showClientForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Novo Cliente</CardTitle>
                  <CardDescription>
                    Clientes terão acesso apenas à aba de Acompanhamento de suas vagas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleClientSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="client-name">Nome Completo *</Label>
                      <Input
                        id="client-name"
                        required
                        value={clientFormData.name}
                        onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                        placeholder="Nome do cliente"
                      />
                    </div>

                    <div>
                      <Label htmlFor="client-company">Empresa *</Label>
                      <Input
                        id="client-company"
                        required
                        value={clientFormData.company}
                        onChange={(e) => setClientFormData({ ...clientFormData, company: e.target.value })}
                        placeholder="Nome da empresa"
                      />
                    </div>

                    <div>
                      <Label htmlFor="client-email">Email *</Label>
                      <Input
                        id="client-email"
                        type="email"
                        required
                        value={clientFormData.email}
                        onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                        placeholder="email@empresa.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="client-password">Senha Temporária *</Label>
                      <Input
                        id="client-password"
                        type="password"
                        required
                        minLength={6}
                        value={clientFormData.password}
                        onChange={(e) => setClientFormData({ ...clientFormData, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        O cliente receberá um email para confirmar e alterar a senha
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Criar Cliente
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowClientForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de Clientes */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes Cadastrados ({clients.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum cliente cadastrado
                  </div>
                ) : (
                  <div className="space-y-6">
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-purple-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold">{client.name}</h3>
                                {getRoleBadge("cliente")}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <LinkJobDialog client={client} />
                            <PasswordResetDialog user={client} />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Excluir cliente">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o cliente <strong>{client.name}</strong>?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(client.id, client.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`active-${client.id}`} className="text-sm">
                                {client.active ? "Ativo" : "Inativo"}
                              </Label>
                              <Switch
                                id={`active-${client.id}`}
                                checked={client.active}
                                onCheckedChange={() => toggleUserStatus(client.id, client.active)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Vagas Vinculadas */}
                        <div className="pl-16">
                          <div className="flex items-center gap-2 mb-3">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Vagas Vinculadas ({clientJobs[client.id]?.length || 0})
                            </span>
                          </div>
                          {clientJobs[client.id]?.length > 0 ? (
                            <div className="space-y-2">
                              {clientJobs[client.id].map((job) => (
                                <div
                                  key={job.id}
                                  className="flex items-center justify-between p-3 bg-accent/50 rounded-md"
                                >
                                  <div>
                                    <p className="font-medium text-sm">{job.titulo}</p>
                                    <p className="text-xs text-muted-foreground">{job.empresa}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnlinkJob(job.id)}
                                    title="Desvincular vaga"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma vaga vinculada a este cliente
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações sobre Clientes */}
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Building2 className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-purple-500">Sobre Clientes:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><strong>Acesso Restrito:</strong> Clientes veem apenas a aba "Acompanhamento"</li>
                      <li><strong>Visão Limitada:</strong> Podem visualizar apenas suas vagas e candidatos vinculados</li>
                      <li><strong>Sem Edição:</strong> Não têm permissão para editar ou excluir dados</li>
                      <li><strong>Vinculação de Vagas:</strong> Use o botão "Vincular Vaga" para associar vagas aos clientes</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
