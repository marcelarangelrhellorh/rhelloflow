import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSpreadsheet, Download, Upload, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
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
  showVagaSelector?: boolean;
}

// Função para normalizar valores vazios/inválidos
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

const candidatoSchema = z.object({
  Nome: z.preprocess(normalizeEmptyValue, z.string().min(1, "Nome é obrigatório").max(100)),
  Sobrenome: z.preprocess(normalizeEmptyValue, z.string().max(100).nullable().default(null)),
  'E-mail': z.preprocess(normalizeEmptyValue, z.string().email("Email inválido").max(255)),
  Telefone: z.preprocess(normalizeEmptyValue, z.string().max(50).nullable().default(null)),
  Celular: z.preprocess(normalizeEmptyValue, z.string().max(50).nullable().default(null)),
  Estado: z.preprocess(normalizeEmptyValue, z.string().max(100).nullable().default(null)),
  Cidade: z.preprocess(normalizeEmptyValue, z.string().max(100).nullable().default(null)),
  Idade: z.preprocess(normalizeEmptyValue, z.union([z.string(), z.number()]).nullable().default(null)),
  Sexo: z.preprocess(normalizeEmptyValue, z.string().max(50).nullable().default(null)),
  'Salário máximo': z.preprocess(normalizeEmptyValue, z.union([z.string(), z.number()]).nullable().default(null)),
  'Experiência profissional': z.preprocess(normalizeEmptyValue, z.string().max(5000).nullable().default(null)),
  Idiomas: z.preprocess(normalizeEmptyValue, z.string().max(500).nullable().default(null)),
  'Origem da candidatura': z.preprocess(normalizeEmptyValue, z.string().max(200).nullable().default(null)),
  'Inscrito desde': z.preprocess(normalizeEmptyValue, z.string().nullable().default(null)),
}).passthrough();

