import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, X, Save, History, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MentionEditor } from "@/components/ui/mention-editor";
import { useMentions } from "@/hooks/useMentions";
import { useUserRoleQuery } from "@/hooks/data/useUserRoleQuery";
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

interface JobHistoryRecord {
  id: string;
  job_id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  user_name?: string;
}

interface JobHistorySectionProps {
  vagaId: string;
  vagaTitle?: string;
}

export function JobHistorySection({
  vagaId,
  vagaTitle
}: JobHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<JobHistoryRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Estados de exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados de edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { mentionUsers, processMentions } = useMentions();
  const { isAdmin, user } = useUserRoleQuery();

  const fetchRecords = async () => {
    if (!vagaId) return;
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from("job_history").select("*").eq("job_id", vagaId).order("created_at", {
        ascending: false
      });
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const {
          data: profiles
        } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const userMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        const recordsWithNames = data.map(record => ({
          ...record,
          user_name: userMap.get(record.user_id) || "Usuário desconhecido"
        }));
        setRecords(recordsWithNames);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Error fetching job history:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && records.length === 0) {
      fetchRecords();
    }
  }, [isExpanded, vagaId]);

  const handleSave = async () => {
    if (!formContent.trim()) {
      toast({
        title: "Erro",
        description: "O conteúdo é obrigatório.",
        variant: "destructive"
      });
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { data: insertedRecord, error } = await supabase
        .from("job_history")
        .insert({
          job_id: vagaId,
          user_id: user.id,
          title: formTitle.trim() || null,
          content: formContent
        })
        .select()
        .single();

      if (error) throw error;

      if (insertedRecord) {
        await processMentions(
          formContent,
          'job_history',
          insertedRecord.id,
          vagaTitle || "Vaga",
          profile?.full_name || "Alguém"
        );
      }

      toast({
        title: "Sucesso",
        description: "Registro adicionado ao histórico."
      });
      setFormTitle("");
      setFormContent("");
      setShowForm(false);
      fetchRecords();
    } catch (error) {
      console.error("Error saving job history:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormTitle("");
    setFormContent("");
    setShowForm(false);
  };

  // Funções de exclusão
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("job_history")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Registro excluído." });
      setRecords(prev => prev.filter(r => r.id !== deleteId));
    } catch (error) {
      console.error("Error deleting job history:", error);
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Funções de edição
  const handleStartEdit = (record: JobHistoryRecord) => {
    setEditingId(record.id);
    setEditTitle(record.title || "");
    setEditContent(record.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    setIsEditing(true);
    try {
      const { error } = await supabase
        .from("job_history")
        .update({
          title: editTitle.trim() || null,
          content: editContent
        })
        .eq("id", editingId);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Registro atualizado." });
      handleCancelEdit();
      fetchRecords();
    } catch (error) {
      console.error("Error updating job history:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    } finally {
      setIsEditing(false);
    }
  };

  const canEditDelete = (record: JobHistoryRecord) => isAdmin || record.user_id === user?.id;

  return (
    <div className="mt-8 rounded-lg border border-border bg-card">
      {/* Header - Always visible */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <History className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-base">Histórico</span>
          {records.length > 0 && <span className="ml-2 text-muted-foreground text-base font-semibold">
              ({records.length} registro{records.length !== 1 ? "s" : ""})
            </span>}
        </div>
      </button>

      {/* Content - Visible when expanded */}
      {isExpanded && <div className="px-4 pb-4 border-t border-border">
          {/* Actions header */}
          <div className="flex items-center justify-between py-4">
            <h3 className="text-lg font-semibold text-foreground">Histórico</h3>
            {!showForm && <Button onClick={() => setShowForm(true)} size="sm" className="bg-[#00141d] text-white font-semibold text-base">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar registro
              </Button>}
          </div>

          {/* Inline Form */}
          {showForm && <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
              <div className="space-y-4">
                <div>
                  <label className="font-medium text-foreground mb-1 block text-base">
                    Título (opcional)
                  </label>
                  <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Reunião com cliente, Atualização de requisitos..." className="bg-background text-base" />
                </div>
                <div>
                  <label className="font-medium text-foreground mb-1 block text-base">
                    Conteúdo * <span className="text-muted-foreground text-sm">(use @ para mencionar)</span>
                  </label>
                  <MentionEditor
                    value={formContent}
                    onChange={setFormContent}
                    users={mentionUsers}
                    placeholder="Descreva o que aconteceu... Use @ para mencionar alguém"
                    minHeight="120px"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="text-sm font-semibold">
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || !formContent.trim()} className="font-semibold bg-[#00141d]">
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>}

          {/* Loading state */}
          {isLoading && <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="p-4 rounded-lg border border-border">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>)}
            </div>}

          {/* Empty state */}
          {!isLoading && records.length === 0 && <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum histórico registrado ainda.</p>
              <p className="text-sm font-medium">
                Clique em "Adicionar registro" para criar o primeiro.
              </p>
            </div>}

          {/* Records list */}
          {!isLoading && records.length > 0 && <div className="space-y-3">
              {records.map(record => (
                <div key={record.id}>
                  {editingId === record.id ? (
                    <div className="p-4 rounded-lg border border-primary/50 bg-muted/30">
                      <div className="space-y-4">
                        <div>
                          <label className="font-medium text-foreground mb-1 block text-base">
                            Título (opcional)
                          </label>
                          <Input 
                            value={editTitle} 
                            onChange={e => setEditTitle(e.target.value)} 
                            placeholder="Ex: Reunião com cliente..." 
                            className="bg-background text-base" 
                          />
                        </div>
                        <div>
                          <label className="font-medium text-foreground mb-1 block text-base">
                            Conteúdo * <span className="text-muted-foreground text-sm">(use @ para mencionar)</span>
                          </label>
                          <MentionEditor
                            value={editContent}
                            onChange={setEditContent}
                            users={mentionUsers}
                            placeholder="Descreva o que aconteceu..."
                            minHeight="120px"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={handleCancelEdit} disabled={isEditing} className="text-sm font-semibold">
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button onClick={handleSaveEdit} disabled={isEditing || !editContent.trim()} className="font-semibold bg-[#00141d]">
                            <Save className="h-4 w-4 mr-1" />
                            {isEditing ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate text-base">
                            {record.title || "Sem título"}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="text-base font-medium">
                              {format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                                locale: ptBR
                              })}
                            </span>
                            {record.user_name && <>
                                <span>•</span>
                                <span className="text-base font-medium">{record.user_name}</span>
                              </>}
                          </div>
                          <div 
                            className="mt-2 text-base text-foreground/80 line-clamp-3 prose prose-base max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_.mention]:bg-primary/15 [&_.mention]:text-primary [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:rounded [&_.mention]:font-medium" 
                            dangerouslySetInnerHTML={{ __html: record.content }}
                          />
                        </div>

                        {canEditDelete(record) && !editingId && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(record)}
                              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(record.id)}
                              className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>}
        </div>}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
