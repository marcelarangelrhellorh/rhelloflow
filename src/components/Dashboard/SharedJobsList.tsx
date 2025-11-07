import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Calendar, Users, RefreshCw, Share2, Power, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface SharedJob {
  vaga_id: string;
  vaga_titulo: string;
  link_id: string;
  token: string;
  expires_at: string | null;
  submissions_count: number;
  active: boolean;
  created_at: string;
}

interface SharedJobsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function SharedJobsList({ open, onOpenChange, onRefresh }: SharedJobsListProps) {
  const [jobs, setJobs] = useState<SharedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadJobs();
    }
  }, [open]);

  const loadJobs = async () => {
    try {
      setLoading(true);

      const { data: shareLinks, error } = await supabase
        .from('share_links')
        .select(`
          id,
          vaga_id,
          token,
          expires_at,
          submissions_count,
          active,
          created_at,
          vagas (
            titulo
          )
        `)
        .eq('deleted', false)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const result: SharedJob[] = shareLinks?.map(sl => ({
        vaga_id: sl.vaga_id,
        vaga_titulo: (sl.vagas as any)?.titulo || 'Vaga não encontrada',
        link_id: sl.id,
        token: sl.token,
        expires_at: sl.expires_at,
        submissions_count: sl.submissions_count,
        active: sl.active,
        created_at: sl.created_at,
      })) || [];

      setJobs(result);
    } catch (error) {
      console.error("Erro ao carregar vagas compartilhadas:", error);
      toast.error("Erro ao carregar lista de vagas");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/vaga/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const openLink = (token: string) => {
    const link = `${window.location.origin}/vaga/${token}`;
    window.open(link, '_blank');
  };

  const formatExpirationDate = (expiresAt: string | null) => {
    if (!expiresAt) return "Sem expiração";
    
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    
    if (expirationDate < now) {
      return <span className="text-destructive">Expirado</span>;
    }
    
    return (
      <span className="text-muted-foreground">
        Expira {formatDistanceToNow(expirationDate, { addSuffix: true, locale: ptBR })}
      </span>
    );
  };

  const handleToggleActive = async (linkId: string) => {
    try {
      setProcessingId(linkId);
      
      const { error } = await supabase.functions.invoke('toggle-share-link', {
        body: { linkId }
      });

      if (error) throw error;

      toast.success("Link desativado com sucesso!");
      loadJobs();
      onRefresh();
    } catch (error) {
      console.error("Erro ao desativar link:", error);
      toast.error("Erro ao desativar link");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      setProcessingId(deletingId);
      
      const { error } = await supabase.functions.invoke('delete-share-link', {
        body: { linkId: deletingId }
      });

      if (error) throw error;

      toast.success("Link excluído com sucesso!");
      setDeletingId(null);
      loadJobs();
      onRefresh();
    } catch (error) {
      console.error("Erro ao excluir link:", error);
      toast.error("Erro ao excluir link");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Vagas Compartilhadas</SheetTitle>
          <SheetDescription>
            Vagas com links de divulgação ativos para candidaturas
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {jobs.length} {jobs.length === 1 ? 'vaga compartilhada' : 'vagas compartilhadas'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadJobs();
                onRefresh();
              }}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma vaga compartilhada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.link_id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate mb-1">
                          {job.vaga_titulo}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {job.submissions_count} {job.submissions_count === 1 ? 'candidatura' : 'candidaturas'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatExpirationDate(job.expires_at)}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(job.token)}
                        className="flex-1"
                        disabled={processingId === job.link_id}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLink(job.token)}
                        disabled={processingId === job.link_id}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(job.link_id)}
                        disabled={processingId === job.link_id}
                        title="Desativar link"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingId(job.link_id)}
                        disabled={processingId === job.link_id}
                        className="text-destructive hover:text-destructive"
                        title="Excluir link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este link de compartilhamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
