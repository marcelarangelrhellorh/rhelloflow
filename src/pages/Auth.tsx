import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { logLoginSuccess, logLoginFailure } from "@/lib/auditLog";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, { message: "Email é obrigatório" })
    .email({ message: "Formato de email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  password: z.string()
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
    .max(72, { message: "Senha muito longa" })
});

type LoginErrors = { email?: string; password?: string };

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: LoginErrors = {};
      result.error.issues.forEach(err => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password
      });
      if (error) {
        // Log failed login attempt
        await logLoginFailure(email, error.message);
        throw error;
      }
      if (data.user) {
        // Log successful login
        await logLoginSuccess(data.user.id, email);

        // Verificar se o usuário tem role client
        const {
          data: rolesData
        } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "client").maybeSingle();
        toast.success("Login realizado com sucesso!");

        // Redirecionar baseado no role
        if (rolesData) {
          navigate("/acompanhamento");
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      console.error("Erro na autenticação:", error);
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Credenciais inválidas");
      } else {
        toast.error("Erro ao realizar autenticação");
      }
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
    backgroundColor: 'rgba(255, 205, 0, 0.05)'
  }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ffcd00]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#ffcd00]/5 rounded-full blur-3xl" />
      </div>

      {/* Centered Content */}
      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* Rhello Flow Logo - Above Card */}
        <div className="flex items-center gap-1">
          <img alt="Rhello RH" className="h-28 w-auto" src="/lovable-uploads/0e3e8693-dfae-4588-8a04-9a33b7dd1eea.png" />
          <span className="text-8xl font-black leading-none font-azo text-foreground">
            flow
          </span>
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-md border-0 shadow-2xl animate-fade-in">
          <CardHeader className="space-y-6 text-center pb-8">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold" style={{
              color: 'hsl(var(--foreground))'
            }}>
                Bem-vindo
              </CardTitle>
              <CardDescription className="text-base font-medium">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </div>
          </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email} 
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                  }} 
                  className={cn("pl-10 h-12 text-base", errors.email && "border-destructive")} 
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  }} 
                  className={cn("pl-10 pr-10 h-12 text-base", errors.password && "border-destructive")} 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              {loading ? <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processando...
                </div> : "Entrar"}
            </Button>
          </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Sistema de Recrutamento e Seleção
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}