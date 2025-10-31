import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare } from "lucide-react";

interface Feedback {
  id: string;
  tipo: "interno" | "cliente";
  autor: string;
  conteudo: string;
  data: string;
  sentimento?: "positivo" | "negativo" | "neutro";
}

interface FeedbackListProps {
  feedbacks: Feedback[];
  onAddFeedback: () => void;
}

const sentimentoColors = {
  positivo: "bg-success/10 text-success border-success/20",
  negativo: "bg-destructive/10 text-destructive border-destructive/20",
  neutro: "bg-muted/10 text-muted-foreground border-muted",
};

const sentimentoIcons = {
  positivo: "💬",
  negativo: "📋",
  neutro: "💬",
};

export function FeedbackList({ feedbacks, onAddFeedback }: FeedbackListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Feedbacks</CardTitle>
          <Button onClick={onAddFeedback} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Feedback
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted/20 p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum feedback registrado ainda
            </p>
            <Button onClick={onAddFeedback} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Feedback
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        feedback.sentimento
                          ? sentimentoColors[feedback.sentimento]
                          : sentimentoColors.neutro
                      }
                    >
                      {feedback.sentimento
                        ? sentimentoIcons[feedback.sentimento]
                        : sentimentoIcons.neutro}{" "}
                      {feedback.tipo === "interno" ? "Interno" : "Cliente"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(feedback.data)}
                  </span>
                </div>

                <p className="text-sm font-medium text-card-foreground mb-1">
                  {feedback.autor}
                </p>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {feedback.conteudo}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
