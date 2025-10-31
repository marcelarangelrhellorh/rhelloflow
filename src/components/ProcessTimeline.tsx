import { Check, Circle } from "lucide-react";

interface TimelineStep {
  label: string;
  dates?: string;
  status: "completed" | "current" | "pending";
}

interface ProcessTimelineProps {
  steps: TimelineStep[];
}

export function ProcessTimeline({ steps }: ProcessTimelineProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center relative flex-1">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div 
                className={`absolute top-5 left-1/2 w-full h-1 ${
                  step.status === "completed" ? "bg-primary" : "bg-muted"
                }`}
                style={{ zIndex: 0 }}
              />
            )}
            
            {/* Step Circle */}
            <div className="relative z-10 mb-2">
              {step.status === "completed" && (
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              {step.status === "current" && (
                <div className="h-10 w-10 rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center">
                  <Circle className="h-4 w-4 text-primary fill-primary" />
                </div>
              )}
              {step.status === "pending" && (
                <div className="h-10 w-10 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Step Label */}
            <div className="text-center">
              <p className={`text-sm font-medium ${
                step.status === "pending" ? "text-muted-foreground" : "text-foreground"
              }`}>
                {step.label}
              </p>
              {step.dates && (
                <p className="text-xs text-muted-foreground mt-1">{step.dates}</p>
              )}
              {step.status === "current" && (
                <p className="text-xs text-primary mt-1 font-medium">Em Progresso</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