interface ParsedCandidate {
  lineNumber: number;
  data: any;
  normalized: {
    nome_completo: string;
    email: string;
    telefone: string | null;
    idade: number | null;
    sexo: string | null;
    cidade: string | null;
    estado: string | null;
    pretensao_salarial: number | null;
    experiencia_profissional: string | null;
    idiomas: string | null;
    origem: string;
  };
  isDuplicate: boolean;
  duplicateType?: 'exact' | 'conflict';
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

export function ImportXlsModal({ open, onOpenChange, sourceType, vagaId: initialVagaId, onSuccess, showVagaSelector = false }: ImportXlsModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'results'>(showVagaSelector ? 'upload' : 'upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCandidate[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [selectedVagaId, setSelectedVagaId] = useState<string>('');
  const [vagas, setVagas] = useState<Array<{ id: string; titulo: string }>>([]);
  const [dedupField, setDedupField] = useState<'email' | 'telefone'>('email');
  const [importMode, setImportMode] = useState<'all' | 'skip_duplicates' | 'update_existing'>('all');
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showSelectVaga, setShowSelectVaga] = useState(showVagaSelector);
  const [selectedOrigem, setSelectedOrigem] = useState<string>('Link de Divulgação');

  useEffect(() => {
    if (showVagaSelector && open) {
      loadVagas();
    }
  }, [showVagaSelector, open]);

  const loadVagas = async () => {
    try {
      const { data, error } = await supabase
        .from("vagas")
        .select("id, titulo")
        .order("titulo");

      if (error) throw error;
      setVagas(data || []);
    } catch (error) {
      console.error("Erro ao carregar vagas:", error);
      toast.error("Erro ao carregar vagas");
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nome': 'João',
        'Sobrenome': 'Silva',
        'E-mail': 'joao.silva@example.com',
        'Telefone': '(11) 99999-9999',
        'Celular': '(11) 98888-8888',
        'Estado': 'SP',
        'Cidade': 'São Paulo',
        'Idade': 34,
        'Sexo': 'Masculino',
        'Salário máximo': 12000,
        'Experiência profissional': '10 anos como gerente comercial em empresas de tecnologia...',
        'Idiomas': 'Inglês (fluente), Espanhol (intermediário)',
        'Origem da candidatura': 'LinkedIn',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidatos");
    
    const widths = [15, 15, 30, 18, 18, 8, 20, 8, 15, 15, 50, 30, 25];
    ws['!cols'] = widths.map(wch => ({ wch }));

    XLSX.writeFile(wb, "template_importacao_candidatos.xlsx");
    toast.success("Template baixado com sucesso!");
  };

  const normalizeSexo = (sexo: string | undefined | null): string | null => {
    if (!sexo) return null;
    const s = sexo.toLowerCase().trim();
    if (s.includes('masc') || s === 'm') return 'M';
    if (s.includes('fem') || s === 'f') return 'F';
    return 'Outro';
  };

  const normalizeOrigem = (origem: string | undefined | null, inscritoDesde: string | undefined | null): string => {
    const value = (origem || inscritoDesde || '').toLowerCase().trim();
    if (value.includes('info') || value.includes('job')) return 'infojobs';
    if (value.includes('catho')) return 'catho';
    if (value.includes('linkedin')) return 'linkedin';
    if (value.includes('indica')) return 'indicacao';
    if (value.includes('site')) return 'site_empresa';
    return 'importacao_xls';
  };

  const parseSalary = (value: any): number | null => {
    if (!value) return null;
    const num = typeof value === 'string' 
      ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'))
      : value;
    // Retornar null se for NaN, negativo ou zero
    return (!isNaN(num) && num > 0) ? num : null;
  };

  const parseAge = (value: any): number | null => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : value;
    return (!isNaN(num) && num > 0 && num < 150) ? num : null;
  };

  const normalizeEstado = (estado: string | undefined | null): string | null => {
    if (!estado) return null;
    // Remove acentos usando NFD
    const e = estado.trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    
    const stateMap: Record<string, string> = {
      'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPA': 'AP', 'AMAZONAS': 'AM',
      'BAHIA': 'BA', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES',
      'GOIAS': 'GO', 'MARANHAO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
      'MINAS GERAIS': 'MG', 'PARA': 'PA', 'PARAIBA': 'PB', 'PARANA': 'PR',
      'PERNAMBUCO': 'PE', 'PIAUI': 'PI', 'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN',
      'RIO GRANDE DO SUL': 'RS', 'RONDONIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC',
      'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
    };
    
    // Se já é uma sigla válida de 2 letras, retorna
    if (e.length === 2) return e;
    
    // Tenta encontrar o nome completo no mapa
    return stateMap[e] || null;
  };

  const normalizeTelefone = (telefone: string | undefined | null): string | null => {
    if (!telefone) return null;
    // Remove tudo que não é dígito
    const digits = telefone.replace(/\D/g, '');
    // Aceita 10-11 dígitos (formato Brasil)
    if (digits.length >= 10 && digits.length <= 11) {
      return digits;
    }
    return null;
  };

  const toTitleCase = (str: string): string => {
    return str.toLowerCase().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Função auxiliar para buscar campo com nome variado
  const getFieldValue = (row: any, possibleNames: string[]): any => {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null) {
        return row[name];
      }
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }

    setFile(selectedFile);
    await parseFile(selectedFile);
  };

