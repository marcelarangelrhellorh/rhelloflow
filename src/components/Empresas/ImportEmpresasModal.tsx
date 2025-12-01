import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSpreadsheet, Download, Upload, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { z } from 'zod';

interface ImportEmpresasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Função para normalizar valores vazios
const normalizeEmptyValue = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-' || trimmed.toUpperCase() === 'N/A' || 
        trimmed.toUpperCase() === 'NULL' || trimmed === '–' || trimmed === '—') {
      return null;
    }
    return trimmed;
  }
  return String(value);
};

// Função para validar CNPJ
const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/[^\d]/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  let tamanho = cleaned.length - 2;
  let numeros = cleaned.substring(0, tamanho);
  const digitos = cleaned.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cleaned.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
};

const empresaSchema = z.object({
  Nome: z.preprocess(normalizeEmptyValue, z.string().min(1, "Nome é obrigatório").max(200)),
  CNPJ: z.preprocess(
    normalizeEmptyValue,
    z.string()
      .min(1, "CNPJ é obrigatório")
      .refine(val => isValidCNPJ(val || ''), { message: "CNPJ inválido" })
  ),
  Setor: z.preprocess(normalizeEmptyValue, z.string().max(100).nullable().default(null)),
  Porte: z.preprocess(normalizeEmptyValue, z.string().max(50).nullable().default(null)),
  Status: z.preprocess(normalizeEmptyValue, z.enum(['ativo', 'inativo', 'prospect']).nullable().default('ativo')),
  Telefone: z.preprocess(normalizeEmptyValue, z.string().max(50).nullable().default(null)),
  Email: z.preprocess(normalizeEmptyValue, z.string().email("Email inválido").max(255).nullable().default(null)),
  Site: z.preprocess(normalizeEmptyValue, z.string().max(255).nullable().default(null)),
  Endereco: z.preprocess(normalizeEmptyValue, z.string().max(255).nullable().default(null)),
  Cidade: z.preprocess(normalizeEmptyValue, z.string().max(100).nullable().default(null)),
  Estado: z.preprocess(normalizeEmptyValue, z.string().max(2).nullable().default(null)),
  CEP: z.preprocess(normalizeEmptyValue, z.string().max(10).nullable().default(null)),
  'Contato Principal Nome': z.preprocess(normalizeEmptyValue, z.string().max(200).nullable().default(null)),
  'Contato Principal Cargo': z.preprocess(normalizeEmptyValue, z.string().max(100).nullable().default(null)),
  'Contato Principal Email': z.preprocess(normalizeEmptyValue, z.string().email("Email inválido").max(255).nullable().default(null)),
  'Contato Principal Telefone': z.preprocess(normalizeEmptyValue, z.string().max(50).nullable().default(null)),
  Observacoes: z.preprocess(normalizeEmptyValue, z.string().max(2000).nullable().default(null)),
}).passthrough();

interface ParsedEmpresa {
  lineNumber: number;
  data: any;
  normalized: {
    nome: string;
    cnpj: string;
    setor: string | null;
    porte: string | null;
    status: string | null;
    telefone: string | null;
    email: string | null;
    site: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    contato_principal_nome: string | null;
    contato_principal_cargo: string | null;
    contato_principal_email: string | null;
    contato_principal_telefone: string | null;
    observacoes: string | null;
  };
  isDuplicate: boolean;
  duplicateWith?: any;
  validationError?: string;
  warnings?: string[];
}

interface ImportResult {
  line: number;
  nome: string;
  status: 'success' | 'error' | 'skipped' | 'updated';
  message: string;
}

