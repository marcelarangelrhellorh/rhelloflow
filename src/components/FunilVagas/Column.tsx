import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JobCard } from "./JobCard";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel?: string | null;
  status: string; // Legado
  status_slug: string; // Novo campo padronizado
  status_order: number; // Ordem no funil
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
  confidencial?: boolean | null;
}

interface ColumnProps {
  stage: {
    id: string;
    slug: string;
    name: string;
    order: number;
    kind: "normal" | "final" | "frozen" | "paused" | "canceled";
    color: {
      bg: string;
      text: string;
      columnBg: string;
    };
  };
  jobs: Vaga[];
  progresso: (statusSlug: string) => number;
  onJobClick: (jobId: string) => void;
  onJobEdit: (jobId: string) => void;
  onJobMoveStage: (jobId: string) => void;
  onJobDuplicate: (jobId: string) => void;
  onJobClose: (jobId: string) => void;
}

export function Column({ 
  stage, 
  jobs, 
  progresso,
  onJobClick, 
  onJobEdit, 
  onJobMoveStage,
  onJobDuplicate,
  onJobClose
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.slug, // Use stage slug as droppable ID
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[320px] h-full rounded-lg transition-all duration-200",
        "border border-gray-200 shadow-sm bg-white",
        isOver && "border-2 border-[#FFCD00] ring-2 ring-[#FFCD00]/20"
      )}
      style={{ backgroundColor: stage.color.columnBg }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm rounded-t-lg">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stage.color.text }}
          />
          <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
        </div>
        <Badge
          variant="secondary"
          className="text-xs font-medium"
          style={{
            backgroundColor: stage.color.bg,
            color: stage.color.text,
          }}
        >
          {jobs.length}
        </Badge>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Nenhuma vaga nesta etapa
            </div>
          ) : (
            jobs.map((vaga) => (
              <JobCard
                key={vaga.id}
                vaga={vaga}
                stageColor={stage.color}
                diasEmAberto={getBusinessDaysFromNow(vaga.criado_em || "")}
                progresso={progresso(vaga.status_slug)}
                onDragStart={() => {}}
                onView={() => onJobClick(vaga.id)}
                onEdit={() => onJobEdit(vaga.id)}
                onDuplicate={() => onJobDuplicate(vaga.id)}
                onClose={() => onJobClose(vaga.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