  const parseFile = async (fileToProcess: File) => {
    try {
      setProcessing(true);
      const data = await fileToProcess.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Find header row
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      let headerRowIndex = -1;
      
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (Array.isArray(row) && row.includes('Nome') && row.includes('E-mail')) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        toast.error("Não foi possível encontrar o cabeçalho da planilha.");
        setProcessing(false);
        return;
      }
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        range: headerRowIndex,
        defval: null 
      });

      if (jsonData.length === 0) {
        toast.error("Planilha vazia.");
        setProcessing(false);
        return;
      }

      if (jsonData.length > 100) {
        toast.error("Máximo de 100 candidatos por importação");
        setProcessing(false);
        return;
      }

      // Get existing candidates for deduplication
      const { data: existingCandidates, error: fetchError } = await supabase
        .from("candidatos")
        .select("id, nome_completo, email, telefone, cidade, estado, pretensao_salarial");

      if (fetchError) throw fetchError;

      const parsed: ParsedCandidate[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const lineNumber = headerRowIndex + i + 2;

        try {
          if (!row['Nome'] || !row['E-mail']) {
            continue;
          }

          const validated = candidatoSchema.parse(row);
          const warnings: string[] = [];

          const nome_completo = validated.Sobrenome
            ? toTitleCase(`${validated.Nome} ${validated.Sobrenome}`.trim())
            : toTitleCase(validated.Nome);

          // Normalizar telefones com warnings
          const telefoneRaw = validated.Celular || validated.Telefone || null;
          const telefone = normalizeTelefone(telefoneRaw);
          if (telefoneRaw && !telefone) {
            warnings.push('Telefone em formato inválido');
          }

          const idade = parseAge(validated.Idade);
          if (validated.Idade && !idade) {
            warnings.push('Idade inválida');
          }

          const sexo = normalizeSexo(validated.Sexo);
          const pretensao_salarial = parseSalary(validated['Salário máximo']);
          // Usar origem selecionada pelo recrutador ao invés de inferir da planilha
          const origem = selectedOrigem;

          // Normalizar estado com warning
          const estadoNormalized = normalizeEstado(validated.Estado);
          if (validated.Estado && !estadoNormalized) {
            warnings.push('Estado não reconhecido');
          }

          // Validar cidade
          const cidade = validated.Cidade || null;
          if (!cidade && estadoNormalized) {
            warnings.push('Cidade não informada');
          }

          // Buscar experiência profissional com nomes variados
          const experienciaProfissional = 
            validated['Experiência profissional'] || 
            getFieldValue(row, [
              'Experiência profissional',
              'Experiencia profissional', 
              'Experiência Profissional',
              'Experiencia Profissional',
              'Experiência',
              'Experiencia'
            ]);

          const normalized = {
            nome_completo,
            email: validated['E-mail'].toLowerCase().trim(),
            telefone,
            idade,
            sexo,
            cidade,
            estado: estadoNormalized,
            pretensao_salarial,
            experiencia_profissional: experienciaProfissional,
            idiomas: validated.Idiomas || null,
            origem,
          };

          // Check for duplicates
          const dedupValue = dedupField === 'email' ? normalized.email : normalized.telefone;
          const existingCandidate = existingCandidates?.find(c => 
            dedupField === 'email' ? c.email === normalized.email : c.telefone === normalized.telefone
          );

          let isDuplicate = false;
          let duplicateType: 'exact' | 'conflict' | undefined;

          if (existingCandidate && dedupValue) {
            isDuplicate = true;
            // Check if data matches
            const dataMatches = 
              existingCandidate.nome_completo === normalized.nome_completo &&
              existingCandidate.cidade === normalized.cidade &&
              existingCandidate.estado === normalized.estado;
            
            duplicateType = dataMatches ? 'exact' : 'conflict';
          }

          parsed.push({
            lineNumber,
            data: row,
            normalized,
            isDuplicate,
            duplicateType,
            duplicateWith: existingCandidate,
            warnings: warnings.length > 0 ? warnings : undefined,
          });
        } catch (error: any) {
          parsed.push({
            lineNumber,
            data: row,
            normalized: {} as any,
            isDuplicate: false,
            validationError: error.message || 'Erro ao validar dados',
          });
        }
      }

      setParsedData(parsed);
      setStep('preview');
      setProcessing(false);
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast.error("Erro ao processar arquivo: " + error.message);
      setProcessing(false);
    }
  };

  const processImport = async () => {
    if (!lgpdAccepted) {
      toast.error("Por favor, aceite o termo de consentimento LGPD");
      return;
    }

    const vagaId = initialVagaId || selectedVagaId || undefined;
    const startTime = Date.now();

    setStep('processing');
    setProcessing(true);
    setProgress(0);
    const importResults: ImportResult[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let processed = 0;
      // Incluir candidatos com warnings (não bloquear por warnings)
      const validCandidates = parsedData.filter(c => !c.validationError);
      const invalidCandidates = parsedData.filter(c => c.validationError);

      for (const candidate of validCandidates) {
        try {
          // Skip duplicates based on import mode
          if (candidate.isDuplicate && importMode === 'skip_duplicates') {
            importResults.push({
              line: candidate.lineNumber,
              nome: candidate.normalized.nome_completo,
              status: 'skipped',
              message: 'Duplicado ignorado'
            });
            processed++;
            setProgress(Math.round((processed / validCandidates.length) * 100));
            continue;
          }

          const candidatoData: any = {
            nome_completo: candidate.normalized.nome_completo,
            email: candidate.normalized.email,
            telefone: candidate.normalized.telefone,
            cidade: candidate.normalized.cidade,
            estado: candidate.normalized.estado,
            idade: candidate.normalized.idade,
            sexo: candidate.normalized.sexo,
            pretensao_salarial: candidate.normalized.pretensao_salarial,
            experiencia_profissional: candidate.normalized.experiencia_profissional,
            idiomas: candidate.normalized.idiomas,
            origem: candidate.normalized.origem,
            disponibilidade_status: 'disponível',
            status: sourceType === 'vaga' ? 'Selecionado' : 'Banco de Talentos',
          };

          if (vagaId) {
            candidatoData.vaga_relacionada_id = vagaId;
          }

          // Update or insert
          if (candidate.isDuplicate && importMode === 'update_existing' && candidate.duplicateWith) {
            const { error } = await supabase
              .from('candidatos')
              .update(candidatoData)
              .eq('id', candidate.duplicateWith.id);

            if (error) throw error;

            importResults.push({
              line: candidate.lineNumber,
              nome: candidate.normalized.nome_completo,
              status: 'updated',
              message: 'Atualizado com sucesso'
            });
          } else if (!candidate.isDuplicate || importMode === 'all') {
            const { error } = await supabase
              .from('candidatos')
              .insert(candidatoData);

            if (error) throw error;

            importResults.push({
              line: candidate.lineNumber,
              nome: candidate.normalized.nome_completo,
              status: 'success',
              message: 'Importado com sucesso'
            });
          }
        } catch (error: any) {
          importResults.push({
            line: candidate.lineNumber,
            nome: candidate.normalized.nome_completo,
            status: 'error',
            message: error.message || 'Erro ao importar'
          });
        }

        processed++;
        setProgress(Math.round((processed / validCandidates.length) * 100));
      }

      const processingTime = Date.now() - startTime;
      const successCount = importResults.filter(r => r.status === 'success').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;
      const skippedCount = importResults.filter(r => r.status === 'skipped').length;
      const updatedCount = importResults.filter(r => r.status === 'updated').length;

      // Exportar CSV com linhas inválidas/erro (se houver)
      if (invalidCandidates.length > 0 || errorCount > 0) {
        const csvData = [
          ['Linha', 'Nome', 'Email', 'Motivo'],
          ...invalidCandidates.map(c => [
            c.lineNumber,
            c.data.Nome || '',
            c.data['E-mail'] || '',
            c.validationError || ''
          ]),
          ...importResults
            .filter(r => r.status === 'error')
            .map(r => [r.line, r.nome, '', r.message])
        ];
        
        const csvContent = csvData.map(row => row.join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `erros_importacao_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Save import log
      const { error: logError } = await supabase.from('import_logs').insert([{
        file_name: file?.name || 'unknown',
        source_type: sourceType,
        vaga_id: vagaId || null,
        total_rows: parsedData.length,
        success_count: successCount,
        error_count: errorCount,
        ignored_count: skippedCount,
        updated_count: updatedCount,
        import_mode: importMode,
        dedup_field: dedupField,
        results: importResults as any,
        duplicates_found: parsedData.filter(c => c.isDuplicate).map(c => ({
          line: c.lineNumber,
          email: c.normalized.email,
          type: c.duplicateType
        })) as any,
        processing_time_ms: processingTime,
      }] as any);

      if (logError) console.error('Erro ao salvar log:', logError);

      setResults(importResults);
      setStep('results');

      if (successCount > 0 || updatedCount > 0) {
        toast.success(`✅ ${successCount + updatedCount} candidato(s) processado(s)!`);
      }
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} erro(s) na importação`);
      }

      if ((successCount > 0 || updatedCount > 0) && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Erro ao processar importação:', error);
      toast.error("Erro ao processar importação: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setFile(null);
      setParsedData([]);
      setResults([]);
      setProgress(0);
      setSelectedVagaId('');
      setSelectedOrigem('Link de Divulgação');
      setStep('upload');
      setLgpdAccepted(false);
      onOpenChange(false);
    }
  };

  const duplicatesCount = parsedData.filter(c => c.isDuplicate).length;
  const exactDuplicates = parsedData.filter(c => c.duplicateType === 'exact').length;
  const conflictDuplicates = parsedData.filter(c => c.duplicateType === 'conflict').length;
  const warningsCount = parsedData.filter(c => c.warnings && c.warnings.length > 0).length;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const updatedCount = results.filter(r => r.status === 'updated').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Candidatos em Massa (XLS)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <>
              {showSelectVaga && (
                <div className="space-y-3">
                  <Label htmlFor="vaga-select">Selecione a vaga (opcional)</Label>
                  <Select value={selectedVagaId || "none"} onValueChange={(value) => setSelectedVagaId(value === "none" ? "" : value)}>
                    <SelectTrigger id="vaga-select">
                      <SelectValue placeholder="Sem vaga específica (Banco de Talentos)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vaga específica</SelectItem>
                      {vagas.map((vaga) => (
                        <SelectItem key={vaga.id} value={vaga.id}>
                          {vaga.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="origem-select">Origem dos candidatos *</Label>
                <Select value={selectedOrigem} onValueChange={setSelectedOrigem}>
                  <SelectTrigger id="origem-select">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Link de Divulgação">🔗 Link de Divulgação</SelectItem>
                    <SelectItem value="Pandapé">🐼 Pandapé</SelectItem>
                    <SelectItem value="LinkedIn">💼 LinkedIn</SelectItem>
                    <SelectItem value="Gupy">🎯 Gupy</SelectItem>
                    <SelectItem value="Indeed">📋 Indeed</SelectItem>
                    <SelectItem value="Catho">📊 Catho</SelectItem>
                    <SelectItem value="Indicação">👥 Indicação</SelectItem>
                    <SelectItem value="Site da Empresa">🌐 Site da Empresa</SelectItem>
                    <SelectItem value="Instagram">📸 Instagram</SelectItem>
                    <SelectItem value="WhatsApp">💬 WhatsApp</SelectItem>
                    <SelectItem value="E-mail Direto">✉️ E-mail Direto</SelectItem>
                    <SelectItem value="Hunting">🎯 Hunting</SelectItem>
                    <SelectItem value="Outra">➕ Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Baixe o template com os campos corretos</span>
                    <Button onClick={downloadTemplate} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Template
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert className="border-amber-500 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>LGPD - Proteção de Dados Pessoais</strong>
                  <p className="mt-1 text-sm">
                    Certifique-se de ter autorização dos candidatos antes de importar dados pessoais.
                    A Rhello não se responsabiliza por dados importados sem consentimento.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label>Campos que serão importados</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Nome + Sobrenome
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    E-mail
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Telefone
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Idade
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Cidade/Estado
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Sexo
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Salário Máximo
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Experiência
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Idiomas
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Origem
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Selecione o arquivo (máx. 10MB, 100 linhas)</Label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={processing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 animate-pulse" />
                    <span>Processando arquivo...</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{parsedData.length} candidato(s)</strong> encontrado(s) na planilha.
                  {duplicatesCount > 0 && (
                    <>
                      <br />
                      <span className="text-amber-600">⚠️ {duplicatesCount} duplicado(s) detectado(s)</span>
                      {exactDuplicates > 0 && <span className="ml-2 text-amber-600">({exactDuplicates} igual(is))</span>}
                      {conflictDuplicates > 0 && <span className="ml-2 text-red-600">({conflictDuplicates} com divergência)</span>}
                    </>
                  )}
                  {warningsCount > 0 && (
                    <>
                      <br />
                      <span className="text-blue-600">ℹ️ {warningsCount} linha(s) com avisos (serão importadas mesmo assim)</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label>Campo para detecção de duplicados</Label>
                <RadioGroup value={dedupField} onValueChange={(v: any) => setDedupField(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="dedup-email" />
                    <Label htmlFor="dedup-email" className="font-normal">E-mail (padrão)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="telefone" id="dedup-tel" />
                    <Label htmlFor="dedup-tel" className="font-normal">Telefone</Label>
                  </div>
                </RadioGroup>
              </div>

              {duplicatesCount > 0 && (
                <div className="space-y-3">
                  <Label>O que fazer com duplicados?</Label>
                  <RadioGroup value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="mode-all" />
                      <Label htmlFor="mode-all" className="font-normal">
                        Importar todos (inclusive duplicados)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip_duplicates" id="mode-skip" />
                      <Label htmlFor="mode-skip" className="font-normal">
                        Ignorar duplicados ({duplicatesCount} serão ignorados)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="update_existing" id="mode-update" />
                      <Label htmlFor="mode-update" className="font-normal">
                        Atualizar existentes ({duplicatesCount} serão atualizados)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="lgpd"
                  checked={lgpdAccepted}
                  onCheckedChange={(checked) => setLgpdAccepted(checked as boolean)}
                />
                <Label htmlFor="lgpd" className="font-normal text-sm leading-relaxed">
                  Confirmo que tenho autorização dos candidatos para importar seus dados pessoais
                  conforme a Lei Geral de Proteção de Dados (LGPD)
                </Label>
              </div>

              <div className="border rounded-lg max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Linha</th>
                      <th className="p-2 text-left">Nome</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Telefone</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 20).map((candidate) => (
                      <tr
                        key={candidate.lineNumber}
                        className={
                          candidate.validationError
                            ? "bg-red-50"
                            : candidate.duplicateType === 'conflict'
                            ? "bg-red-50"
                            : candidate.duplicateType === 'exact'
                            ? "bg-amber-50"
                            : ""
                        }
                      >
                        <td className="p-2">{candidate.lineNumber}</td>
                        <td className="p-2">{candidate.normalized.nome_completo || candidate.data.Nome}</td>
                        <td className="p-2">{candidate.normalized.email || candidate.data['E-mail']}</td>
                        <td className="p-2">{candidate.normalized.telefone || '-'}</td>
                        <td className="p-2">
                          {candidate.validationError ? (
                            <span className="text-red-600 text-xs">{candidate.validationError}</span>
                          ) : candidate.duplicateType === 'conflict' ? (
                            <span className="text-red-600 text-xs">⚠️ Duplicado (divergência)</span>
                          ) : candidate.duplicateType === 'exact' ? (
                            <span className="text-amber-600 text-xs">⚠️ Duplicado (igual)</span>
                          ) : candidate.warnings && candidate.warnings.length > 0 ? (
                            <div className="text-blue-600 text-xs">
                              <div>ℹ️ Avisos:</div>
                              {candidate.warnings.map((w, idx) => (
                                <div key={idx}>• {w}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-green-600 text-xs">✓ OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 20 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    ... e mais {parsedData.length - 20} candidato(s)
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={handleClose} variant="outline">
                  Cancelar
                </Button>
                <Button onClick={() => setStep('upload')} variant="outline">
                  Voltar
                </Button>
                <Button onClick={processImport} disabled={!lgpdAccepted || parsedData.length === 0}>
                  Confirmar Importação
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="space-y-4">
              <Alert>
                <Upload className="h-4 w-4 animate-pulse" />
                <AlertDescription>
                  Importando candidatos... Por favor, aguarde.
                </AlertDescription>
              </Alert>
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">{progress}%</p>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && (
            <>
              <Alert className={errorCount > 0 ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}>
                {errorCount > 0 ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription>
                  <strong>Importação concluída!</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>✅ {successCount} importado(s)</div>
                    {updatedCount > 0 && <div>🔄 {updatedCount} atualizado(s)</div>}
                    {skippedCount > 0 && <div>⏭️ {skippedCount} ignorado(s)</div>}
                    {errorCount > 0 && (
                      <>
                        <div className="text-red-600">❌ {errorCount} erro(s)</div>
                        <div className="text-xs text-muted-foreground">
                          CSV com erros foi baixado automaticamente
                        </div>
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Linha</th>
                      <th className="p-2 text-left">Nome</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr
                        key={result.line}
                        className={
                          result.status === 'error'
                            ? "bg-red-50"
                            : result.status === 'skipped'
                            ? "bg-gray-50"
                            : result.status === 'updated'
                            ? "bg-blue-50"
                            : "bg-green-50"
                        }
                      >
                        <td className="p-2">{result.line}</td>
                        <td className="p-2">{result.nome}</td>
                        <td className="p-2">
                          {result.status === 'success' && <span className="text-green-600">✓ Importado</span>}
                          {result.status === 'updated' && <span className="text-blue-600">🔄 Atualizado</span>}
                          {result.status === 'skipped' && <span className="text-gray-600">⏭️ Ignorado</span>}
                          {result.status === 'error' && <span className="text-red-600">✗ Erro</span>}
                        </td>
                        <td className="p-2 text-xs">{result.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={handleClose}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}