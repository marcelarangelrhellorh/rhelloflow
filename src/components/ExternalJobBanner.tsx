import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
interface ExternalJobBannerProps {
  vagaId: string;
  recrutador?: string | null;
  csResponsavel?: string | null;
  complexidade?: string | null;
  prioridade?: string | null;
}
export function ExternalJobBanner({
  vagaId,
  recrutador,
  csResponsavel,
  complexidade,
  prioridade
}: ExternalJobBannerProps) {
  const navigate = useNavigate();

  // Check if all recruitment fields are filled
  const isComplete = recrutador && csResponsavel && complexidade && prioridade;
  if (isComplete) return null;
  const missingFields = [];
  if (!recrutador) missingFields.push("Recrutador");
  if (!csResponsavel) missingFields.push("CS Responsável");
  if (!complexidade) missingFields.push("Complexidade");
  if (!prioridade) missingFields.push("Prioridade");
  return <Alert variant="default" className="bg-[#ffcd00]/10 border-[#ffcd00] mb-6">
      <AlertCircle className="h-5 w-5 text-[#ffcd00]" />
      <AlertTitle className="text-[#00141d] font-bold text-base">
        Vaga criada via formulário externo
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm text-[#36404a] font-medium">
          Esta vaga foi criada externamente e precisa ter os seguintes campos 
          preenchidos antes de iniciar o processo de recrutamento:
        </p>
        <ul className="text-sm text-[#36404a] list-disc list-inside space-y-1">
          {missingFields.map(field => <li key={field} className="font-semibold">{field}</li>)}
        </ul>
        <Button className="font-bold h-9 px-4 rounded-md" onClick={() => navigate(`/vagas/${vagaId}/editar`)}>
          Preencher Agora
        </Button>
      </AlertDescription>
    </Alert>;
}