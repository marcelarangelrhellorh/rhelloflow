import { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StageColumnProps {
  status: string;
  count: number;
  colorClass: string;
  icon: string;
  children: ReactNode;
  isOver?: boolean;
  onDragOver?: () => void;
  onDragLeave?: () => void;
}

export function StageColumn({
  status,
  count,
  colorClass,
  icon,
  children,
  isOver,
  onDragOver,
  onDragLeave,
}: StageColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div className="flex flex-col w-[300px] flex-shrink-0">
      {/* Column Header */}
      <div className="mb-3 pb-3 border-b border-border sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground line-clamp-1 flex items-center gap-1">
            <span>{icon}</span>
            <span>{status}</span>
          </h3>
          <Badge className={cn("text-xs font-medium", colorClass)}>
            {count}
          </Badge>
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver?.();
        }}
        onDragLeave={() => {
          onDragLeave?.();
        }}
        className={cn(
          "flex-1 bg-muted/20 rounded-lg p-3 min-h-[600px] space-y-3 transition-all duration-200",
          isOver && "ring-2 ring-primary bg-primary/5"
        )}
      >
        {children}
      </div>
    </div>
  );
}
