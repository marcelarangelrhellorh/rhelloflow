import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RejectedCandidatesList } from "./RejectedCandidatesList";
import { BulkWhatsAppModal } from "./BulkWhatsAppModal";
import { logger } from "@/lib/logger";
interface RejectedCandidate {
  id: string;
  nome_completo: string;
  telefone: string;
  email: string;
  status: string;
  status_updated_at: string;
  vacancy_id: string;
  vacancy_title: string;
  dias_desde_status: number;
}
export function RejectedCandidatesCard() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [candidates, setCandidates] = useState<RejectedCandidate[]>([]);
  useEffect(() => {
    loadData();
  }, []);

  // Usar view otimizada - elimina N+1 queries (de 3 queries sequenciais para 1)
  const loadData = async () => {
    try {
      setLoading(true);

      // Query única usando view otimizada
      const {
        data,
        error
      } = await supabase.from('vw_candidatos_reprovados_sem_whatsapp').select('*').limit(100);
      if (error) throw error;
      const result: RejectedCandidate[] = (data || []).map(c => ({
        id: c.id,
        nome_completo: c.nome_completo || '',
        telefone: c.telefone || '',
        email: c.email || '',
        status: c.status || '',
        status_updated_at: c.criado_em || '',
        vacancy_id: c.vaga_relacionada_id || '',
        vacancy_title: c.vaga_titulo || 'Sem vaga',
        dias_desde_status: c.dias_desde_status || 0
      }));
      setCandidates(result);
      setCount(result.length);
    } catch (error) {
      logger.error("Erro ao carregar candidatos reprovados:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = () => {
    loadData();
  };
  const isClickable = count > 0 && !loading;
  return <>
      <Card className={`
          overflow-hidden border-l-4 border-l-destructive
          ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'cursor-default'}
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        `} onClick={isClickable ? () => setShowList(true) : undefined} tabIndex={isClickable ? 0 : -1} role={isClickable ? "button" : undefined} aria-label={`Candidatos reprovados sem WhatsApp (${count} candidatos)`} title="Candidatos que foram reprovados e ainda não receberam a mensagem de reprovação via WhatsApp">
        <CardContent className="p-6 bg-white">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground font-semibold text-base">
                  Candidatos reprovados sem feedback
                </p>
              </div>
              <p className="text-[42px] font-semibold leading-none text-card-foreground">
                {loading ? '...' : count}
              </p>
              <p className="text-muted-foreground font-medium text-base">
                Candidatos em "Reprovado" sem receber negativa/retorno
              </p>
            </div>
            <div className={`
                rounded-full p-4 bg-destructive/10 text-destructive
                ${count > 0 ? 'animate-pulse-glow' : ''}
                transition-transform duration-150
              `}>
              <UserX className="h-7 w-7" aria-hidden="true" />
            </div>
          </div>
        </CardContent>
      </Card>

      <RejectedCandidatesList open={showList} onOpenChange={setShowList} candidates={candidates} onRefresh={handleRefresh} />

      <BulkWhatsAppModal open={showBulkModal} onOpenChange={setShowBulkModal} candidates={candidates} onSuccess={handleRefresh} />
    </>;
}