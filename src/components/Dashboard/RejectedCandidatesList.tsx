import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Send, Phone, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
interface RejectedCandidatesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: RejectedCandidate[];
  onRefresh: () => void;
}
export function RejectedCandidatesList({
  open,
  onOpenChange,
  candidates,
  onRefresh
}: RejectedCandidatesListProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };
  const formatPhone = (phone: string) => {
    if (!phone) return 'Sem telefone';
    return phone;
  };
  const isValidPhone = (phone: string) => {
    // Validação básica de número E.164
    return phone && phone.startsWith('+') && phone.length >= 10;
  };
  const selectedCandidates = candidates.filter(c => selectedIds.has(c.id));
  const handleBulkSendSuccess = () => {
    setSelectedIds(new Set());
    onRefresh();
  };
  return <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Candidatos Reprovados sem WhatsApp</SheetTitle>
            <SheetDescription className="text-base font-bold">
              Lista de candidatos que foram reprovados e ainda não receberam mensagem de reprovação via WhatsApp.
              {selectedIds.size > 0 && <span className="ml-2 text-primary font-semibold">
                  ({selectedIds.size} selecionados)
                </span>}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="flex gap-2 flex-wrap">
              {selectedIds.size > 0 ? <>
                  <Button onClick={() => setShowBulkModal(true)} className="bg-primary">
                    <Send className="mr-2 h-4 w-4" />
                    Enviar WhatsApp para {selectedIds.size} selecionados
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                    Limpar seleção
                  </Button>
                </> : <Button onClick={() => {
              handleSelectAll(true);
              setShowBulkModal(true);
            }} disabled={candidates.length === 0} className="bg-primary font-semibold">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar WhatsApp para todos ({candidates.length})
                </Button>}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={selectedIds.size === candidates.length && candidates.length > 0} onCheckedChange={handleSelectAll} />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.length === 0 ? <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum candidato encontrado
                      </TableCell>
                    </TableRow> : candidates.map(candidate => <TableRow key={candidate.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(candidate.id)} onCheckedChange={checked => handleSelectOne(candidate.id, checked as boolean)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{candidate.nome_completo}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        navigate(`/candidatos/${candidate.id}`);
                        onOpenChange(false);
                      }}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] inline-block font-semibold">
                            {candidate.vacancy_title}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-sm whitespace-nowrap ${candidate.status === 'Reprovado rhello' ? 'border-destructive/30 text-destructive' : 'border-orange-500/30 text-orange-500'}`}>
                            {candidate.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold">
                            {candidate.dias_desde_status}d
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!isValidPhone(candidate.telefone) && <AlertCircle className="h-4 w-4 text-warning" />}
                            <span className="text-sm font-mono font-semibold">
                              {formatPhone(candidate.telefone)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" disabled={!isValidPhone(candidate.telefone)} onClick={() => {
                      setSelectedIds(new Set([candidate.id]));
                      setShowBulkModal(true);
                    }}>
                            <Phone className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>)}
                </TableBody>
              </Table>
            </div>

            {candidates.length > 0 && <div className="text-base font-bold text-muted-foreground">
                Total: {candidates.length} candidatos sem WhatsApp de reprovação
              </div>}
          </div>
        </SheetContent>
      </Sheet>

      <BulkWhatsAppModal open={showBulkModal} onOpenChange={setShowBulkModal} candidates={selectedCandidates} onSuccess={handleBulkSendSuccess} />
    </>;
}