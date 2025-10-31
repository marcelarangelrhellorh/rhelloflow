import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const RECRUTADORES = ["Ítalo", "Bianca Marques", "Victor", "Mariana", "Isabella"];

export default function CandidatoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vagas, setVagas] = useState<{ id: string; titulo: string }[]>([]);
  const [curriculoFile, setCurriculoFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    linkedin: "",
    curriculo_url: "",
    portfolio_url: "",
    nivel: "",
    area: "",
    recrutador: "",
    vaga_relacionada_id: "",
    pretensao_salarial: "",
    disponibilidade_mudanca: "",
    pontos_fortes: "",
    pontos_desenvolver: "",
    parecer_final: "",
    status: "Banco de Talentos",
    feedback: "",
  });

  useEffect(() => {
    loadVagas();
    if (id) {
      loadCandidato();
    }
  }, [id]);

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
    }
  };

  const loadCandidato = async () => {
    try {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          nome_completo: data.nome_completo || "",
          email: data.email || "",
          telefone: data.telefone || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          linkedin: data.linkedin || "",
          curriculo_url: data.curriculo_url || "",
          portfolio_url: data.portfolio_url || "",
          nivel: data.nivel || "",
          area: data.area || "",
          recrutador: data.recrutador || "",
          vaga_relacionada_id: data.vaga_relacionada_id || "",
          pretensao_salarial: data.pretensao_salarial 
            ? `R$ ${data.pretensao_salarial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "",
          disponibilidade_mudanca: data.disponibilidade_mudanca || "",
          pontos_fortes: data.pontos_fortes || "",
          pontos_desenvolver: data.pontos_desenvolver || "",
          parecer_final: data.parecer_final || "",
          status: data.status || "Banco de Talentos",
          feedback: data.feedback || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar candidato:", error);
      toast.error("Erro ao carregar candidato");
    }
  };

  const uploadFile = async (file: File, bucket: string, candidatoId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidatoId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required file
    if (!id && !curriculoFile && !formData.curriculo_url) {
      toast.error("É obrigatório anexar um currículo");
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      let curriculoUrl = formData.curriculo_url;
      let portfolioUrl = formData.portfolio_url;

      // If this is a new candidate, insert first to get the ID
      let candidatoId = id;
      
      if (!id) {
        const { data: newCandidato, error: insertError } = await supabase
          .from("candidatos")
          .insert([{
            nome_completo: formData.nome_completo,
            email: formData.email,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        candidatoId = newCandidato.id;
      }

      // Upload curriculo if new file selected
      if (curriculoFile && candidatoId) {
        try {
          curriculoUrl = await uploadFile(curriculoFile, 'curriculos', candidatoId);
        } catch (error) {
          console.error("Erro ao fazer upload do currículo:", error);
          toast.error("Erro ao fazer upload do currículo");
          throw error;
        }
      }

      // Upload portfolio if new file selected
      if (portfolioFile && candidatoId) {
        try {
          portfolioUrl = await uploadFile(portfolioFile, 'portfolios', candidatoId);
        } catch (error) {
          console.error("Erro ao fazer upload do portfólio:", error);
          toast.error("Erro ao fazer upload do portfólio");
          throw error;
        }
      }

      const dataToSave = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        telefone: formData.telefone || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        linkedin: formData.linkedin || null,
        curriculo_url: curriculoUrl || null,
        portfolio_url: portfolioUrl || null,
        nivel: (formData.nivel || null) as any,
        area: (formData.area || null) as any,
        recrutador: formData.recrutador || null,
        vaga_relacionada_id: formData.vaga_relacionada_id || null,
        pretensao_salarial: formData.pretensao_salarial 
          ? parseFloat(formData.pretensao_salarial.replace(/[R$\s.]/g, '').replace(',', '.'))
          : null,
        disponibilidade_mudanca: formData.disponibilidade_mudanca || null,
        pontos_fortes: formData.pontos_fortes || null,
        pontos_desenvolver: formData.pontos_desenvolver || null,
        parecer_final: formData.parecer_final || null,
        status: formData.status as any,
        feedback: formData.feedback || null,
      };

      const { error } = await supabase
        .from("candidatos")
        .update(dataToSave)
        .eq("id", candidatoId!);

      if (error) throw error;
      
      toast.success(id ? "Candidato atualizado com sucesso!" : "Candidato criado com sucesso!");
      navigate("/candidatos");
    } catch (error) {
      console.error("Erro ao salvar candidato:", error);
      toast.error("Erro ao salvar candidato");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleCurriculoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10485760) {
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }
      // Validate file type
      const allowedTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg'
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato de arquivo não permitido. Use PDF, DOC, DOCX, PNG ou JPG.");
        return;
      }
      setCurriculoFile(file);
    }
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10485760) {
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato de arquivo não permitido. Use PDF, PNG, JPG ou PPTX.");
        return;
      }
      setPortfolioFile(file);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/candidatos")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">{id ? "Editar Candidato" : "Novo Candidato"}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  required
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    placeholder="SP"
                    maxLength={2}
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="curriculo">Anexar Currículo *</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="curriculo"
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleCurriculoChange}
                      className="cursor-pointer"
                      disabled={uploading}
                    />
                    {curriculoFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurriculoFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {curriculoFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{curriculoFile.name}</span>
                    </div>
                  )}
                  {formData.curriculo_url && !curriculoFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Currículo anexado anteriormente</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PDF, DOC, DOCX, PNG, JPG (máx. 10MB)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="portfolio">Anexar Portfólio (opcional)</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="portfolio"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.pptx"
                      onChange={handlePortfolioChange}
                      className="cursor-pointer"
                      disabled={uploading}
                    />
                    {portfolioFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPortfolioFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {portfolioFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{portfolioFile.name}</span>
                    </div>
                  )}
                  {formData.portfolio_url && !portfolioFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Portfólio anexado anteriormente</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PDF, PNG, JPG, PPTX (máx. 10MB)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="disponibilidade_mudanca">
                  Disponibilidade para Mudança *
                </Label>
                <Select 
                  value={formData.disponibilidade_mudanca} 
                  onValueChange={(value) => setFormData({ ...formData, disponibilidade_mudanca: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="A combinar">A combinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Profissionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nivel">Nível</Label>
                  <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.nivel_candidato.map((nivel) => (
                        <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="area">Área</Label>
                  <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.area_candidato.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="pretensao_salarial">Pretensão Salarial (R$)</Label>
                <Input
                  id="pretensao_salarial"
                  type="text"
                  placeholder="R$ 0,00"
                  value={formData.pretensao_salarial}
                  onChange={(e) => {
                    // Remove tudo exceto números
                    const value = e.target.value.replace(/\D/g, '');
                    
                    if (value === '') {
                      setFormData({ ...formData, pretensao_salarial: '' });
                      return;
                    }
                    
                    // Converte para número e formata
                    const numericValue = parseInt(value) / 100;
                    const formatted = numericValue.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });
                    
                    setFormData({ ...formData, pretensao_salarial: `R$ ${formatted}` });
                  }}
                  onBlur={(e) => {
                    // Garante formatação ao perder o foco
                    if (e.target.value && !e.target.value.startsWith('R$ ')) {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value) {
                        const numericValue = parseInt(value) / 100;
                        const formatted = numericValue.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                        setFormData({ ...formData, pretensao_salarial: `R$ ${formatted}` });
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite apenas números. Ex: 5000 = R$ 5.000,00
                </p>
              </div>

              <div>
                <Label htmlFor="recrutador">Recrutador</Label>
                <Select value={formData.recrutador} onValueChange={(value) => setFormData({ ...formData, recrutador: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um recrutador" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECRUTADORES.map((rec) => (
                      <SelectItem key={rec} value={rec}>{rec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vaga_relacionada_id">Vaga Relacionada</Label>
                <Select value={formData.vaga_relacionada_id} onValueChange={(value) => setFormData({ ...formData, vaga_relacionada_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma vaga (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {vagas.map((vaga) => (
                      <SelectItem key={vaga.id} value={vaga.id}>{vaga.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pontos_fortes">Pontos Fortes</Label>
                <Textarea
                  id="pontos_fortes"
                  rows={3}
                  maxLength={500}
                  placeholder="Descreva os pontos fortes do candidato..."
                  value={formData.pontos_fortes}
                  onChange={(e) => setFormData({ ...formData, pontos_fortes: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.pontos_fortes.length}/500 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="pontos_desenvolver">Pontos a Desenvolver</Label>
                <Textarea
                  id="pontos_desenvolver"
                  rows={3}
                  maxLength={500}
                  placeholder="Descreva os pontos que o candidato precisa desenvolver..."
                  value={formData.pontos_desenvolver}
                  onChange={(e) => setFormData({ ...formData, pontos_desenvolver: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.pontos_desenvolver.length}/500 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="parecer_final">Parecer Final</Label>
                <Textarea
                  id="parecer_final"
                  rows={4}
                  maxLength={500}
                  placeholder="Parecer final sobre o candidato..."
                  value={formData.parecer_final}
                  onChange={(e) => setFormData({ ...formData, parecer_final: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.parecer_final.length}/500 caracteres
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status e Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.status_candidato.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  rows={4}
                  placeholder="Observações sobre o candidato..."
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Fazendo upload...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Salvando..." : "Salvar Candidato"}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/candidatos")} disabled={uploading}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
