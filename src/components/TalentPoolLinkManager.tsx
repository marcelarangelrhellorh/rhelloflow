import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy, ExternalLink, Plus, Settings, Trash2, Eye, Link2, Calendar, Users, Shield, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";

interface TalentPoolLink {
  id: string;
  token: string;
  active: boolean;
  expires_at: string | null;
  max_submissions: number | null;
  submissions_count: number;
  created_at: string;
  last_used_at: string | null;
  note: string | null;
  revoked: boolean;
  password_hash: string | null;
}

export function TalentPoolLinkManager() {
  const [links, setLinks] = useState<TalentPoolLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  
  // Form state for new link
  const [newLinkConfig, setNewLinkConfig] = useState({
    password: "",
    expires_days: "",
    max_submissions: "",
    note: ""
  });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("talent_pool_links")
        .select("*")
        .eq("revoked", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      logger.error("Erro ao carregar links:", error);
      toast.error("Erro ao carregar links do banco de talentos");
    } finally {
      setLoading(false);
    }
  };

  const createLink = async () => {
    try {
      setCreating(true);
      
      const { data, error } = await supabase.functions.invoke("generate-talent-pool-link", {
        body: {
          password: newLinkConfig.password || undefined,
          expires_days: newLinkConfig.expires_days ? parseInt(newLinkConfig.expires_days) : undefined,
          max_submissions: newLinkConfig.max_submissions ? parseInt(newLinkConfig.max_submissions) : undefined,
          note: newLinkConfig.note || undefined
        }
      });

      if (error) throw error;

      toast.success("Link criado com sucesso!");
      setCreateDialogOpen(false);
      setNewLinkConfig({ password: "", expires_days: "", max_submissions: "", note: "" });
      loadLinks();
    } catch (error) {
      logger.error("Erro ao criar link:", error);
      toast.error("Erro ao criar link");
    } finally {
      setCreating(false);
    }
  };

  const toggleLink = async (linkId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("talent_pool_links")
        .update({ active })
        .eq("id", linkId);

      if (error) throw error;

      toast.success(active ? "Link ativado" : "Link desativado");
      loadLinks();
    } catch (error) {
      logger.error("Erro ao alterar status do link:", error);
      toast.error("Erro ao alterar status do link");
    }
  };

  const deleteLink = async () => {
    if (!selectedLinkId) return;
    
    try {
      const { error } = await supabase
        .from("talent_pool_links")
        .update({ 
          revoked: true, 
          revoked_at: new Date().toISOString(),
          active: false 
        })
        .eq("id", selectedLinkId);

      if (error) throw error;

      toast.success("Link removido com sucesso");
      setDeleteDialogOpen(false);
      setSelectedLinkId(null);
      loadLinks();
    } catch (error) {
      logger.error("Erro ao remover link:", error);
      toast.error("Erro ao remover link");
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/banco-talentos/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  const openLink = (token: string) => {
    const url = `${window.location.origin}/banco-talentos/${token}`;
    window.open(url, "_blank");
  };

  const getStatusBadge = (link: TalentPoolLink) => {
    if (!link.active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (link.max_submissions && link.submissions_count >= link.max_submissions) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Limite atingido</Badge>;
    }
    return <Badge className="bg-green-500">Ativo</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Links do Banco de Talentos
          </CardTitle>
          <CardDescription>
            Gerencie links públicos para cadastro no banco de talentos
          </CardDescription>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00141D] hover:bg-[#00141D]/90 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Novo Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Link</DialogTitle>
              <DialogDescription>
                Configure as opções do link de cadastro público
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="password">Senha de Acesso (opcional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Deixe vazio para acesso livre"
                  value={newLinkConfig.password}
                  onChange={(e) => setNewLinkConfig({ ...newLinkConfig, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Proteja o formulário com uma senha
                </p>
              </div>
              
              <div>
                <Label htmlFor="expires_days">Expirar em (dias)</Label>
                <Input
                  id="expires_days"
                  type="number"
                  min="1"
                  placeholder="Ex: 30"
                  value={newLinkConfig.expires_days}
                  onChange={(e) => setNewLinkConfig({ ...newLinkConfig, expires_days: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe vazio para link sem expiração
                </p>
              </div>

              <div>
                <Label htmlFor="max_submissions">Limite de Submissões</Label>
                <Input
                  id="max_submissions"
                  type="number"
                  min="1"
                  placeholder="Ex: 100"
                  value={newLinkConfig.max_submissions}
                  onChange={(e) => setNewLinkConfig({ ...newLinkConfig, max_submissions: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe vazio para submissões ilimitadas
                </p>
              </div>

              <div>
                <Label htmlFor="note">Nota/Descrição</Label>
                <Textarea
                  id="note"
                  placeholder="Ex: Link para evento de carreira 2025"
                  value={newLinkConfig.note}
                  onChange={(e) => setNewLinkConfig({ ...newLinkConfig, note: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createLink} disabled={creating}>
                  {creating ? "Criando..." : "Criar Link"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum link criado ainda.</p>
            <p className="text-sm">Crie um link para receber candidaturas públicas.</p>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(link)}
                  {link.password_hash && (
                    <Badge variant="outline" className="border-blue-500 text-blue-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Protegido
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={link.active}
                  onCheckedChange={(checked) => toggleLink(link.id, checked)}
                />
              </div>

              {link.note && (
                <p className="text-sm text-muted-foreground">{link.note}</p>
              )}

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/banco-talentos/${link.token}`}
                  className="text-xs font-mono bg-muted"
                />
                <Button variant="outline" size="icon" onClick={() => copyLink(link.token)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => openLink(link.token)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {link.submissions_count} submissões
                  {link.max_submissions && ` / ${link.max_submissions}`}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Criado em {format(new Date(link.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {link.expires_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expira em {format(new Date(link.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
                {link.last_used_at && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Último uso: {format(new Date(link.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedLinkId(link.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Link</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este link? Os candidatos que já usaram o link não serão afetados, mas novas submissões não serão possíveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteLink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
