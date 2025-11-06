import { useState, useEffect } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tag {
  id: string;
  label: string;
  category: string;
  slug: string;
}

interface TagPickerProps {
  selectedTags: string[]; // array de tag IDs
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

const categoryLabels = {
  area: { label: "Área", color: "bg-blue-100 text-blue-800 border-blue-300" },
  role: { label: "Função", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  skill: { label: "Skill", color: "bg-gray-100 text-gray-800 border-gray-300" },
  seniority: { label: "Senioridade", color: "bg-purple-100 text-purple-800 border-purple-300" },
  location: { label: "Localização", color: "bg-green-100 text-green-800 border-green-300" },
};

export function TagPicker({ selectedTags, onChange, disabled }: TagPickerProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagCategory, setNewTagCategory] = useState<string>("skill");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("tags")
        .select("*")
        .eq("active", true)
        .order("category")
        .order("label");

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar tags:", error);
      toast.error("Erro ao carregar tags");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (disabled) return;
    
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagLabel.trim()) {
      toast.error("Digite o nome da tag");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await (supabase as any)
        .from("tags")
        .insert({
          label: newTagLabel.trim(),
          category: newTagCategory,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("Já existe uma tag com este nome nesta categoria");
        } else {
          throw error;
        }
        return;
      }

      setAvailableTags([...availableTags, data]);
      onChange([...selectedTags, data.id]);
      toast.success("Tag criada com sucesso!");
      
      setShowCreateModal(false);
      setNewTagLabel("");
      setNewTagCategory("skill");
    } catch (error: any) {
      console.error("Erro ao criar tag:", error);
      toast.error("Erro ao criar tag");
    } finally {
      setCreating(false);
    }
  };

  const filteredTags = availableTags.filter((tag) => {
    const matchesSearch = tag.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || tag.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const selectedTagObjects = availableTags.filter((tag) =>
    selectedTags.includes(tag.id)
  );

  const groupedTags = filteredTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label>Tags</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova Tag
        </Button>
      </div>

      {/* Tags selecionadas */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
          {selectedTagObjects.map((tag) => {
            const categoryInfo = categoryLabels[tag.category as keyof typeof categoryLabels];
            return (
              <Badge
                key={tag.id}
                variant="outline"
                className={`${categoryInfo.color} cursor-pointer hover:opacity-80`}
                onClick={() => !disabled && handleToggleTag(tag.id)}
              >
                <span className="text-xs font-medium mr-1">{categoryInfo.label}:</span>
                {tag.label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          placeholder="Buscar tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="area">Área</SelectItem>
            <SelectItem value="role">Função</SelectItem>
            <SelectItem value="skill">Skill</SelectItem>
            <SelectItem value="seniority">Senioridade</SelectItem>
            <SelectItem value="location">Localização</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de tags disponíveis agrupadas por categoria */}
      <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
        {Object.entries(groupedTags).map(([category, tags]) => {
          const categoryInfo = categoryLabels[category as keyof typeof categoryLabels];
          return (
            <div key={category}>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                {categoryInfo.label}
              </h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <Badge
                      key={tag.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : `${categoryInfo.color} hover:opacity-80`
                      }`}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      {tag.label}
                      {isSelected && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredTags.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma tag encontrada
          </p>
        )}
      </div>

      {/* Modal para criar nova tag */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Tag</DialogTitle>
            <DialogDescription>
              Adicione uma nova tag ao sistema. Ela ficará disponível para todas as vagas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-label">Nome da Tag</Label>
              <Input
                id="tag-label"
                placeholder="Ex: React, Coordenador, Marketing"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag-category">Categoria</Label>
              <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                <SelectTrigger id="tag-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="role">Função</SelectItem>
                  <SelectItem value="skill">Skill</SelectItem>
                  <SelectItem value="seniority">Senioridade</SelectItem>
                  <SelectItem value="location">Localização</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTag} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Tag"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
