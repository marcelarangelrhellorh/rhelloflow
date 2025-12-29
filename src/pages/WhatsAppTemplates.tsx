import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MessageSquare, Search, Grid3x3, List, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
interface WhatsAppTemplate {
  id: string;
  key: string;
  name: string;
  content: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  creator_name?: string;
}
interface TemplateFormData {
  key: string;
  name: string;
  content: string;
  description: string;
  active: boolean;
}
const WhatsAppTemplates = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [formData, setFormData] = useState<TemplateFormData>({
    key: "",
    name: "",
    content: "",
    description: "",
    active: true
  });
  const {
    data: templates,
    isLoading
  } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase
        .from("whatsapp_templates")
        .select(`
          *,
          creator:created_by (
            full_name
          )
        `)
        .order("created_at", {
          ascending: false
        });
      if (error) throw error;
      return (data || []).map((template: any) => ({
        ...template,
        creator_name: template.creator?.full_name || 'Desconhecido'
      })) as WhatsAppTemplate[];
    }
  });
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const {
        data: user
      } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");
      const {
        error
      } = await supabase.from("whatsapp_templates").insert({
        ...data,
        created_by: user.user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-templates"]
      });
      toast.success("Template criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao criar template: " + error.message);
    }
  });
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: Partial<TemplateFormData>;
    }) => {
      const {
        error
      } = await supabase.from("whatsapp_templates").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-templates"]
      });
      toast.success("Template atualizado com sucesso!");
      setIsDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar template: " + error.message);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        error
      } = await supabase.from("whatsapp_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-templates"]
      });
      toast.success("Template excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir template: " + error.message);
    }
  });
  const resetForm = () => {
    setFormData({
      key: "",
      name: "",
      content: "",
      description: "",
      active: true
    });
    setEditingTemplate(null);
  };
  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setFormData({
      key: template.key,
      name: template.name,
      content: template.content,
      description: template.description || "",
      active: template.active
    });
    setIsDialogOpen(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };
  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteMutation.mutate(id);
    }
  };
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // Filtrar templates
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = searchTerm === "" || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCreator = creatorFilter === "all" || 
      template.created_by === creatorFilter;
    
    return matchesSearch && matchesCreator;
  }) || [];

  // Obter lista única de criadores
  const creators = Array.from(new Set(templates?.map(t => ({ 
    id: t.created_by, 
    name: t.creator_name || 'Desconhecido' 
  })).map(c => JSON.stringify(c)))).map(c => JSON.parse(c));
  return <div className="min-h-screen bg-white">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#00141D]">Templates de WhatsApp</h1>
              <p className="text-base text-[#36404A] mt-1">
                Gerencie os templates de mensagens do WhatsApp
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="bg-[#00141D] hover:bg-[#00141D]/90 text-white font-bold">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Template
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "Editar Template" : "Novo Template"}
                  </DialogTitle>
                  <DialogDescription>
                    Use placeholders: {"{{candidate_first_name}}"}, {"{{recruiter_name}}"}, {"{{vacancy_title}}"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key">Chave *</Label>
                    <Input id="key" value={formData.key} onChange={e => setFormData({
                  ...formData,
                  key: e.target.value
                })} placeholder="convite_entrevista" required disabled={!!editingTemplate} />
                    <p className="text-xs text-muted-foreground">
                      Identificador único (não pode ser alterado depois)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input id="name" value={formData.name} onChange={e => setFormData({
                  ...formData,
                  name: e.target.value
                })} placeholder="Convite para Entrevista" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input id="description" value={formData.description} onChange={e => setFormData({
                  ...formData,
                  description: e.target.value
                })} placeholder="Template para convidar candidatos..." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Conteúdo *</Label>
                    <Textarea id="content" value={formData.content} onChange={e => setFormData({
                  ...formData,
                  content: e.target.value
                })} placeholder="Olá {{candidate_first_name}}!..." rows={8} required />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="active" checked={formData.active} onCheckedChange={checked => setFormData({
                  ...formData,
                  active: checked
                })} />
                    <Label htmlFor="active">Template ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingTemplate ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>

          {/* Filtros e Toggle de Visualização */}
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-4">
              {/* Busca por nome */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtro por criador */}
              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger className="w-[220px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Criador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os criadores</SelectItem>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggle de visualização */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("cards")}
                className={viewMode === "cards" ? "bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D]" : ""}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D]" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando templates...</p>
          </div>
        ) : filteredTemplates.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTemplates.map(template => <Card key={template.id} className="border-[#00141d]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">{template.name}</CardTitle>
                        {!template.active && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      <CardDescription className="text-xs font-mono">
                        {template.key}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(template)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && <p className="text-muted-foreground mb-3 text-base">
                      {template.description}
                    </p>}
                  <div className="bg-muted p-3 rounded-md">
                    <p className="whitespace-pre-wrap text-base font-medium font-sans">{template.content}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Criado por: {template.creator_name}
                    </p>
                  </div>
                </CardContent>
              </Card>)}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="font-bold">Chave</TableHead>
                    <TableHead className="font-bold">Descrição</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Criador</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map(template => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          {template.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {template.key}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {template.description || '-'}
                      </TableCell>
                      <TableCell>
                        {template.active ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3" />
                          {template.creator_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(template)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {templates && templates.length > 0 
                  ? "Nenhum template encontrado com os filtros aplicados"
                  : "Nenhum template cadastrado"}
              </p>
              {(!templates || templates.length === 0) && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>;
};
export default WhatsAppTemplates;