import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, FileText, Table, Award, Briefcase } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ComparisonResultProps {
  result: {
    summary: string;
    table_markdown: string;
    detailed_justification: string;
    recommended_role: string;
    suggested_job_title: string;
    short_briefing: string[];
    selected_roles: Array<{
      role_id: string;
      title_pt: string;
      category: string;
      seniority_levels: string[];
      demand_trend: string;
    }>;
  };
}

export function ComparisonResult({ result }: ComparisonResultProps) {
  const recommendedRole = result.selected_roles.find(
    (r) => r.role_id === result.recommended_role
  );

  return (
    <div className="space-y-4">
      {/* Recommended Role Card */}
      <Card className="border-primary border-2 shadow-lg bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            Cargo Recomendado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {recommendedRole?.title_pt || result.recommended_role}
              </h3>
              {recommendedRole && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{recommendedRole.category}</Badge>
                  <Badge variant="outline">Demanda: {recommendedRole.demand_trend}</Badge>
                </div>
              )}
            </div>
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <Separator className="my-3" />
          <div className="bg-background rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">Resumo Executivo</p>
            <p className="text-foreground">{result.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Job Title */}
      <Card className="border-gray-300 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Título Sugerido da Vaga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold text-foreground">
            {result.suggested_job_title}
          </p>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Briefing da Posição:</p>
            <ul className="space-y-2">
              {result.short_briefing.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Details */}
      <Accordion type="single" collapsible className="space-y-2">
        {/* Comparative Table */}
        <AccordionItem value="table" className="border rounded-lg px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              <span className="font-medium">Tabela Comparativa</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto -mx-4 px-4">
              <ReactMarkdown
                components={{
                  table: ({ children }) => (
                    <table className="min-w-full border-collapse text-xs">
                      {children}
                    </table>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted">{children}</thead>
                  ),
                  tr: ({ children }) => (
                    <tr className="border-b border-gray-200">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-200 px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-200 px-3 py-2.5 text-muted-foreground">
                      {children}
                    </td>
                  ),
                }}
              >
                {result.table_markdown}
              </ReactMarkdown>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Detailed Justification */}
        <AccordionItem value="justification" className="border rounded-lg px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">Justificativa Detalhada</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="prose prose-sm max-w-none">
              {result.detailed_justification.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-3 text-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Selected Roles Summary */}
      <Card className="border-gray-300 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Cargos Analisados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.selected_roles.map((role) => (
              <Badge
                key={role.role_id}
                variant={role.role_id === result.recommended_role ? "default" : "outline"}
              >
                {role.title_pt}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
