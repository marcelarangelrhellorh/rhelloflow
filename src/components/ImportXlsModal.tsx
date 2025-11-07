import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, Download, Upload, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { z } from 'zod';

interface ImportXlsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: 'vaga' | 'banco_talentos';
  vagaId?: string;
  onSuccess?: () => void;
}

const candidatoSchema = z.object({
  nome_completo: z.string().trim().min(1, "Nome é obrigatório").max(200),
  email: z.string().trim().email("Email inválido").max(255),
  telefone: z.string().trim().max(50).optional(),
  cidade: z.string().trim().max(100).optional(),
  estado: z.string().trim().max(2).optional(),
  linkedin: z.string().trim().max(500).optional(),
  area: z.enum(['Tecnologia', 'Marketing', 'Vendas', 'Financeiro', 'RH', 'Operações', 'Outro']).optional(),
  nivel: z.enum(['Júnior', 'Pleno', 'Sênior', 'Especialista', 'Coordenador', 'Gerente', 'Diretor']).optional(),
  pretensao_salarial: z.number().positive().optional(),
  disponibilidade_status: z.string().trim().max(100).optional(),
  disponibilidade_mudanca: z.string().trim().max(100).optional(),
  curriculo_link: z.string().trim().max(500).optional(),
  portfolio_url: z.string().trim().max(500).optional(),
  historico_experiencia: z.string().trim().max(5000).optional(),
});

interface ImportResult {
  line: number;
  nome: string;
  status: 'success' | 'error';
  message: string;
}

export function ImportXlsModal({ open, onOpenChange, sourceType, vagaId, onSuccess }: ImportXlsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        nome_completo: "João Silva",
        email: "joao.silva@example.com",
        telefone: "(11) 99999-9999",
        cidade: "São Paulo",
        estado: "SP",
        linkedin: "https://linkedin.com/in/joaosilva",
        area: "Tecnologia",
        nivel: "Pleno",
        pretensao_salarial: 8000,
        disponibilidade_status: "Disponível imediato",
        disponibilidade_mudanca: "Sim, para qualquer localidade",
        curriculo_link: "https://drive.google.com/...",
        portfolio_url: "https://portfolio.com/joao",
        historico_experiencia: "5 anos como desenvolvedor..."
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidatos");
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 15 },
      { wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 35 },
      { wch: 35 }, { wch: 50 }
    ];

    XLSX.writeFile(wb, "template_importacao_candidatos.xlsx");
    toast.success("Template baixado com sucesso!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Por favor, selecione um arquivo XLS ou XLSX válido");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 5MB");
      return;
    }

    setFile(selectedFile);
    setResults([]);
    setShowResults(false);
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    const importResults: ImportResult[] = [];

    try {
      // Read file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("Planilha vazia. Adicione candidatos e tente novamente.");
        setProcessing(false);
        return;
      }

      if (jsonData.length > 100) {
        toast.error("Máximo de 100 candidatos por importação");
        setProcessing(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setProcessing(false);
        return;
      }

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const lineNumber = i + 2; // +2 because Excel starts at 1 and has header

        try {
          // Validate data
          const validated = candidatoSchema.parse({
            nome_completo: row.nome_completo,
            email: row.email,
            telefone: row.telefone || null,
            cidade: row.cidade || null,
            estado: row.estado || null,
            linkedin: row.linkedin || null,
            area: row.area || null,
            nivel: row.nivel || null,
            pretensao_salarial: row.pretensao_salarial ? Number(row.pretensao_salarial) : null,
            disponibilidade_status: row.disponibilidade_status || 'disponível',
            disponibilidade_mudanca: row.disponibilidade_mudanca || null,
            curriculo_link: row.curriculo_link || null,
            portfolio_url: row.portfolio_url || null,
            historico_experiencia: row.historico_experiencia || null,
          });

          // Insert into database
          const candidatoData: any = {
            nome_completo: validated.nome_completo,
            email: validated.email,
            telefone: validated.telefone,
            cidade: validated.cidade,
            estado: validated.estado,
            linkedin: validated.linkedin,
            area: validated.area,
            nivel: validated.nivel,
            pretensao_salarial: validated.pretensao_salarial,
            disponibilidade_status: validated.disponibilidade_status,
            disponibilidade_mudanca: validated.disponibilidade_mudanca,
            curriculo_link: validated.curriculo_link,
            portfolio_url: validated.portfolio_url,
            historico_experiencia: validated.historico_experiencia,
            status: sourceType === 'vaga' ? 'Triagem' : 'Banco de Talentos',
            origem: 'importacao_xls',
          };

          if (vagaId) {
            candidatoData.vaga_relacionada_id = vagaId;
          }

          const { error } = await supabase
            .from('candidatos')
            .insert(candidatoData);

          if (error) throw error;

          importResults.push({
            line: lineNumber,
            nome: validated.nome_completo,
            status: 'success',
            message: 'Importado com sucesso'
          });
        } catch (error: any) {
          importResults.push({
            line: lineNumber,
            nome: row.nome_completo || 'Nome não informado',
            status: 'error',
            message: error.message || 'Erro ao importar'
          });
        }

        setProgress(Math.round(((i + 1) / jsonData.length) * 100));
      }

      setResults(importResults);
      setShowResults(true);

      const successCount = importResults.filter(r => r.status === 'success').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;

      if (successCount > 0) {
        toast.success(`${successCount} candidato(s) importado(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erro(s) na importação. Veja o relatório.`);
      }

      if (successCount > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast.error("Erro ao processar arquivo: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setFile(null);
      setResults([]);
      setShowResults(false);
      setProgress(0);
      onOpenChange(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Candidatos em Massa (XLS)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Baixe o template com os campos e formato corretos</span>
                <Button onClick={downloadTemplate} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Template
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          {!showResults && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={processing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              {file && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Arquivo selecionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}

              {processing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Processando... {progress}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {showResults && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Alert className="border-green-500">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>{successCount}</strong> sucesso(s)
                  </AlertDescription>
                </Alert>
                <Alert className="border-red-500">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong>{errorCount}</strong> erro(s)
                  </AlertDescription>
                </Alert>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Linha</th>
                      <th className="px-3 py-2 text-left">Candidato</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{result.line}</td>
                        <td className="px-3 py-2">{result.nome}</td>
                        <td className="px-3 py-2">
                          {result.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{result.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} variant="outline" disabled={processing}>
              {showResults ? 'Fechar' : 'Cancelar'}
            </Button>
            {!showResults && (
              <Button onClick={processFile} disabled={!file || processing}>
                <Upload className="mr-2 h-4 w-4" />
                {processing ? 'Processando...' : 'Importar Candidatos'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
