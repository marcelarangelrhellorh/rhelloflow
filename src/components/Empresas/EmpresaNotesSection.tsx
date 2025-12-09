import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, X, Save, FileText, Paperclip, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface EmpresaNote {
  id: string;
  empresa_id: string;
  user_id: string;
  title: string | null;
  content: string;
  documento_url: string | null;
  documento_nome: string | null;
  created_at: string;
  user_name?: string;
}

interface EmpresaNotesSectionProps {
  empresaId: string;
}

export function EmpresaNotesSection({ empresaId }: EmpresaNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<EmpresaNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    if (!empresaId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("empresa_notes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      if (error) throw error;

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
      console.error("Error fetching empresa notes:", error);
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
  }, [isExpanded, empresaId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Apenas arquivos PDF, DOC ou DOCX são permitidos.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async (): Promise<{ url: string; name: string } | null> => {
    if (!selectedFile) return null;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${empresaId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("empresa-documentos")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      return {
        url: fileName,
        name: selectedFile.name,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer o upload do arquivo.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

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

      // Upload file if selected
      let fileData: { url: string; name: string } | null = null;
      if (selectedFile) {
        fileData = await uploadFile();
      }

      const { error } = await supabase.from("empresa_notes").insert({
        empresa_id: empresaId,
        user_id: user.id,
        title: formTitle.trim() || null,
        content: formContent,
        documento_url: fileData?.url || null,
        documento_nome: fileData?.name || null,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Anotação adicionada com sucesso.",
      });

      setFormTitle("");
      setFormContent("");
      setSelectedFile(null);
      setShowForm(false);
      fetchNotes();
    } catch (error) {
      console.error("Error saving empresa note:", error);
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
    setSelectedFile(null);
    setShowForm(false);
  };

  const handleDownload = async (documentoUrl: string, documentoNome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("empresa-documentos")
        .download(documentoUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentoNome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-gray-300 bg-card shadow-md">
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
            Histórico / Anotações
          </span>
          {notes.length > 0 && (
            <span className="ml-2 text-muted-foreground text-base font-semibold">
              ({notes.length} registro{notes.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
      </button>

      {/* Content - Visible when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Actions header */}
          <div className="flex items-center justify-between py-4">
            <h3 className="text-lg font-semibold text-foreground">
              Histórico de Interações
            </h3>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                size="sm"
                className="bg-[#00141d] text-white font-semibold text-base"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar registro
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
                    placeholder="Ex: Reunião de alinhamento, Negociação comercial..."
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
                      placeholder="Descreva a reunião, negociação ou observação sobre o cliente..."
                      className="[&_.ql-editor]:min-h-[120px] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-container]:border-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-medium text-foreground mb-1 block text-base">
                    Anexar documento de ata (opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : "Selecionar arquivo"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {selectedFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: PDF, DOC, DOCX (máx. 10MB)
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving || isUploading}
                    className="text-sm font-semibold"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isUploading || !formContent.trim()}
                    className="font-semibold bg-[#00141d]"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving || isUploading ? "Salvando..." : "Salvar"}
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
              <p className="font-medium">Nenhum registro de interação ainda.</p>
              <p className="text-sm font-medium">
                Registre reuniões, negociações e observações sobre o cliente.
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
                        className="mt-2 text-base text-foreground/80 prose prose-base max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                      {/* Attachment */}
                      {note.documento_url && note.documento_nome && (
                        <div className="mt-3 flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {note.documento_nome}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownload(note.documento_url!, note.documento_nome!)
                            }
                            className="text-primary hover:text-primary/80 h-auto p-1"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
