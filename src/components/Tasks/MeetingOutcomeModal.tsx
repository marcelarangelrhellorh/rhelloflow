import React, { memo } from "react";
import { CheckCircle2, XCircle, UserX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MeetingOutcome = 'completed' | 'cancelled' | 'no_show';

interface MeetingOutcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (outcome: MeetingOutcome) => void;
  isLoading?: boolean;
}

const outcomeOptions: {
  value: MeetingOutcome;
  label: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}[] = [
  {
    value: 'completed',
    label: 'Concluída',
    description: 'A reunião aconteceu conforme planejado',
    icon: CheckCircle2,
    colorClass: 'text-green-600',
    bgClass: 'hover:bg-green-50 border-green-200 hover:border-green-400',
  },
  {
    value: 'cancelled',
    label: 'Cancelada',
    description: 'A reunião foi cancelada',
    icon: XCircle,
    colorClass: 'text-orange-600',
    bgClass: 'hover:bg-orange-50 border-orange-200 hover:border-orange-400',
  },
  {
    value: 'no_show',
    label: 'Não compareceu',
    description: 'Participante não compareceu à reunião',
    icon: UserX,
    colorClass: 'text-red-600',
    bgClass: 'hover:bg-red-50 border-red-200 hover:border-red-400',
  },
];

const MeetingOutcomeModal = memo(function MeetingOutcomeModal({
  open,
  onOpenChange,
  onSelect,
  isLoading = false,
}: MeetingOutcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como foi a reunião?</DialogTitle>
          <DialogDescription>
            Selecione o resultado da reunião para registro
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {outcomeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant="outline"
                className={cn(
                  "h-auto p-4 justify-start gap-4 border-2 transition-all",
                  option.bgClass
                )}
                onClick={() => onSelect(option.value)}
                disabled={isLoading}
              >
                <Icon className={cn("h-8 w-8", option.colorClass)} />
                <div className="text-left">
                  <div className={cn("font-semibold", option.colorClass)}>
                    {option.label}
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {option.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default MeetingOutcomeModal;

// Badge component for displaying meeting outcome
export const MeetingOutcomeBadge = memo(function MeetingOutcomeBadge({ 
  outcome 
}: { 
  outcome: MeetingOutcome | null 
}) {
  if (!outcome) return null;

  const config = {
    completed: {
      label: 'Concluída',
      className: 'bg-green-100 text-green-800',
    },
    cancelled: {
      label: 'Cancelada',
      className: 'bg-orange-100 text-orange-800',
    },
    no_show: {
      label: 'Não compareceu',
      className: 'bg-red-100 text-red-800',
    },
  };

  const { label, className } = config[outcome];

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", className)}>
      {label}
    </span>
  );
});
