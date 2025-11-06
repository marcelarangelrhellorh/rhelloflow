import { useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ImportPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: 'vaga' | 'banco_talentos';
  vagaId?: string;
  onSuccess?: (candidatoId: string) => void;
}

interface ExtractedField {
  value: string | null;
  confidence: number;
  evidence: string;
}

interface ExtractedData {
  full_name?: ExtractedField;
  email?: ExtractedField;
  phone?: ExtractedField;
  linkedin_url?: ExtractedField;
  city?: ExtractedField;
  state?: ExtractedField;
  area_of_expertise?: ExtractedField;
  desired_role?: ExtractedField;
  seniority?: ExtractedField;
  salary_expectation?: ExtractedField;
  skills?: Array<{ value: string; confidence: number; evidence: string }>;
  education?: Array<{ degree: string; institution: string; years: string; confidence: number; evidence: string }>;
  work_experience?: Array<{ title: string; company: string; from: string; to: string; summary: string; confidence: number; evidence: string }>;
  portfolio_url?: ExtractedField;
}

export function ImportPdfModal({ open, onOpenChange, sourceType, vagaId, onSuccess }: ImportPdfModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importId, setImportId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [globalConfidence, setGlobalConfidence] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Arquivo inválido",
          description: "Apenas arquivos PDF são permitidos.",
          variant: "destructive",
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', sourceType);
      if (vagaId) formData.append('vaga_id', vagaId);

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('process-pdf-import', {
        body: formData,
      });

      if (error) throw error;

      setProgress(90);

      if (data.success) {
        setImportId(data.import_id);
        setExtractedData(data.extracted_data);
        setGlobalConfidence(data.global_confidence);
        
        // Inicializar dados editados com valores extraídos
        const initial: Record<string, any> = {};
        Object.entries(data.extracted_data).forEach(([key, field]: [string, any]) => {
          if (Array.isArray(field)) {
            initial[key] = field;
          } else if (field?.value !== undefined) {
            initial[key] = field.value;
          }
        });
        setEditedData(initial);

        setProgress(100);
        toast({
          title: "PDF processado com sucesso",
          description: "Revise os dados extraídos abaixo antes de salvar.",
        });
      } else {
        throw new Error(data.error || 'Erro ao processar PDF');
      }
    } catch (error: any) {
      console.error('Erro ao processar PDF:', error);
      toast({
        title: "Erro ao processar PDF",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.85) return "Alta";
    if (confidence >= 0.6) return "Média";
    return "Baixa";
  };

  const handleAccept = async () => {
    if (!importId || !extractedData) return;

    setProcessing(true);

    try {
      // Criar candidato com os dados editados
      const candidatoData: any = {
        nome_completo: editedData.full_name || '',
        email: editedData.email || '',
        telefone: editedData.phone || null,
        linkedin: editedData.linkedin_url || null,
        cidade: editedData.city || null,
        estado: editedData.state || null,
        area: editedData.area_of_expertise || null,
        nivel: editedData.seniority || null,
        pretensao_salarial: editedData.salary_expectation ? parseFloat(editedData.salary_expectation.replace(/[^\d,]/g, '').replace(',', '.')) : null,
        portfolio_url: editedData.portfolio_url || null,
        origem: 'PDF Import',
        vaga_relacionada_id: vagaId || null,
      };

      // Adicionar notas com educação e experiência
      const notes: string[] = [];
      
      if (editedData.skills && editedData.skills.length > 0) {
        notes.push(`Habilidades: ${editedData.skills.map((s: any) => s.value).join(', ')}`);
      }
      
      if (editedData.education && editedData.education.length > 0) {
        notes.push('Formação:');
        editedData.education.forEach((edu: any) => {
          notes.push(`- ${edu.degree} em ${edu.institution} (${edu.years})`);
        });
      }
      
      if (editedData.work_experience && editedData.work_experience.length > 0) {
        notes.push('Experiência:');
        editedData.work_experience.forEach((exp: any) => {
          notes.push(`- ${exp.title} na ${exp.company} (${exp.from} - ${exp.to})`);
          if (exp.summary) notes.push(`  ${exp.summary}`);
        });
      }

      if (notes.length > 0) {
        candidatoData.feedback = notes.join('\n');
      }

      const { data: candidato, error: candidatoError } = await supabase
        .from('candidatos')
        .insert(candidatoData)
        .select()
        .single();

      if (candidatoError) throw candidatoError;

      // Atualizar registro de import
      await supabase
        .from('pdf_imports')
        .update({
          status: 'accepted',
          candidato_id: candidato.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', importId);

      toast({
        title: "Candidato criado com sucesso",
        description: `${candidato.nome_completo} foi adicionado ao sistema.`,
      });

      if (onSuccess) {
        onSuccess(candidato.id);
      }

      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar candidato:', error);
      toast({
        title: "Erro ao criar candidato",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!importId) return;

    try {
      await supabase
        .from('pdf_imports')
        .update({ status: 'rejected' })
        .eq('id', importId);

      toast({
        title: "Import cancelado",
        description: "Os dados foram descartados.",
      });

      handleClose();
    } catch (error: any) {
      console.error('Erro ao rejeitar import:', error);
    }
  };

  const handleClose = () => {
    setFile(null);
    setProcessing(false);
    setProgress(0);
    setImportId(null);
    setExtractedData(null);
    setEditedData({});
    setGlobalConfidence(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importar Candidato do PDF</DialogTitle>
          <DialogDescription>
            Faça upload de um CV ou perfil do LinkedIn em PDF. O sistema irá extrair automaticamente as informações.
          </DialogDescription>
        </DialogHeader>

        {!extractedData ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Privacidade:</strong> O arquivo será processado e automaticamente deletado após a extração dos dados.
                Apenas informações necessárias são armazenadas. Conforme LGPD, certifique-se de ter consentimento do candidato.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="pdf-file">Selecione o arquivo PDF</Label>
              <Input
                id="pdf-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={processing}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </div>

            {processing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Processando PDF... Isso pode levar alguns segundos.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={processing}>
                Cancelar
              </Button>
              <Button onClick={handleProcess} disabled={!file || processing}>
                <Upload className="mr-2 h-4 w-4" />
                Processar PDF
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  PDF processado com sucesso! Confiança global: <strong>{((globalConfidence || 0) * 100).toFixed(0)}%</strong>
                  <br />
                  Revise os campos abaixo antes de salvar. Campos com baixa confiança estão destacados.
                </AlertDescription>
              </Alert>

              {/* Campos principais */}
              <div className="space-y-4">
                <h3 className="font-semibold">Dados Pessoais</h3>
                
                {extractedData.full_name && (
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedData.full_name || ''}
                        onChange={(e) => setEditedData({ ...editedData, full_name: e.target.value })}
                      />
                      <Badge className={getConfidenceColor(extractedData.full_name.confidence)}>
                        {getConfidenceLabel(extractedData.full_name.confidence)}
                      </Badge>
                    </div>
                    {extractedData.full_name.evidence && (
                      <p className="text-xs text-muted-foreground italic">"{extractedData.full_name.evidence}"</p>
                    )}
                  </div>
                )}

                {extractedData.email && (
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedData.email || ''}
                        onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                        type="email"
                      />
                      <Badge className={getConfidenceColor(extractedData.email.confidence)}>
                        {getConfidenceLabel(extractedData.email.confidence)}
                      </Badge>
                    </div>
                    {extractedData.email.evidence && (
                      <p className="text-xs text-muted-foreground italic">"{extractedData.email.evidence}"</p>
                    )}
                  </div>
                )}

                {extractedData.phone && (
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedData.phone || ''}
                        onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                      />
                      <Badge className={getConfidenceColor(extractedData.phone.confidence)}>
                        {getConfidenceLabel(extractedData.phone.confidence)}
                      </Badge>
                    </div>
                  </div>
                )}

                {extractedData.linkedin_url && (
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      value={editedData.linkedin_url || ''}
                      onChange={(e) => setEditedData({ ...editedData, linkedin_url: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Dados profissionais */}
              <div className="space-y-4">
                <h3 className="font-semibold">Dados Profissionais</h3>
                
                {extractedData.area_of_expertise && (
                  <div className="space-y-2">
                    <Label>Área</Label>
                    <Input
                      value={editedData.area_of_expertise || ''}
                      onChange={(e) => setEditedData({ ...editedData, area_of_expertise: e.target.value })}
                    />
                  </div>
                )}

                {extractedData.seniority && (
                  <div className="space-y-2">
                    <Label>Senioridade</Label>
                    <Input
                      value={editedData.seniority || ''}
                      onChange={(e) => setEditedData({ ...editedData, seniority: e.target.value })}
                    />
                  </div>
                )}

                {extractedData.salary_expectation && (
                  <div className="space-y-2">
                    <Label>Pretensão Salarial</Label>
                    <Input
                      value={editedData.salary_expectation || ''}
                      onChange={(e) => setEditedData({ ...editedData, salary_expectation: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {extractedData.skills && extractedData.skills.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold">Habilidades Detectadas</h3>
                    <div className="flex flex-wrap gap-2">
                      {extractedData.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleReject} disabled={processing}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleAccept} disabled={processing}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aceitar e Criar Candidato
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}