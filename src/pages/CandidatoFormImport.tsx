import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { ImportXlsModal } from "@/components/ImportXlsModal";

export default function CandidatoFormImport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vagaId = searchParams.get("vaga");
  const [importModalOpen, setImportModalOpen] = useState(true);

  const handleSuccess = () => {
    if (vagaId) {
      navigate(`/vagas/${vagaId}`);
    } else {
      navigate("/banco-talentos");
    }
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
              Importar Candidatos em Massa
            </h1>
            <p className="text-secondary-text-light dark:text-secondary-text-dark">
              Importe vários candidatos de uma vez usando planilha XLS/XLSX
            </p>
          </div>
        </div>

        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <FileSpreadsheet className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">Importação em Massa</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Baixe o template, preencha com os dados dos candidatos e importe a planilha.
              Você pode importar até 100 candidatos por vez.
            </p>
            <Button onClick={() => setImportModalOpen(true)} size="lg">
              <FileSpreadsheet className="mr-2 h-5 w-5" />
              Importar Planilha
            </Button>
          </div>
        </Card>

        <ImportXlsModal
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