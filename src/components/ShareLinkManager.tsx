import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, ExternalLink, Edit, History, Trash2, RefreshCw, Power } from "lucide-react";

interface ShareLink {
  id: string;
  token: string;
  active: boolean;
  expires_at: string | null;
  max_submissions: number | null;
  submissions_count: number;
  password_hash: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
  note: string | null;
  url?: string;
}

interface ShareLinkManagerProps {
  vagaId: string;
  onLinkCreated?: (link: ShareLink) => void;
}

export function ShareLinkManager({ vagaId, onLinkCreated }: ShareLinkManagerProps) {
  const { toast } = useToast();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ShareLink | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // Edit form state
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [maxSubmissions, setMaxSubmissions] = useState<number | undefined>();
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [useExpiration, setUseExpiration] = useState(false);
  const [useMaxSubmissions, setUseMaxSubmissions] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

  useEffect(() => {
    loadLinks();
  }, [vagaId]);

  const loadLinks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('get-existing-link', {
        body: { vaga_id: vagaId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setLinks(data.links || []);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "Link copiado para a área de transferência" });
  };

  const openEditDialog = (link: ShareLink) => {
    setSelectedLink(link);
    setNote(link.note || "");
    setUsePassword(!!link.password_hash);
    setPassword("");
    
    if (link.expires_at) {
      setUseExpiration(true);
      const daysUntilExpiry = Math.ceil((new Date(link.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setExpiresInDays(daysUntilExpiry > 0 ? daysUntilExpiry : 30);
    } else {
      setUseExpiration(false);
      setExpiresInDays(30);
    }
    
    if (link.max_submissions) {
      setUseMaxSubmissions(true);
      setMaxSubmissions(link.max_submissions);
    } else {
      setUseMaxSubmissions(false);
      setMaxSubmissions(undefined);
    }
    
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedLink) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('edit-share-link', {
        body: {
          link_id: selectedLink.id,
          expires_in_days: useExpiration ? expiresInDays : null,
          password: usePassword ? password || null : null,
          max_submissions: useMaxSubmissions ? maxSubmissions : null,
          note: note || null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({ title: "Link atualizado!", description: "Configurações do link atualizadas com sucesso" });
      setEditDialogOpen(false);
      loadLinks();
    } catch (error) {
      console.error('Error editing link:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível atualizar o link", 
        variant: "destructive" 
      });
    }
  };

  const handleToggle = async (link: ShareLink) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('toggle-share-link', {
        body: {
          link_id: link.id,
          active: !link.active,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({ 
        title: link.active ? "Link desativado" : "Link ativado", 
        description: link.active ? "O link não aceita mais inscrições" : "O link voltou a aceitar inscrições" 
      });
      loadLinks();
    } catch (error) {
      console.error('Error toggling link:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível alterar o status do link", 
        variant: "destructive" 
      });
    }
  };

  const handleRegenerate = async () => {
    if (!selectedLink) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('regenerate-share-link', {
        body: { link_id: selectedLink.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({ 
        title: "Link regenerado!", 
        description: "Um novo link foi criado. O link anterior foi desativado." 
      });
      setRegenerateDialogOpen(false);
      loadLinks();
      if (onLinkCreated && data) {
        onLinkCreated(data);
      }
    } catch (error) {
      console.error('Error regenerating link:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível regenerar o link", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedLink) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('delete-share-link', {
        body: { link_id: selectedLink.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({ 
        title: "Link excluído", 
        description: "O link foi removido com sucesso" 
      });
      setDeleteDialogOpen(false);
      loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível excluir o link", 
        variant: "destructive" 
      });
    }
  };

  const loadHistory = async (link: ShareLink) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('get-share-link-history', {
        body: { link_id: link.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setHistory(data.history || []);
      setSelectedLink(link);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível carregar o histórico", 
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (link: ShareLink) => {
    if (link.revoked) {
      return <Badge variant="secondary" className="bg-gray-500/20">Revogado</Badge>;
    }
    if (!link.active) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (link.max_submissions && link.submissions_count >= link.max_submissions) {
      return <Badge variant="secondary" className="bg-orange-500/20">Limite Atingido</Badge>;
    }
    return <Badge variant="default" className="bg-green-500/20 text-green-800 dark:text-green-300">Ativo</Badge>;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando links...</div>;
  }

  const activeLinks = links.filter(l => l.active && !l.revoked);
  const inactiveLinks = links.filter(l => !l.active || l.revoked);

  return (
    <div className="space-y-4">
      {activeLinks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Links Ativos</h3>
          {activeLinks.map((link) => (
            <div key={link.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                {getStatusBadge(link)}
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggle(link)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{link.active ? "Desativar" : "Ativar"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(link)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLink(link);
                            setRegenerateDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Regenerar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => loadHistory(link)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Histórico</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLink(link);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Excluir</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex gap-2">
                <Input value={link.url || ""} readOnly className="font-mono text-xs" />
                <Button onClick={() => copyLink(link.url!)} size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => window.open(link.url, '_blank')} 
                  size="icon" 
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Inscrições: {link.submissions_count}{link.max_submissions ? ` / ${link.max_submissions}` : ""}</div>
                <div>Senha: {link.password_hash ? "Sim" : "Não"}</div>
                {link.expires_at && (
                  <div>Expira: {format(new Date(link.expires_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                )}
                {link.last_used_at && (
                  <div>Último uso: {format(new Date(link.last_used_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                )}
              </div>

              {link.note && (
                <div className="text-xs text-muted-foreground italic">Nota: {link.note}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {inactiveLinks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Links Inativos / Revogados</h3>
          {inactiveLinks.map((link) => (
            <div key={link.id} className="border rounded-lg p-4 space-y-2 opacity-60">
              <div className="flex items-center justify-between">
                {getStatusBadge(link)}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadHistory(link)}
                >
                  <History className="h-4 w-4 mr-2" />
                  Ver Histórico
                </Button>
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate">
                {link.url}
              </div>
              <div className="text-xs text-muted-foreground">
                Inscrições recebidas: {link.submissions_count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Link de Compartilhamento</DialogTitle>
            <DialogDescription>
              Altere as configurações do link de compartilhamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-use-expiration">Definir data de expiração</Label>
                <Switch
                  id="edit-use-expiration"
                  checked={useExpiration}
                  onCheckedChange={setUseExpiration}
                />
              </div>
              {useExpiration && (
                <div>
                  <Label htmlFor="edit-expiration">Expira em (dias)</Label>
                  <Input
                    id="edit-expiration"
                    type="number"
                    min="1"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-use-password">Proteger com senha</Label>
                <Switch
                  id="edit-use-password"
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>
              {usePassword && (
                <div>
                  <Label htmlFor="edit-password">Nova Senha (deixe vazio para manter)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    placeholder="Digite uma nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-use-max">Limitar número de inscrições</Label>
                <Switch
                  id="edit-use-max"
                  checked={useMaxSubmissions}
                  onCheckedChange={setUseMaxSubmissions}
                />
              </div>
              {useMaxSubmissions && (
                <div>
                  <Label htmlFor="edit-max-submissions">Máximo de inscrições</Label>
                  <Input
                    id="edit-max-submissions"
                    type="number"
                    min="1"
                    placeholder="Ex: 100"
                    value={maxSubmissions || ''}
                    onChange={(e) => setMaxSubmissions(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="edit-note">Nota (opcional)</Label>
              <Input
                id="edit-note"
                placeholder="Ex: Link para divulgação no LinkedIn"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar Link de Compartilhamento</AlertDialogTitle>
            <AlertDialogDescription>
              Ao regenerar, um novo link será criado com as mesmas configurações. 
              O link antigo será desativado automaticamente.
              <br /><br />
              <strong>Importante:</strong> Candidaturas recebidas pelo link antigo permanecerão registradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Regenerar Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Link de Compartilhamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este link? Esta ação não pode ser desfeita.
              <br /><br />
              <strong>Recomendação:</strong> Considere desativar o link em vez de excluí-lo, 
              para manter o histórico completo.
              <br /><br />
              As candidaturas já recebidas permanecerão vinculadas no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico do Link</DialogTitle>
            <DialogDescription>
              Todas as ações realizadas neste link de compartilhamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ação registrada</p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{entry.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.performed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {entry.performer && (
                    <p className="text-sm">Por: {entry.performer.name || entry.performer.email}</p>
                  )}
                  {entry.changes && Object.keys(entry.changes).length > 0 && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(entry.changes, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
