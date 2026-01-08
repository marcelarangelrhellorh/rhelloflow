import { useState, useEffect } from "react";
import { User, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface CSUser {
  id: string;
  full_name: string;
}

interface EmpresaCSSelectorProps {
  empresaId: string;
  currentCSId: string | null;
  onUpdate?: () => void;
}

export function EmpresaCSSelector({
  empresaId,
  currentCSId,
  onUpdate,
}: EmpresaCSSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [csUsers, setCsUsers] = useState<CSUser[]>([]);
  const [selectedCSId, setSelectedCSId] = useState<string | null>(currentCSId);
  const [currentCS, setCurrentCS] = useState<CSUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch CS users on mount
  useEffect(() => {
    const fetchCSUsers = async () => {
      try {
        // Get users with CS role
        const { data: csRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "cs");

        if (rolesError) throw rolesError;

        if (csRoles && csRoles.length > 0) {
          const userIds = csRoles.map((r) => r.user_id);
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          if (profilesError) throw profilesError;
          setCsUsers(profiles || []);
        }
      } catch (error) {
        console.error("Error fetching CS users:", error);
      }
    };

    fetchCSUsers();
  }, []);

  // Fetch current CS info
  useEffect(() => {
    const fetchCurrentCS = async () => {
      setIsLoading(true);
      try {
        if (currentCSId) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", currentCSId)
            .single();

          if (error && error.code !== "PGRST116") throw error;
          setCurrentCS(data);
        } else {
          setCurrentCS(null);
        }
      } catch (error) {
        console.error("Error fetching current CS:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentCS();
    setSelectedCSId(currentCSId);
  }, [currentCSId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("empresas")
        .update({ cs_responsavel_id: selectedCSId || null })
        .eq("id", empresaId);

      if (error) throw error;

      // Update local state
      if (selectedCSId) {
        const newCS = csUsers.find((u) => u.id === selectedCSId);
        setCurrentCS(newCS || null);
      } else {
        setCurrentCS(null);
      }

      toast({
        title: "Sucesso",
        description: "CS responsável atualizado com sucesso.",
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating CS:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o CS responsável.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedCSId(currentCSId);
    setIsEditing(false);
  };

  return (
    <Card className="border border-gray-300 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">CS Responsável</CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 px-2"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <Select
              value={selectedCSId || "none"}
              onValueChange={(value) =>
                setSelectedCSId(value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um CS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum CS atribuído</SelectItem>
                {csUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#00141d]"
              >
                <Check className="h-4 w-4 mr-1" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : currentCS ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{currentCS.full_name}</p>
              <p className="text-sm text-muted-foreground">Customer Success</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Nenhum CS atribuído</p>
              <p className="text-sm">Clique no ícone para atribuir</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
