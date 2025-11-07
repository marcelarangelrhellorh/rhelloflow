import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Trash2, ExternalLink, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientViewLink {
  id: string;
  token: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  last_accessed_at: string | null;
}

interface ClientViewLinkManagerProps {
  vagaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientViewLinkManager({ vagaId, open, onOpenChange }: ClientViewLinkManagerProps) {
  const [links, setLinks] = useState<ClientViewLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadLinks();
    }
  }, [open, vagaId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_view_links')
        .select('*')
        .eq('vaga_id', vagaId)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading links:', error);
      toast({
        title: "Erro ao carregar links",
        description: "Não foi possível carregar os links de visualização",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNew = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-client-view-link', {
        body: { vagaId }
      });

      if (error) throw error;

      const fullUrl = `${window.location.origin}/client-view/${data.token}`;
      await navigator.clipboard.writeText(fullUrl);

      toast({
        title: "Link gerado com sucesso!",
        description: "O link foi copiado para a área de transferência",
      });

      await loadLinks();
    } catch (error) {
      console.error('Error generating link:', error);
      toast({
        title: "Erro ao gerar link",
        description: "Não foi possível gerar o link de visualização",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const fullUrl = `${window.location.origin}/client-view/${token}`;
    await navigator.clipboard.writeText(fullUrl);
    
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência",
    });
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      setDeleting(linkId);
      
      const { error } = await supabase
        .from('client_view_links')
        .update({ deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Link excluído!",
        description: "O link foi excluído com sucesso",
      });

      await loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: "Erro ao excluir link",
        description: "Não foi possível excluir o link",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (linkId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('client_view_links')
        .update({ active: !currentActive })
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: currentActive ? "Link desativado" : "Link ativado",
        description: currentActive 
          ? "O link foi desativado e não pode mais ser acessado" 
          : "O link foi reativado e pode ser acessado novamente",
      });

      await loadLinks();
    } catch (error) {
      console.error('Error toggling link:', error);
      toast({
        title: "Erro ao atualizar link",
        description: "Não foi possível atualizar o status do link",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Links de Visualização do Cliente</DialogTitle>
          <DialogDescription>
            Crie e gerencie links para compartilhar o progresso da vaga com o cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button 
            onClick={handleGenerateNew} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Gerando..." : "Gerar Novo Link"}
          </Button>

          {loading && links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando links...
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum link criado ainda. Clique em "Gerar Novo Link" para criar o primeiro.
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                
                return (
                  <Card key={link.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={link.active && !isExpired ? "default" : "secondary"}>
                              {isExpired ? "Expirado" : link.active ? "Ativo" : "Desativado"}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Criado em {format(new Date(link.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>

                          {link.last_accessed_at && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Eye className="h-4 w-4" />
                              <span>
                                Último acesso em {format(new Date(link.last_accessed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          )}

                          {link.expires_at && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Expira em {format(new Date(link.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleCopyLink(link.token)}
                            title="Copiar link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => window.open(`/client-view/${link.token}`, '_blank')}
                            title="Abrir link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleToggleActive(link.id, link.active)}
                            title={link.active ? "Desativar" : "Ativar"}
                          >
                            {link.active ? "🔓" : "🔒"}
                          </Button>

                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDeleteLink(link.id)}
                            disabled={deleting === link.id}
                            title="Excluir link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
