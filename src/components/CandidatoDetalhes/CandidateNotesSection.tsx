import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, X, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MentionEditor } from "@/components/ui/mention-editor";
import { useMentions } from "@/hooks/useMentions";

interface CandidateNote {
  id: string;
  candidate_id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  user_name?: string;
}

interface CandidateNotesSectionProps {
  candidateId: string;
  candidateName?: string;
}

export function CandidateNotesSection({
  candidateId,
  candidateName = "Candidato"
}: CandidateNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { mentionUsers, processMentions } = useMentions();

  const fetchNotes = async () => {
    if (!candidateId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidate_notes")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(n => n.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const userMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        const notesWithNames = data.map(note => ({
          ...note,
          user_name: userMap.get(note.user_id) || "Usuário desconhecido"
        }));
        setNotes(notesWithNames);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error("Error fetching candidate notes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as anotações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && notes.length === 0) {
      fetchNotes();
    }
  }, [isExpanded, candidateId]);

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

      // Buscar nome do usuário atual
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { data: insertedNote, error } = await supabase
        .from("candidate_notes")
        .insert({
          candidate_id: candidateId,
          user_id: user.id,
          title: formTitle.trim() || null,
          content: formContent
        })
        .select()
        .single();

      if (error) throw error;

      // Processar menções e enviar notificações
      if (insertedNote) {
        await processMentions(
          formContent,
          'candidate_note',
          insertedNote.id,
          candidateName,
          profile?.full_name || "Alguém"
        );
      }

      toast({
        title: "Sucesso",
        description: "Anotação adicionada com sucesso."
      });

      setFormTitle("");
      setFormContent("");
      setShowForm(false);
      fetchNotes();
    } catch (error) {
      console.error("Error saving candidate note:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a anotação.",
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

  return (
    <div className="rounded-lg border border-gray-200 dark:border-secondary-text-light/20 bg-card shadow-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            Anotações
          </span>
          {notes.length > 0 && (
            <span className="text-muted-foreground text-sm font-medium">
              ({notes.length})
            </span>
          )}
        </div>
      </button>

      {/* Content - Visible when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Actions header */}
          <div className="flex items-center justify-between py-3">
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                size="sm"
                className="w-full bg-primary text-primary-foreground text-xs font-semibold"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            )}
          </div>

          {/* Inline Form */}
          {showForm && (
            <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30">
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-foreground mb-1 block text-xs">
                    Título (opcional)
                  </label>
                  <Input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Ex: Follow-up..."
                    className="bg-background text-sm h-8"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground mb-1 block text-xs">
                    Conteúdo * <span className="text-muted-foreground">(use @ para mencionar)</span>
                  </label>
                  <MentionEditor
                    value={formContent}
                    onChange={setFormContent}
                    users={mentionUsers}
                    placeholder="Observações... Use @ para mencionar alguém"
                    minHeight="100px"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="text-xs h-7 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !formContent.trim()}
                    className="text-xs h-7 px-2 bg-primary"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isSaving ? "..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="p-3 rounded-lg border border-border">
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && notes.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">Nenhuma anotação ainda.</p>
            </div>
          )}

          {/* Notes list */}
          {!isLoading && notes.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {notes.map(note => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                >
                  <h4 className="font-semibold text-foreground truncate text-sm">
                    {note.title || "Sem título"}
                  </h4>
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-1">
                    <span className="font-medium">
                      {format(new Date(note.created_at), "dd/MM/yy 'às' HH:mm", {
                        locale: ptBR
                      })}
                    </span>
                    {note.user_name && (
                      <span className="truncate font-medium">{note.user_name}</span>
                    )}
                  </div>
                  <div
                    className="mt-2 text-xs text-foreground/80 line-clamp-2 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-3 [&_ol]:list-decimal [&_ol]:pl-3 [&_.mention]:bg-primary/15 [&_.mention]:text-primary [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:rounded [&_.mention]:font-medium"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
