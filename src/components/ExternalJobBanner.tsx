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
  prioridade,
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

  return (
    <Alert variant="default" className="bg-warning/10 border-warning">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">
        Vaga criada via formulário externo
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          Esta vaga foi criada externamente e precisa ter os seguintes campos 
          preenchidos antes de iniciar o processo de recrutamento:
        </p>
        <ul className="text-sm list-disc list-inside space-y-1">
          {missingFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate(`/vagas/${vagaId}/editar`)}
        >
          Preencher Agora
        </Button>
      </AlertDescription>
    </Alert>
  );
}
