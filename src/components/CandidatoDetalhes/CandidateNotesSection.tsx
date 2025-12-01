import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, X, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

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
}

export function CandidateNotesSection({ candidateId }: CandidateNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const quillModules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["clean"],
      ],
    }),
    []
  );

  const quillFormats = ["bold", "italic", "underline", "list", "bullet"];

  const fetchNotes = async () => {
    if (!candidateId) return;

    setIsLoading(true);
    try {
      // Fetch notes with user info
      const { data, error } = await supabase
        .from("candidate_notes")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user names for each note
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((n) => n.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const userMap = new Map(
          profiles?.map((p) => [p.id, p.full_name]) || []
        );

        const notesWithNames = data.map((note) => ({
          ...note,
          user_name: userMap.get(note.user_id) || "Usuário desconhecido",
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
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("candidate_notes").insert({
        candidate_id: candidateId,
        user_id: user.id,
        title: formTitle.trim() || null,
        content: formContent,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Anotação adicionada com sucesso.",
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
        variant: "destructive",
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
    <div className="mt-8 rounded-lg border border-gray-300 bg-card">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-base">
            Anotações
          </span>
          {notes.length > 0 && (
            <span className="ml-2 text-muted-foreground text-base font-semibold">
              ({notes.length} anotaç{notes.length !== 1 ? "ões" : "ão"})
            </span>
          )}
        </div>
      </button>

      {/* Content - Visible when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Actions header */}
          <div className="flex items-center justify-between py-4">
            <h3 className="text-lg font-semibold text-foreground">Anotações</h3>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                size="sm"
                className="bg-[#00141d] text-white font-semibold text-base"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar anotação
              </Button>
            )}
          </div>

          {/* Inline Form */}
          {showForm && (
            <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
              <div className="space-y-4">
                <div>
                  <label className="font-medium text-foreground mb-1 block text-base">
                    Título (opcional)
                  </label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Contato inicial, Follow-up..."
                    className="bg-background text-base"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground mb-1 block text-base">
                    Conteúdo *
                  </label>
                  <div className="bg-background rounded-md border border-input">
                    <ReactQuill
                      theme="snow"
                      value={formContent}
                      onChange={setFormContent}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Descreva suas observações sobre o candidato..."
                      className="[&_.ql-editor]:min-h-[120px] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-container]:border-0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="text-sm font-semibold"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !formContent.trim()}
                    className="font-semibold bg-[#00141d]"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg border border-border">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && notes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma anotação registrada ainda.</p>
              <p className="text-sm font-medium">
                Clique em "Adicionar anotação" para criar a primeira.
              </p>
            </div>
          )}

          {/* Notes list */}
          {!isLoading && notes.length > 0 && (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate text-base">
                        {note.title || "Sem título"}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className="text-base font-medium">
                          {format(
                            new Date(note.created_at),
                            "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                        {note.user_name && (
                          <>
                            <span>•</span>
                            <span className="text-base font-medium">
                              {note.user_name}
                            </span>
                          </>
                        )}
                      </div>
                      <div
                        className="mt-2 text-base text-foreground/80 line-clamp-3 prose prose-base max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