export function ImportEmpresasModal({ open, onOpenChange, onSuccess }: ImportEmpresasModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedEmpresa[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importMode, setImportMode] = useState<'skip_duplicates' | 'update_existing'>('skip_duplicates');
  const [lgpdAccepted, setLgpdAccepted] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    setFile(uploadedFile);
    
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (!jsonData || jsonData.length === 0) {
        toast.error("A planilha está vazia");
        return;
      }

      // Parse e valida dados
      const parsed: ParsedEmpresa[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const lineNumber = i + 2; // +2 porque linha 1 é cabeçalho e arrays começam em 0

        try {
          const validated = empresaSchema.parse(row);
          const cnpjClean = validated.CNPJ.replace(/[^\d]/g, '');

          const normalized = {
            nome: validated.Nome,
            cnpj: cnpjClean,
            setor: validated.Setor,
            porte: validated.Porte,
            status: validated.Status || 'ativo',
            telefone: validated.Telefone,
            email: validated.Email,
            site: validated.Site,
            endereco: validated.Endereco,
            cidade: validated.Cidade,
            estado: validated.Estado,
            cep: validated.CEP,
            contato_principal_nome: validated['Contato Principal Nome'],
            contato_principal_cargo: validated['Contato Principal Cargo'],
            contato_principal_email: validated['Contato Principal Email'],
            contato_principal_telefone: validated['Contato Principal Telefone'],
            observacoes: validated.Observacoes,
          };

          parsed.push({
            lineNumber,
            data: row,
            normalized,
            isDuplicate: false,
            warnings: [],
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
            parsed.push({
              lineNumber,
              data: row,
              normalized: {} as any,
              isDuplicate: false,
              validationError: errorMessages,
            });
          }
        }
      }

      // Verificar duplicatas no banco via CNPJ
      const cnpjs = parsed
        .filter(p => !p.validationError && p.normalized.cnpj)
        .map(p => p.normalized.cnpj);

      if (cnpjs.length > 0) {
        const { data: existingEmpresas } = await supabase
          .from('empresas')
          .select('id, nome, cnpj')
          .in('cnpj', cnpjs);

        if (existingEmpresas) {
          parsed.forEach(item => {
            if (item.normalized.cnpj) {
              const existing = existingEmpresas.find(e => e.cnpj === item.normalized.cnpj);
              if (existing) {
                item.isDuplicate = true;
                item.duplicateWith = existing;
              }
            }
          });
        }
      }

      setParsedData(parsed);
      setStep('preview');
      toast.success(`${parsed.length} registros carregados`);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error("Erro ao processar arquivo Excel");
    }
  };

  const handleImport = async () => {
    if (!lgpdAccepted) {
      toast.error("É necessário aceitar os termos de LGPD para continuar");
      return;
    }

    setProcessing(true);
    setStep('processing');
    setProgress(0);

    const toProcess = parsedData.filter(item => {
      if (item.validationError) return false;
      if (item.isDuplicate && importMode === 'skip_duplicates') return false;
      return true;
    });

    const importResults: ImportResult[] = [];
    
    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      const progressPercent = Math.round(((i + 1) / toProcess.length) * 100);
      setProgress(progressPercent);

      try {
        if (item.isDuplicate && importMode === 'update_existing') {
          // Atualizar empresa existente
          const { error } = await supabase
            .from('empresas')
            .update({
              nome: item.normalized.nome,
              setor: item.normalized.setor,
              porte: item.normalized.porte,
              status: item.normalized.status,
              telefone: item.normalized.telefone,
              email: item.normalized.email,
              site: item.normalized.site,
              endereco: item.normalized.endereco,
              cidade: item.normalized.cidade,
              estado: item.normalized.estado,
              cep: item.normalized.cep,
              contato_principal_nome: item.normalized.contato_principal_nome,
              contato_principal_cargo: item.normalized.contato_principal_cargo,
              contato_principal_email: item.normalized.contato_principal_email,
              contato_principal_telefone: item.normalized.contato_principal_telefone,
              observacoes: item.normalized.observacoes,
              updated_at: new Date().toISOString(),
            })
            .eq('cnpj', item.normalized.cnpj);

          if (error) throw error;

          importResults.push({
            line: item.lineNumber,
            nome: item.normalized.nome,
            status: 'updated',
            message: 'Atualizado com sucesso',
          });
        } else {
          // Inserir nova empresa
          const { error } = await supabase
            .from('empresas')
            .insert({
              nome: item.normalized.nome,
              cnpj: item.normalized.cnpj,
              setor: item.normalized.setor,
              porte: item.normalized.porte,
              status: item.normalized.status,
              telefone: item.normalized.telefone,
              email: item.normalized.email,
              site: item.normalized.site,
              endereco: item.normalized.endereco,
              cidade: item.normalized.cidade,
              estado: item.normalized.estado,
              cep: item.normalized.cep,
              contato_principal_nome: item.normalized.contato_principal_nome,
              contato_principal_cargo: item.normalized.contato_principal_cargo,
              contato_principal_email: item.normalized.contato_principal_email,
              contato_principal_telefone: item.normalized.contato_principal_telefone,
              observacoes: item.normalized.observacoes,
            });

          if (error) throw error;

          importResults.push({
            line: item.lineNumber,
            nome: item.normalized.nome,
            status: 'success',
            message: 'Importado com sucesso',
          });
        }
      } catch (error: any) {
        console.error('Erro ao importar linha:', item.lineNumber, error);
        importResults.push({
          line: item.lineNumber,
          nome: item.normalized.nome,
          status: 'error',
          message: error.message || 'Erro desconhecido',
        });
      }
    }

    // Adicionar registros pulados
    parsedData.forEach(item => {
      if (item.validationError) {
        importResults.push({
          line: item.lineNumber,
          nome: item.data.Nome || 'Sem nome',
          status: 'error',
          message: item.validationError,
        });
      } else if (item.isDuplicate && importMode === 'skip_duplicates') {
        importResults.push({
          line: item.lineNumber,
          nome: item.normalized.nome,
          status: 'skipped',
          message: 'CNPJ duplicado - pulado',
        });
      }
    });

    setResults(importResults);
    setStep('results');
    setProcessing(false);

    const successCount = importResults.filter(r => r.status === 'success' || r.status === 'updated').length;
    toast.success(`Importação concluída! ${successCount} empresas processadas com sucesso.`);
    
    if (onSuccess) {
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nome': 'Exemplo Empresa Ltda',
        'CNPJ': '12.345.678/0001-90',
        'Setor': 'Tecnologia',
        'Porte': 'Médio',
        'Status': 'ativo',
        'Telefone': '(11) 1234-5678',
        'Email': 'contato@exemplo.com',
        'Site': 'www.exemplo.com',
        'Endereco': 'Rua Exemplo, 123',
        'Cidade': 'São Paulo',
        'Estado': 'SP',
        'CEP': '01234-567',
        'Contato Principal Nome': 'João Silva',
        'Contato Principal Cargo': 'Gerente de RH',
        'Contato Principal Email': 'joao@exemplo.com',
        'Contato Principal Telefone': '(11) 98765-4321',
        'Observacoes': 'Cliente em prospecção',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    XLSX.writeFile(wb, 'template_importacao_empresas.xlsx');
    toast.success("Template baixado com sucesso!");
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setResults([]);
    setProgress(0);
    setLgpdAccepted(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const validCount = parsedData.filter(p => !p.validationError).length;
  const errorCount = parsedData.filter(p => p.validationError).length;
  const duplicateCount = parsedData.filter(p => p.isDuplicate && !p.validationError).length;
  const toImportCount = parsedData.filter(p => {
    if (p.validationError) return false;
    if (p.isDuplicate && importMode === 'skip_duplicates') return false;
    return true;
  }).length;

  const successCount = results.filter(r => r.status === 'success').length;
  const updatedCount = results.filter(r => r.status === 'updated').length;
  const errorResultCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Empresas via Excel
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Campo obrigatório para deduplicação:</strong> CNPJ<br />
                O CNPJ será utilizado para evitar importações duplicadas.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary font-semibold">Clique para selecionar</span>
                  {' '}ou arraste um arquivo Excel
                </Label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Formatos aceitos: .xlsx, .xls
                </p>
                {file && (
                  <p className="text-sm font-medium mt-2 text-green-600">
                    ✓ {file.name}
                  </p>
                )}
              </div>

              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Planilha Modelo
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{validCount}</div>
                <div className="text-sm text-green-600">Válidos</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-700">{duplicateCount}</div>
                <div className="text-sm text-yellow-600">Duplicados</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{errorCount}</div>
                <div className="text-sm text-red-600">Erros</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{toImportCount}</div>
                <div className="text-sm text-blue-600">A Importar</div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Modo de Importação</Label>
              <RadioGroup value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip_duplicates" id="skip" />
                  <Label htmlFor="skip" className="font-normal cursor-pointer">
                    Pular duplicados (CNPJ já existente)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update_existing" id="update" />
                  <Label htmlFor="update" className="font-normal cursor-pointer">
                    Atualizar dados das empresas existentes (por CNPJ)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="lgpd"
                checked={lgpdAccepted}
                onCheckedChange={(checked) => setLgpdAccepted(checked === true)}
              />
              <Label htmlFor="lgpd" className="font-normal cursor-pointer">
                Confirmo que tenho consentimento para processar estes dados conforme LGPD
              </Label>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Linha</th>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">CNPJ</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{item.lineNumber}</td>
                      <td className="px-4 py-2">{item.data.Nome || '-'}</td>
                      <td className="px-4 py-2">{item.data.CNPJ || '-'}</td>
                      <td className="px-4 py-2">
                        {item.validationError ? (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            Erro
                          </span>
                        ) : item.isDuplicate ? (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Duplicado
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep('upload')} variant="outline">
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!lgpdAccepted || toImportCount === 0}
                className="flex-1"
              >
                Importar {toImportCount} Empresas
              </Button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Processando Importação</h3>
              <p className="text-muted-foreground">Por favor, aguarde...</p>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">{progress}% concluído</p>
          </div>
        )}

        {/* Step: Results */}
        {step === 'results' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{successCount}</div>
                <div className="text-sm text-green-600">Importados</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{updatedCount}</div>
                <div className="text-sm text-blue-600">Atualizados</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-700">{skippedCount}</div>
                <div className="text-sm text-yellow-600">Pulados</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{errorResultCount}</div>
                <div className="text-sm text-red-600">Erros</div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Linha</th>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{result.line}</td>
                      <td className="px-4 py-2">{result.nome}</td>
                      <td className="px-4 py-2">
                        {result.status === 'success' && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Sucesso
                          </span>
                        )}
                        {result.status === 'updated' && (
                          <span className="text-blue-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Atualizado
                          </span>
                        )}
                        {result.status === 'skipped' && (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Pulado
                          </span>
                        )}
                        {result.status === 'error' && (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            Erro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={handleClose} className="w-full">
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
