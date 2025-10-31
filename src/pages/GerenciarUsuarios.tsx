import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Users, UserPlus, Mail, UserCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GerenciarUsuarios() {
  const navigate = useNavigate();
  const { users, loading, reload } = useUsers();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "recrutador" as "recrutador" | "cs" | "viewer" | "admin",
    password: ""
  });

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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{user.name}</h3>
                          {getRoleBadge(user.role)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
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
                  <li><strong>CS:</strong> Atua como responsável pelo relacionamento com clientes</li>
                  <li><strong>Visualizador:</strong> Acesso apenas para visualização</li>
                  <li><strong>Administrador:</strong> Acesso completo ao sistema</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
