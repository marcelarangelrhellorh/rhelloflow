import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Column } from "./Column";
import { JobCard } from "./JobCard";
import { getBusinessDaysFromNow } from "@/lib/dateUtils";

interface Vaga {
  id: string;
  titulo: string;
  empresa: string;
  recrutador: string | null;
  cs_responsavel?: string | null;
  status: string;
  prioridade: string | null;
  criado_em: string | null;
  candidatos_count?: number;
  confidencial?: boolean | null;
}

interface Stage {
  id: string;
  name: string;
  color: {
    bg: string;
    text: string;
    columnBg: string;
  };
}

interface PipelineBoardProps {
  jobs: Vaga[];
  stages: Stage[];
  progresso: (status: string) => number;
  onJobMove: (jobId: string, fromStage: string, toStage: string) => Promise<void>;
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
  onJobClose,
}: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getJobsByStage = (stageName: string) => {
    return jobs.filter((job) => job.status === stageName);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeJob = jobs.find((j) => j.id === active.id);
    const overStage = stages.find((s) => s.id === over.id);

    if (activeJob && overStage && activeJob.status !== overStage.name) {
      await onJobMove(activeJob.id, activeJob.status, overStage.name);
    }

    setActiveId(null);
  };

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;
  const activeStage = activeJob ? stages.find((s) => s.name === activeJob.status) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            jobs={getJobsByStage(stage.name)}
            progresso={progresso}
            onJobClick={onJobClick}
            onJobEdit={onJobEdit}
            onJobMoveStage={onJobMoveStage}
            onJobDuplicate={onJobDuplicate}
            onJobClose={onJobClose}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob && activeStage ? (
          <div className="rotate-3 w-[320px]">
            <JobCard
              vaga={activeJob}
              stageColor={activeStage.color}
              diasEmAberto={getBusinessDaysFromNow(activeJob.criado_em || "")}
              progresso={progresso(activeJob.status)}
              onDragStart={() => {}}
              onView={() => {}}
              onEdit={() => {}}
              onDuplicate={() => {}}
              onClose={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
