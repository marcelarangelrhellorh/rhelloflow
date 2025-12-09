import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LinkedUser {
  id: string;
  full_name: string;
  created_at: string;
  avatar_url: string | null;
}

interface EmpresaLinkedUsersCardProps {
  users: LinkedUser[] | undefined;
}

export function EmpresaLinkedUsersCard({ users }: EmpresaLinkedUsersCardProps) {
  if (!users || users.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Usuários Vinculados ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <Avatar className="h-8 w-8">
                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Desde{" "}
                  {format(new Date(user.created_at), "MMM yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
