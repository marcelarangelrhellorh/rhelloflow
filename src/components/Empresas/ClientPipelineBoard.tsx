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
import { CLIENT_STAGES, ClientStage } from "@/lib/clientStages";
import { ClientPipelineColumn } from "./ClientPipelineColumn";
import { ClientFunnelCard } from "./ClientFunnelCard";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  setor: string | null;
  porte: string | null;
  status: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
  data_primeiro_contato: string | null;
  pipeline_stage?: string | null;
}

interface ClientPipelineBoardProps {
  empresas: Empresa[];
  onClientClick: (empresa: Empresa) => void;
  onClientMove: (empresaId: string, fromSlug: string, toSlug: string) => Promise<void>;
}

export function ClientPipelineBoard({
  empresas,
  onClientClick,
  onClientMove,
}: ClientPipelineBoardProps) {
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

  const getEmpresasByStage = (stageSlug: string) => {
    return empresas.filter((empresa) => {
      const currentStage = empresa.pipeline_stage || "novo_negocio";
      return currentStage === stageSlug;
    });
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

    const activeEmpresa = empresas.find((e) => e.id === active.id);
    const overStage = CLIENT_STAGES.find((s) => s.slug === over.id);

    if (activeEmpresa && overStage) {
      const currentStage = activeEmpresa.pipeline_stage || "novo_negocio";
      if (currentStage !== overStage.slug) {
        await onClientMove(activeEmpresa.id, currentStage, overStage.slug);
      }
    }

    setActiveId(null);
  };

  const activeEmpresa = activeId ? empresas.find((e) => e.id === activeId) : null;
  const activeStage = activeEmpresa
    ? CLIENT_STAGES.find((s) => s.slug === (activeEmpresa.pipeline_stage || "novo_negocio"))
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-3 overflow-x-auto pb-4"
        style={{ minWidth: "max-content" }}
      >
        {CLIENT_STAGES.map((stage) => (
          <ClientPipelineColumn
            key={stage.id}
            stage={stage}
            empresas={getEmpresasByStage(stage.slug)}
            onClientClick={onClientClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeEmpresa && activeStage ? (
          <div className="w-[280px]">
            <ClientFunnelCard
              empresa={activeEmpresa}
              stageColor={activeStage.color}
              onClick={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
