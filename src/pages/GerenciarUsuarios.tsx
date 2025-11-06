import { useState, useEffect } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, UserPlus, Mail, UserCircle, Shield, Edit, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type AppRole = "recrutador" | "cs" | "viewer" | "admin";

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
  }, [users]);

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

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: <Badge variant="destructive">Admin</Badge>,
      recrutador: <Badge className="bg-blue-500">Recrutador</Badge>,
      cs: <Badge className="bg-green-500">CS</Badge>,
      viewer: <Badge variant="outline">Visualizador</Badge>
    };
    return badges[role as keyof typeof badges] || <Badge>{role}</Badge>;
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
              Administre recrutadores, CS e outros usuários do sistema
            </p>
          </div>
          <Button onClick={() => navigate("/vagas")} variant="outline">
            Voltar
          </Button>
        </div>

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

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário cadastrado
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
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

        {/* Informações */}
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
      </div>
    </div>
  );
}
