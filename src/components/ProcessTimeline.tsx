import { Check } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <ScrollArea className="w-full">
        <div className="relative min-w-max pb-2">
          <div className="flex items-center gap-8 px-4">
            {steps.map((step, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div 
                    id={step.status === "current" ? "current-step" : undefined}
                    className="relative flex flex-col items-center min-w-[140px]"
                    style={{ opacity: step.status === "pending" ? 0.5 : 1 }}
                  >
                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div 
                        className="absolute left-1/2 top-[20px] h-[2px] w-[calc(100%+32px)] -translate-y-1/2"
                        style={{
                          backgroundColor: step.status === "completed" ? "hsl(var(--primary))" : "hsl(var(--border))",
                          zIndex: 0
                        }}
                      />
                    )}
                    
                    {/* Step Circle */}
                    <div className="relative z-10 mb-3">
                      {step.status === "completed" && (
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                      {step.status === "current" && (
                        <div className="h-10 w-10 rounded-full bg-background border-4 border-primary flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
                        </div>
                      )}
                      {step.status === "pending" && (
                        <div className="h-10 w-10 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="text-center">
                      <p className={`text-xs font-semibold whitespace-nowrap ${
                        step.status === "pending" ? "text-muted-foreground" : "text-foreground"
                      }`}>
                        {step.label}
                      </p>
                      {step.dates && (
                        <p className="text-[10px] text-muted-foreground mt-1">{step.dates}</p>
                      )}
                      {step.status === "current" && (
                        <p className="text-[10px] text-primary mt-1 font-medium">Em Progresso</p>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{step.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </TooltipProvider>
  );
}
