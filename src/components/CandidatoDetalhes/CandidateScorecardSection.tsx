import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FileText } from "lucide-react";
import { ScorecardEvaluation } from "./ScorecardEvaluation";
import { TechnicalTestSection } from "./TechnicalTestSection";

interface CandidateScorecardSectionProps {
  candidateId: string;
  candidateName: string;
  vagaId?: string | null;
}

export function CandidateScorecardSection({
  candidateId,
  candidateName,
  vagaId
}: CandidateScorecardSectionProps) {
  return (
    <Tabs defaultValue="entrevista" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="entrevista" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Avaliação de Entrevista
        </TabsTrigger>
        <TabsTrigger value="teste_tecnico" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Teste Técnico
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="entrevista">
        <ScorecardEvaluation 
          candidateId={candidateId} 
          candidateName={candidateName} 
          vagaId={vagaId}
          templateType="entrevista"
        />
      </TabsContent>
      
      <TabsContent value="teste_tecnico">
        <TechnicalTestSection 
          candidateId={candidateId}
          candidateName={candidateName}
          vagaId={vagaId}
        />
      </TabsContent>
    </Tabs>
  );
}
