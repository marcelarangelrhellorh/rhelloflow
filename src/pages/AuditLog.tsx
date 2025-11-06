import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Download, CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditEvent {
  id: string;
  timestamp_utc: string;
  actor: {
    id: string;
    type: string;
    display_name: string;
    auth_method?: string;
  };
  action: string;
  resource: {
    type: string;
    id?: string;
    path?: string;
  };
  payload?: any;
  client?: {
    ip?: string;
    user_agent?: string;
  };
  correlation_id: string;
}

export default function AuditLog() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [verifying, setVerifying] = useState(false);

  // Verifica se é admin antes de carregar a página
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("❌ Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadAuditEvents();
    }
  }, [isAdmin]);

  // Não renderiza nada se não for admin
  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const loadAuditEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("audit_events")
        .select("*")
        .order("timestamp_utc", { ascending: false })
        .limit(500);

      if (dateFrom) {
        query = query.gte("timestamp_utc", dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte("timestamp_utc", dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data as any) || []);
    } catch (error) {
      console.error("Error loading audit events:", error);
      toast.error("Falha ao carregar eventos de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const verifyIntegrity = async () => {
    try {
      setVerifying(true);
      const fromDate = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const toDate = dateTo || new Date();

      const { data, error } = await supabase.rpc("verify_audit_chain", {
        p_from_timestamp: fromDate.toISOString(),
        p_to_timestamp: toDate.toISOString(),
      });

      if (error) throw error;

      const result = data[0];
      if (result.is_valid) {
        toast.success(`Integridade verificada: ${result.total_events} eventos verificados com sucesso`);
      } else {
        toast.error(
          `Falha na verificação de integridade: ${result.invalid_count} eventos inválidos encontrados`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error("Error verifying integrity:", error);
      toast.error("Falha ao verificar integridade da cadeia de auditoria");
    } finally {
      setVerifying(false);
    }
  };

  const exportAuditLog = () => {
    const csv = [
      ["Data/Hora", "Ator", "Ação", "Tipo de Recurso", "ID do Recurso", "Detalhes"],
      ...filteredEvents.map(e => [
        format(new Date(e.timestamp_utc), "yyyy-MM-dd HH:mm:ss"),
        e.actor.display_name,
        e.action,
        e.resource.type,
        e.resource.id || "-",
        JSON.stringify(e.payload || {}),
      ]),
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Log de auditoria exportado");
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch =
      searchTerm === "" ||
      event.actor.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.resource.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || event.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("FAILURE") || action.includes("DELETE") || action.includes("ERASURE")) {
      return "destructive";
    }
    if (action.includes("SUCCESS") || action.includes("CREATE")) {
      return "default";
    }
    if (action.includes("UPDATE") || action.includes("ASSIGN")) {
      return "secondary";
    }
    return "outline";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Log de Auditoria</h1>
            <p className="text-muted-foreground">
              Trilha de auditoria de segurança imutável para todas as ações críticas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={verifyIntegrity}
            variant="outline"
            disabled={verifying}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {verifying ? "Verificando..." : "Verificar Integridade"}
          </Button>
          <Button onClick={exportAuditLog} disabled={filteredEvents.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar Eventos</CardTitle>
          <CardDescription>Pesquisar e filtrar eventos de auditoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar ator, ação, recurso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="LOGIN_SUCCESS">Login com Sucesso</SelectItem>
                <SelectItem value="LOGIN_FAILURE">Falha no Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="ROLE_ASSIGN">Atribuir Função</SelectItem>
                <SelectItem value="CANDIDATE_VIEW">Visualizar Candidato</SelectItem>
                <SelectItem value="CANDIDATE_EXPORT">Exportar Candidato</SelectItem>
                <SelectItem value="JOB_CREATE">Criar Vaga</SelectItem>
                <SelectItem value="JOB_UPDATE">Atualizar Vaga</SelectItem>
                <SelectItem value="JOB_DELETE">Excluir Vaga</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PP") : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PP") : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={loadAuditEvents} variant="secondary">
              Aplicar Filtros
            </Button>
            {(dateFrom || dateTo || searchTerm || actionFilter !== "all") && (
              <Button
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  setSearchTerm("");
                  setActionFilter("all");
                  loadAuditEvents();
                }}
                variant="ghost"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Eventos de Auditoria ({filteredEvents.length} de {events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum evento de auditoria encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionBadgeVariant(event.action)}>
                          {event.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(event.timestamp_utc), "PPpp")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{event.actor.display_name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          {event.resource.type}
                          {event.resource.id && ` (${event.resource.id.slice(0, 8)}...)`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {event.payload && Object.keys(event.payload).length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  )}
                  {event.client?.user_agent && (
                    <div className="text-xs text-muted-foreground">
                      {event.client.user_agent.slice(0, 80)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
