import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle2, AlertCircle, Clock, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoLight from "@/assets/logo-rhello-light.png";

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weight: number;
  question_type: string;
  options: Array<{ text: string }> | null;
  display_order: number;
}

interface Answer {
  criteria_id: string;
  score?: number;
  text_answer?: string;
  selected_option_index?: number;
}

interface TestData {
  scorecard: {
    id: string;
    expiresAt: string | null;
  };
  candidate: {
    name: string;
    email: string;
  };
  template: {
    id: string;
    name: string;
    description: string | null;
  };
  job: {
    title: string;
    company: string;
  } | null;
  criteria: Criterion[];
}

const categoryLabels: Record<string, string> = {
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
  experiencia: "Experiência",
  fit_cultural: "Fit Cultural",
  outros: "Outros"
};

const categoryColors: Record<string, string> = {
  hard_skills: "bg-blue-100 text-blue-800 border-blue-200",
  soft_skills: "bg-green-100 text-green-800 border-green-200",
  experiencia: "bg-purple-100 text-purple-800 border-purple-200",
  fit_cultural: "bg-orange-100 text-orange-800 border-orange-200",
  outros: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function TechnicalTestForm() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      loadTest();
    }
  }, [token]);

  async function loadTest() {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase.functions.invoke("get-technical-test", {
        body: { token }
      });

      if (fetchError) throw fetchError;
      
      if (data?.error) {
        setError({
          code: data.code || 'ERROR',
          message: data.error
        });
        return;
      }

      setTestData(data);
      
      // Initialize answers
      const initialAnswers: Record<string, Answer> = {};
      (data.criteria || []).forEach((criterion: Criterion) => {
        initialAnswers[criterion.id] = {
          criteria_id: criterion.id
        };
      });
      setAnswers(initialAnswers);
    } catch (err: any) {
      console.error("Error loading test:", err);
      setError({
        code: 'ERROR',
        message: err.message || 'Erro ao carregar teste'
      });
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(criteriaId: string, field: keyof Answer, value: any) {
    setAnswers(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        [field]: value
      }
    }));
  }

  function getProgress(): number {
    if (!testData) return 0;
    
    let answered = 0;
    testData.criteria.forEach(criterion => {
      const answer = answers[criterion.id];
      if (!answer) return;
      
      switch (criterion.question_type) {
        case 'rating':
          if (answer.score && answer.score > 0) answered++;
          break;
        case 'open_text':
          if (answer.text_answer && answer.text_answer.trim().length > 0) answered++;
          break;
        case 'multiple_choice':
          if (typeof answer.selected_option_index === 'number') answered++;
          break;
      }
    });
    
    return Math.round((answered / testData.criteria.length) * 100);
  }

  function isComplete(): boolean {
    if (!testData) return false;
    
    return testData.criteria.every(criterion => {
      const answer = answers[criterion.id];
      if (!answer) return false;
      
      switch (criterion.question_type) {
        case 'rating':
          return answer.score && answer.score > 0;
        case 'open_text':
          return answer.text_answer && answer.text_answer.trim().length > 0;
        case 'multiple_choice':
          return typeof answer.selected_option_index === 'number';
        default:
          return true;
      }
    });
  }

  async function handleSubmit() {
    if (!isComplete()) {
      toast.error("Por favor, responda todas as perguntas");
      return;
    }

    try {
      setSubmitting(true);
      
      const answersArray = Object.values(answers);
      
      const { data, error: submitError } = await supabase.functions.invoke("submit-technical-test", {
        body: { token, answers: answersArray }
      });

      if (submitError) throw submitError;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      setSubmitted(true);
      setResultScore(data.matchPercentage);
      toast.success("Teste enviado com sucesso!");
    } catch (err: any) {
      console.error("Error submitting test:", err);
      toast.error(err.message || "Erro ao enviar teste");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBF0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando teste...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#FFFBF0] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">
              {error.code === 'EXPIRED' && 'Link Expirado'}
              {error.code === 'ALREADY_SUBMITTED' && 'Teste Já Respondido'}
              {error.code === 'NOT_FOUND' && 'Teste Não Encontrado'}
              {!['EXPIRED', 'ALREADY_SUBMITTED', 'NOT_FOUND'].includes(error.code) && 'Erro'}
            </h2>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FFFBF0] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-6">
            <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Teste Enviado!</h2>
              <p className="text-muted-foreground">
                Obrigado por completar o teste técnico, {testData?.candidate.name}!
              </p>
            </div>
            {resultScore !== null && (
              <div className="bg-muted/30 p-6 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Seu resultado preliminar</p>
                <div className="text-4xl font-bold text-primary">{resultScore}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  * Algumas respostas podem ser avaliadas posteriormente
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              O recrutador será notificado e entrará em contato em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = getProgress();

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <img src={logoLight} alt="RHello" className="h-8" />
            {testData?.scorecard.expiresAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Expira {formatDistanceToNow(new Date(testData.scorecard.expiresAt), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Intro Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{testData?.template.name}</CardTitle>
            {testData?.template.description && (
              <CardDescription>{testData.template.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span>Olá, <strong>{testData?.candidate.name}</strong>!</span>
              {testData?.job && (
                <Badge variant="outline" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {testData.job.title} - {testData.job.company}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Complete o teste abaixo. Todas as perguntas são obrigatórias.
            </p>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {testData?.criteria.map((criterion, index) => (
            <Card key={criterion.id} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">
                      Pergunta {index + 1}/{testData.criteria.length}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", categoryColors[criterion.category])}
                    >
                      {categoryLabels[criterion.category]}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold">{criterion.name}</h3>
                  {criterion.description && (
                    <p className="text-muted-foreground">{criterion.description}</p>
                  )}
                </div>

                {/* Rating Input */}
                {criterion.question_type === 'rating' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sua avaliação</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(score => (
                        <Button
                          key={score}
                          type="button"
                          variant={answers[criterion.id]?.score === score ? "default" : "outline"}
                          size="lg"
                          onClick={() => updateAnswer(criterion.id, 'score', score)}
                          className={cn(
                            "flex-1",
                            answers[criterion.id]?.score === score && 
                              "bg-[#FFCD00] hover:bg-[#FAEC3E] text-[#00141D]"
                          )}
                        >
                          <Star className={cn(
                            "h-5 w-5",
                            answers[criterion.id]?.score && 
                              answers[criterion.id]!.score! >= score && 
                              "fill-current"
                          )} />
                        </Button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Discordo totalmente</span>
                      <span>Concordo totalmente</span>
                    </div>
                  </div>
                )}

                {/* Open Text Input */}
                {criterion.question_type === 'open_text' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sua resposta</Label>
                    <Textarea
                      value={answers[criterion.id]?.text_answer || ''}
                      onChange={(e) => updateAnswer(criterion.id, 'text_answer', e.target.value)}
                      placeholder="Digite sua resposta aqui..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                )}

                {/* Multiple Choice Input */}
                {criterion.question_type === 'multiple_choice' && criterion.options && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selecione uma opção</Label>
                    <RadioGroup
                      value={
                        typeof answers[criterion.id]?.selected_option_index === 'number'
                          ? String(answers[criterion.id].selected_option_index)
                          : undefined
                      }
                      onValueChange={(value) => 
                        updateAnswer(criterion.id, 'selected_option_index', parseInt(value))
                      }
                    >
                      {criterion.options.map((option, optIndex) => (
                        <div 
                          key={optIndex}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                            answers[criterion.id]?.selected_option_index === optIndex
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <RadioGroupItem 
                            value={String(optIndex)} 
                            id={`${criterion.id}-${optIndex}`} 
                          />
                          <Label 
                            htmlFor={`${criterion.id}-${optIndex}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isComplete()}
            size="lg"
            className="w-full text-lg font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Enviar Respostas
              </>
            )}
          </Button>
          
          {!isComplete() && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              <AlertCircle className="inline h-4 w-4 mr-1" />
              Responda todas as perguntas para enviar
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
