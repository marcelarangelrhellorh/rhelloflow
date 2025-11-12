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
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<string[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
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
    loadAvailableCompanies();
  }, [users]);

  useEffect(() => {
    if (clientFormData.company) {
      const filtered = availableCompanies.filter(company =>
        company.toLowerCase().includes(clientFormData.company.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies([]);
    }
  }, [clientFormData.company, availableCompanies]);

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

  const loadAvailableCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("empresa")
        .not("empresa", "is", null);

      if (error) throw error;

      if (data) {
        const uniqueCompanies = [...new Set(data.map(v => v.empresa).filter(Boolean))] as string[];
        setAvailableCompanies(uniqueCompanies);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
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
      admin: <Badge variant="destructive" className="text-xs px-1.5 py-0">Admin</Badge>,
      recrutador: <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">Recrutador</Badge>,
      cs: <Badge className="bg-secondary text-secondary-foreground text-xs px-1.5 py-0">CS</Badge>,
      viewer: <Badge variant="outline" className="text-xs px-1.5 py-0">Viewer</Badge>,
      cliente: <Badge className="bg-accent text-accent-foreground text-xs px-1.5 py-0">Cliente</Badge>
    };
    return badges[role as keyof typeof badges] || <Badge className="text-xs px-1.5 py-0">{role}</Badge>;
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
          <Button variant="outline" size="sm" className="h-8">
            <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
            Vincular
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Vincular Vaga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="job-select" className="text-sm">Selecione a vaga</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="h-9">
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
              className="w-full h-9"
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
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Permissões</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Selecione as funções deste usuário
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-admin-${user.id}`}
                  checked={selectedRoles.includes("admin")}
                  onCheckedChange={() => toggleRole("admin")}
                />
                <Label htmlFor={`role-admin-${user.id}`} className="flex items-center gap-1.5 text-sm">
                  {getRoleBadge("admin")}
                  <span className="text-xs text-muted-foreground">Acesso total</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-recrutador-${user.id}`}
                  checked={selectedRoles.includes("recrutador")}
                  onCheckedChange={() => toggleRole("recrutador")}
                />
                <Label htmlFor={`role-recrutador-${user.id}`} className="flex items-center gap-1.5 text-sm">
                  {getRoleBadge("recrutador")}
                  <span className="text-xs text-muted-foreground">Vagas e candidatos</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-cs-${user.id}`}
                  checked={selectedRoles.includes("cs")}
                  onCheckedChange={() => toggleRole("cs")}
                />
                <Label htmlFor={`role-cs-${user.id}`} className="flex items-center gap-1.5 text-sm">
                  {getRoleBadge("cs")}
                  <span className="text-xs text-muted-foreground">Customer Success</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-viewer-${user.id}`}
                  checked={selectedRoles.includes("viewer")}
                  onCheckedChange={() => toggleRole("viewer")}
                />
                <Label htmlFor={`role-viewer-${user.id}`} className="flex items-center gap-1.5 text-sm">
                  {getRoleBadge("viewer")}
                  <span className="text-xs text-muted-foreground">Apenas visualização</span>
                </Label>
              </div>
            </div>

            {selectedRoles.length === 0 && (
              <p className="text-xs text-destructive">
                ⚠️ Selecione pelo menos uma função
              </p>
            )}

            <Button 
              onClick={() => handleUpdateRoles(user.id, selectedRoles)}
              disabled={selectedRoles.length === 0}
              className="w-full h-9"
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
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Redefinir senha">
            <KeyRound className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-9"
              />
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={newPassword.length < 6}
              className="w-full h-9"
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-foreground">
              <Users className="h-6 w-6 md:h-7 md:w-7" />
              Gerenciar Usuários
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administre usuários internos e clientes do sistema
            </p>
          </div>
          <Button onClick={() => navigate("/vagas")} variant="outline" size="sm">
            Voltar
          </Button>
        </div>

        <Tabs defaultValue="internal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="internal" className="text-sm">
              <Users className="h-4 w-4 mr-1.5" />
              Internos ({internalUsers.length})
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-sm">
              <Building2 className="h-4 w-4 mr-1.5" />
              Clientes ({clients.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB: Usuários Internos */}
          <TabsContent value="internal" className="space-y-4">

        {/* Adicionar Usuário */}
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="w-full h-9" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar Novo Usuário
          </Button>
        )}

        {showAddForm && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Novo Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm">Nome Completo</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="João Silva"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="joao@empresa.com"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm">Senha Temporária</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-sm">Função</Label>
                    <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recrutador">Recrutador</SelectItem>
                        <SelectItem value="cs">CS</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1 h-9">
                    Criar Usuário
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="h-9">
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Usuários Internos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Usuários Cadastrados ({internalUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Carregando...</div>
            ) : internalUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhum usuário cadastrado
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {internalUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                        {(userRoles[user.id] || []).slice(0, 2).map((role) => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <RoleEditDialog user={user} />
                      <PasswordResetDialog user={user} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{user.name}</strong>?
                              Esta ação não pode ser desfeita.
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
                      <Switch
                        id={`active-${user.id}`}
                        checked={user.active}
                        onCheckedChange={() => toggleUserStatus(user.id, user.active)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre Usuários Internos */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2.5">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-primary text-sm">Sobre as Funções</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <p><strong>Recrutador:</strong> Gerencia vagas e candidatos</p>
                  <p><strong>CS:</strong> Mesmos acessos que recrutador</p>
                  <p><strong>Visualizador:</strong> Apenas visualização</p>
                  <p><strong>Admin:</strong> Acesso completo</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* TAB: Clientes */}
          <TabsContent value="clients" className="space-y-4">
            {/* Adicionar Cliente */}
            {!showClientForm && (
              <Button onClick={() => setShowClientForm(true)} className="w-full h-9" variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Novo Cliente
              </Button>
            )}

            {showClientForm && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Novo Cliente</CardTitle>
                  <CardDescription className="text-xs">
                    Acesso à aba de Acompanhamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleClientSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="client-name" className="text-sm">Nome Completo</Label>
                        <Input
                          id="client-name"
                          required
                          value={clientFormData.name}
                          onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                          placeholder="Nome do cliente"
                          className="h-9"
                        />
                      </div>

                      <div className="relative space-y-1.5">
                        <Label htmlFor="client-company" className="text-sm">Empresa</Label>
                        <Input
                          id="client-company"
                          required
                          value={clientFormData.company}
                          onChange={(e) => setClientFormData({ ...clientFormData, company: e.target.value })}
                          onFocus={() => setShowCompanySuggestions(true)}
                          onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
                          placeholder="Digite o nome da empresa"
                          autoComplete="off"
                          className="h-9"
                        />
                        {showCompanySuggestions && filteredCompanies.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                            {filteredCompanies.map((company, index) => (
                              <button
                                key={index}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                                onClick={() => {
                                  setClientFormData({ ...clientFormData, company });
                                  setShowCompanySuggestions(false);
                                }}
                              >
                                {company}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="client-email" className="text-sm">Email</Label>
                        <Input
                          id="client-email"
                          type="email"
                          required
                          value={clientFormData.email}
                          onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                          placeholder="email@empresa.com"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="client-password" className="text-sm">Senha Temporária</Label>
                        <Input
                          id="client-password"
                          type="password"
                          required
                          minLength={6}
                          value={clientFormData.password}
                          onChange={(e) => setClientFormData({ ...clientFormData, password: e.target.value })}
                          placeholder="Mínimo 6 caracteres"
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1 h-9">
                        Criar Cliente
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowClientForm(false)} className="h-9">
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de Clientes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Clientes Cadastrados ({clients.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nenhum cliente cadastrado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        className="border border-border rounded-lg p-3 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                              {getRoleBadge("cliente")}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <LinkJobDialog client={client} />
                            <PasswordResetDialog user={client} />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Excluir">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir <strong>{client.name}</strong>?
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
                            <Switch
                              id={`active-${client.id}`}
                              checked={client.active}
                              onCheckedChange={() => toggleUserStatus(client.id, client.active)}
                              className="scale-75"
                            />
                          </div>
                        </div>

                        {/* Vagas Vinculadas */}
                        {clientJobs[client.id]?.length > 0 && (
                          <div className="border-t border-border pt-2.5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">
                                Vagas ({clientJobs[client.id].length})
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {clientJobs[client.id].map((job) => (
                                <div
                                  key={job.id}
                                  className="flex items-center justify-between p-2 bg-accent/30 rounded text-xs"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{job.titulo}</p>
                                    <p className="text-muted-foreground truncate">{job.empresa}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0"
                                    onClick={() => handleUnlinkJob(job.id)}
                                    title="Desvincular"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações sobre Clientes */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-2.5">
                  <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-primary text-sm">Sobre Clientes</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                      <p><strong>Acesso:</strong> Apenas aba "Acompanhamento"</p>
                      <p><strong>Visão:</strong> Suas vagas e candidatos</p>
                      <p><strong>Permissões:</strong> Somente leitura</p>
                      <p><strong>Vincular:</strong> Use "Vincular Vaga"</p>
                    </div>
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
