import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CreateExternalUserInlineProps {
  empresaId?: string;
  empresaNome: string;
  onUserCreated: (userId: string) => void;
}

export function CreateExternalUserInline({ 
  empresaId, 
  empresaNome, 
  onUserCreated 
}: CreateExternalUserInlineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            role: 'client'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Atualizar perfil como usuário externo
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            user_type: 'external',
            empresa: empresaNome,
            empresa_id: empresaId || null,
            role: 'client'
          })
          .eq("id", authData.user.id);

        if (profileError) {
          console.error("Erro ao atualizar perfil:", profileError);
          throw profileError;
        }

        // 3. Inserir role 'client' na tabela user_roles
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({
            user_id: authData.user.id,
            role: 'client'
          }, {
            onConflict: 'user_id,role'
          });

        if (roleError) {
          console.error("Erro ao criar role client:", roleError);
          throw roleError;
        }

        toast.success("Usuário externo criado e vinculado com sucesso!");
        
        // Notificar componente pai
        onUserCreated(authData.user.id);

        // Limpar formulário e fechar
        setFormData({ name: "", email: "", password: "" });
        setIsOpen(false);
      }
    } catch (error: any) {
      console.error("Erro ao criar usuário externo:", error);
      
      if (error.message?.includes("already registered")) {
        toast.error("Este email já está cadastrado no sistema");
      } else {
        toast.error(`Erro ao criar usuário: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", email: "", password: "" });
    setIsOpen(false);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full mt-2 gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {isOpen ? "Cancelar criação" : "Criar Novo Usuário Externo"}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3">
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-foreground">
              Novo Usuário para {empresaNome || "este cliente"}
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label htmlFor="new-user-name" className="text-xs">
              Nome Completo *
            </Label>
            <Input
              id="new-user-name"
              placeholder="Nome do usuário"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-8 text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="new-user-email" className="text-xs">
              Email *
            </Label>
            <Input
              id="new-user-email"
              type="email"
              placeholder="email@empresa.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-8 text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="new-user-password" className="text-xs">
              Senha Temporária *
            </Label>
            <div className="relative">
              <Input
                id="new-user-password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-8 text-sm pr-10"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-8 w-8 p-0"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              O usuário poderá alterar a senha após o primeiro login
            </p>
          </div>

          <Button
            type="submit"
            size="sm"
            className="w-full gap-2"
            disabled={loading || !formData.name || !formData.email || !formData.password}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Criar e Vincular Usuário
              </>
            )}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
