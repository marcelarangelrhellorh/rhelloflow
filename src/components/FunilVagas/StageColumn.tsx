import { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StageColumnProps {
  status: string;
  count: number;
  colorClass: string;
  children: ReactNode;
  isOver?: boolean;
  onDragOver?: () => void;
  onDragLeave?: () => void;
}

export function StageColumn({
  status,
  count,
  colorClass,
  children,
  isOver,
  onDragOver,
  onDragLeave,
}: StageColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[320px] h-full rounded-lg transition-all duration-200",
        "border border-gray-200 shadow-sm bg-white",
        isOver && "border-2 border-[#FFCD00] ring-2 ring-[#FFCD00]/20"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm rounded-t-lg">
        <h3 className="font-semibold text-sm text-foreground">{status}</h3>
        <Badge
          variant="secondary"
          className={cn("text-xs font-medium", colorClass)}
        >
          {count}
        </Badge>
      </div>

      {/* Column Content */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver?.();
        }}
        onDragLeave={() => {
          onDragLeave?.();
        }}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {children}
      </div>
    </div>
  );
}
