import { useState } from "react";
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Column } from "./Column";
import { JobCard } from "./JobCard";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";
import { DualScrollContainer } from "@/components/ui/dual-scroll-container";
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
  dias_etapa_atual?: number; // Dias úteis na etapa atual
}
interface Stage {
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
}
interface PipelineBoardProps {
  jobs: Vaga[];
  stages: Stage[];
  progresso: (statusSlug: string) => number;
  onJobMove: (jobId: string, fromSlug: string, toSlug: string) => Promise<void>;
  onJobClick: (jobId: string) => void;
  onJobEdit: (jobId: string) => void;
  onJobMoveStage: (jobId: string) => void;
  onJobDuplicate: (jobId: string) => void;
  onJobClose: (jobId: string) => void;
}
export function PipelineBoard({
  jobs,
  stages,
  progresso,
  onJobMove,
  onJobClick,
  onJobEdit,
  onJobMoveStage,
  onJobDuplicate,
  onJobClose
}: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const getJobsByStage = (stageSlug: string) => {
    return jobs.filter(job => job.status_slug === stageSlug);
  };
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (!over) {
      setActiveId(null);
      return;
    }
    const activeJob = jobs.find(j => j.id === active.id);
    const overStage = stages.find(s => s.slug === over.id);
    if (activeJob && overStage && activeJob.status_slug !== overStage.slug) {
      await onJobMove(activeJob.id, activeJob.status_slug, overStage.slug);
    }
    setActiveId(null);
  };
  const activeJob = activeId ? jobs.find(j => j.id === activeId) : null;
  const activeStage = activeJob ? stages.find(s => s.slug === activeJob.status_slug) : null;
  return <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <DualScrollContainer>
        <div style={{
        minWidth: 'max-content'
      }} className="flex gap-4 pb-4 bg-transparent">
          {stages.map(stage => <Column key={stage.id} stage={stage} jobs={getJobsByStage(stage.slug)} progresso={progresso} onJobClick={onJobClick} onJobEdit={onJobEdit} onJobMoveStage={onJobMoveStage} onJobDuplicate={onJobDuplicate} onJobClose={onJobClose} />)}
        </div>
      </DualScrollContainer>

      <DragOverlay>
        {activeJob && activeStage ? <div className="w-[320px]">
            <JobCard vaga={activeJob} stageColor={activeStage.color} diasEmAberto={getBusinessDaysFromNow(activeJob.criado_em || "")} diasEtapaAtual={activeJob.dias_etapa_atual || 0} progresso={progresso(activeJob.status_slug)} onDragStart={() => {}} onView={() => {}} onEdit={() => {}} onDuplicate={() => {}} onClose={() => {}} isDragging />
          </div> : null}
      </DragOverlay>
    </DndContext>;
}