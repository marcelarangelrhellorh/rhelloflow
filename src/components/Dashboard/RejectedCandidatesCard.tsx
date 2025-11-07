import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserX, ExternalLink, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RejectedCandidatesList } from "./RejectedCandidatesList";
import { BulkWhatsAppModal } from "./BulkWhatsAppModal";
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
    loadCount();
    loadCandidates();
  }, []);
  const loadCount = async () => {
    try {
      setLoading(true);

      // Query para contar candidatos reprovados sem envio de WhatsApp
      const {
        data: candidatosReprovados,
        error: candError
      } = await supabase.from('candidatos').select('id').or('status.eq.Reprovado rhello,status.eq.Reprovado Solicitante').is('deleted_at', null);
      if (candError) throw candError;
      const candidateIds = candidatosReprovados?.map(c => c.id) || [];
      if (candidateIds.length === 0) {
        setCount(0);
        return;
      }

      // Query para buscar whatsapp_sends com template_key = 'reprovacao'
      const {
        data: sends,
        error: sendsError
      } = await supabase.from('whatsapp_sends').select('candidate_id').in('candidate_id', candidateIds).eq('template_key', 'reprovacao');
      if (sendsError) throw sendsError;
      const candidatesWithWhatsApp = new Set(sends?.map(s => s.candidate_id) || []);
      const countWithoutWhatsApp = candidateIds.filter(id => !candidatesWithWhatsApp.has(id)).length;
      setCount(countWithoutWhatsApp);
    } catch (error) {
      console.error("Erro ao carregar contador:", error);
    } finally {
      setLoading(false);
    }
  };
  const loadCandidates = async () => {
    try {
      // Buscar candidatos reprovados
      const {
        data: candidatos,
        error: candError
      } = await supabase.from('candidatos').select(`
          id,
          nome_completo,
          telefone,
          email,
          status,
          criado_em,
          vaga_relacionada_id
        `).or('status.eq.Reprovado rhello,status.eq.Reprovado Solicitante').is('deleted_at', null).order('criado_em', {
        ascending: false
      }).limit(100);
      if (candError) throw candError;
      const candidateIds = candidatos?.map(c => c.id) || [];

      // Buscar envios de WhatsApp
      const {
        data: sends
      } = await supabase.from('whatsapp_sends').select('candidate_id').in('candidate_id', candidateIds).eq('template_key', 'reprovacao');
      const candidatesWithWhatsApp = new Set(sends?.map(s => s.candidate_id) || []);

      // Filtrar candidatos sem WhatsApp
      const candidatesSemWhatsApp = candidatos?.filter(c => !candidatesWithWhatsApp.has(c.id)) || [];

      // Buscar informações das vagas
      const vagaIds = [...new Set(candidatesSemWhatsApp.map(c => c.vaga_relacionada_id).filter(Boolean))];
      const {
        data: vagas
      } = await supabase.from('vagas').select('id, titulo').in('id', vagaIds);
      const vagasMap = new Map(vagas?.map(v => [v.id, v.titulo]) || []);

      // Montar lista final
      const result: RejectedCandidate[] = candidatesSemWhatsApp.map(c => {
        const statusDate = new Date(c.criado_em);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - statusDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: c.id,
          nome_completo: c.nome_completo,
          telefone: c.telefone || '',
          email: c.email,
          status: c.status,
          status_updated_at: c.criado_em,
          vacancy_id: c.vaga_relacionada_id || '',
          vacancy_title: c.vaga_relacionada_id ? vagasMap.get(c.vaga_relacionada_id) || 'Vaga não encontrada' : 'Sem vaga',
          dias_desde_status: diffDays
        };
      });
      setCandidates(result);
    } catch (error) {
      console.error("Erro ao carregar candidatos:", error);
    }
  };
  const handleRefresh = () => {
    loadCount();
    loadCandidates();
  };
  const isClickable = count > 0 && !loading;
  return <>
      <Card className={`
          overflow-hidden border-l-4 border-l-destructive
          ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'cursor-default'}
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        `} onClick={isClickable ? () => setShowList(true) : undefined} tabIndex={isClickable ? 0 : -1} role={isClickable ? "button" : undefined} aria-label={`Candidatos reprovados sem WhatsApp (${count} candidatos)`} title="Candidatos que foram reprovados e ainda não receberam a mensagem de reprovação via WhatsApp">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Candidatos reprovados sem feedback </p>
                {count > 0 && <Badge variant="destructive" className="text-xs">
                    {count}
                  </Badge>}
              </div>
              <p className="text-[42px] font-semibold leading-none text-card-foreground">
                {loading ? '...' : count}
              </p>
              <p className="text-[13px] text-muted-foreground">Candidatos em &quot;Reprovado rhello&quot; ou &quot;Reprovado Solicitante&quot; sem receber negativa/retorno</p>
              
              {count > 0 && <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Clique no card para ver a lista e enviar WhatsApp
                  </p>
                </div>}
            </div>
            <div className={`
                rounded-full p-4 bg-destructive/10 text-destructive
                ${count > 0 ? 'animate-pulse-glow' : ''}
                transition-transform duration-150
              `}>
              <UserX className="h-7 w-7" />
            </div>
          </div>
        </CardContent>
      </Card>

      <RejectedCandidatesList open={showList} onOpenChange={setShowList} candidates={candidates} onRefresh={handleRefresh} />

      <BulkWhatsAppModal open={showBulkModal} onOpenChange={setShowBulkModal} candidates={candidates} onSuccess={handleRefresh} />
    </>;
}