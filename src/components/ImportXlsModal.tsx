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
  Nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  Sobrenome: z.string().trim().max(100).optional(),
  'E-mail': z.string().trim().email("Email inválido").max(255),
  Telefone: z.string().trim().max(50).optional(),
  Celular: z.string().trim().max(50).optional(),
  Estado: z.string().trim().max(2).optional(),
  Cidade: z.string().trim().max(100).optional(),
  CEP: z.string().trim().max(20).optional(),
  Endereço: z.string().trim().max(200).optional(),
  Complemento: z.string().trim().max(100).optional(),
  Número: z.string().trim().max(20).optional(),
  Bairro: z.string().trim().max(100).optional(),
  'Data de Nascimento': z.string().trim().optional(),
  Idade: z.union([z.string(), z.number()]).optional(),
  Sexo: z.string().trim().max(50).optional(),
  'Estado Civil': z.string().trim().max(50).optional(),
  Nacionalidade: z.string().trim().max(100).optional(),
  'Salário mínimo': z.union([z.string(), z.number()]).optional(),
  'Salário máximo': z.union([z.string(), z.number()]).optional(),
  'TAG\'s do CV do candidato': z.string().trim().optional(),
  'Experiência profissional': z.string().trim().max(5000).optional(),
  Treinamento: z.string().trim().max(2000).optional(),
  Idiomas: z.string().trim().max(500).optional(),
  'Origem da candidatura': z.string().trim().max(200).optional(),
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
        'Nome': 'João',
        'Sobrenome': 'Silva',
        'E-mail': 'joao.silva@example.com',
        'Telefone': '(11) 3333-4444',
        'Celular': '(11) 99999-9999',
        'Estado': 'SP',
        'Cidade': 'São Paulo',
        'CEP': '01310-100',
        'Endereço': 'Av. Paulista',
        'Complemento': 'Apto 123',
        'Número': '1000',
        'Bairro': 'Bela Vista',
        'Data de Nascimento': '15/05/1990',
        'Idade': 34,
        'Sexo': 'Masculino',
        'Estado Civil': 'Solteiro',
        'Nacionalidade': 'Brasileira',
        'Salário mínimo': 8000,
        'Salário máximo': 12000,
        'TAG\'s do CV do candidato': 'Liderança, Vendas, Gestão',
        'Experiência profissional': '10 anos como gerente comercial...',
        'Treinamento': 'MBA em Gestão Comercial',
        'Idiomas': 'Inglês (fluente), Espanhol (intermediário)',
        'Origem da candidatura': 'LinkedIn'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidatos");
    
    // Set column widths
    const widths = [
      15, 15, 30, 18, 18, 8, 20, 15, 30, 20, 
      10, 20, 15, 8, 15, 15, 20, 15, 15, 30,
      50, 30, 30, 20
    ];
    ws['!cols'] = widths.map(wch => ({ wch }));

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
      
      // Try to find header row (skip metadata rows like "Nome da vaga:", etc.)
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      let headerRowIndex = -1;
      
      // Look for the row that contains "Nome" and "E-mail" columns
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (Array.isArray(row) && row.includes('Nome') && row.includes('E-mail')) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        toast.error("Não foi possível encontrar o cabeçalho da planilha. Certifique-se de que há uma linha com 'Nome' e 'E-mail'.");
        setProcessing(false);
        return;
      }
      
      // Parse data starting from header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        range: headerRowIndex,
        defval: null 
      });

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
        const lineNumber = headerRowIndex + i + 2; // +2 for Excel 1-based and header

        try {
          // Skip empty rows
          if (!row['Nome'] || !row['E-mail']) {
            continue;
          }

          // Validate data
          const validated = candidatoSchema.parse(row);

          // Map to database fields
          const nomeCompleto = validated.Sobrenome 
            ? `${validated.Nome} ${validated.Sobrenome}`.trim()
            : validated.Nome;

          const telefone = validated.Celular || validated.Telefone || null;
          
          // Parse salary (handle both string and number)
          let pretensaoSalarial: number | null = null;
          const salarioMax = validated['Salário máximo'];
          if (salarioMax) {
            const salarioNum = typeof salarioMax === 'string' 
              ? parseFloat(salarioMax.replace(/[^\d,.-]/g, '').replace(',', '.'))
              : salarioMax;
            if (!isNaN(salarioNum)) {
              pretensaoSalarial = salarioNum;
            }
          }

          // Build address if available
          const enderecoCompleto = [
            validated.Endereço,
            validated.Número,
            validated.Complemento,
            validated.Bairro,
            validated.CEP
          ].filter(Boolean).join(', ') || null;

          // Combine professional info
          const historicoExperiencia = [
            validated['Experiência profissional'],
            validated.Treinamento ? `Treinamento: ${validated.Treinamento}` : null,
            validated.Idiomas ? `Idiomas: ${validated.Idiomas}` : null
          ].filter(Boolean).join('\n\n') || null;

          // Insert into database
          const candidatoData: any = {
            nome_completo: nomeCompleto,
            email: validated['E-mail'],
            telefone: telefone,
            cidade: validated.Cidade || null,
            estado: validated.Estado || null,
            pretensao_salarial: pretensaoSalarial,
            historico_experiencia: historicoExperiencia,
            disponibilidade_status: 'disponível',
            status: sourceType === 'vaga' ? 'Triagem' : 'Banco de Talentos',
            origem: validated['Origem da candidatura'] || 'importacao_xls',
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
            nome: nomeCompleto,
            status: 'success',
            message: 'Importado com sucesso'
          });
        } catch (error: any) {
          const nomeTentativa = row['Nome'] 
            ? (row['Sobrenome'] ? `${row['Nome']} ${row['Sobrenome']}` : row['Nome'])
            : 'Nome não informado';
          
          importResults.push({
            line: lineNumber,
            nome: nomeTentativa,
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
