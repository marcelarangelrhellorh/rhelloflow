import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileUp } from "lucide-react";
import { ImportPdfModal } from "@/components/ImportPdfModal";

export default function CandidatoFormImport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vagaId = searchParams.get("vaga");
  const [importModalOpen, setImportModalOpen] = useState(true);

  const handleSuccess = (candidatoId: string) => {
    navigate(`/candidatos/${candidatoId}`);
  };

  const handleClose = () => {
    if (vagaId) {
      navigate(`/vagas/${vagaId}`);
    } else {
      navigate("/banco-talentos");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light to-background-accent-light dark:from-background-dark dark:to-background-accent-dark p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary-text-light dark:text-primary-text-dark">
              Importar Candidato do PDF
            </h1>
            <p className="text-secondary-text-light dark:text-secondary-text-dark">
              Extraia automaticamente informações de CVs e perfis do LinkedIn
            </p>
          </div>
        </div>

        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <FileUp className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">Upload de PDF</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Faça upload de um CV ou perfil do LinkedIn em formato PDF.
              O sistema irá extrair automaticamente as informações do candidato.
            </p>
            <Button onClick={() => setImportModalOpen(true)} size="lg">
              <FileUp className="mr-2 h-5 w-5" />
              Selecionar PDF
            </Button>
          </div>
        </Card>

        <ImportPdfModal
          open={importModalOpen}
          onOpenChange={(open) => {
            setImportModalOpen(open);
            if (!open) handleClose();
          }}
          sourceType={vagaId ? 'vaga' : 'banco_talentos'}
          vagaId={vagaId || undefined}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}