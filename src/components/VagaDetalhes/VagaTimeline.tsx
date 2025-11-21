import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { JOB_STAGES } from "@/lib/jobStages";
interface TimelineStep {
  label: string;
  dates: string;
  status: "completed" | "current" | "pending";
  color: {
    bg: string;
    text: string;
    columnBg: string;
  };
}
interface VagaTimelineProps {
  currentStatusSlug: string;
  progress: number;
}
export function VagaTimeline({
  currentStatusSlug,
  progress
}: VagaTimelineProps) {
  const getTimelineSteps = (statusSlug: string): TimelineStep[] => {
    const currentStage = JOB_STAGES.find(s => s.slug === statusSlug);
    const currentIndex = currentStage ? currentStage.order - 1 : 0;
    return JOB_STAGES.map(stage => ({
      label: stage.name,
      dates: "",
      status: stage.order - 1 < currentIndex ? "completed" : stage.order - 1 === currentIndex ? "current" : "pending",
      color: stage.color
    }));
  };
  const timelineSteps = getTimelineSteps(currentStatusSlug);
  return <div className="mb-12">
      <h2 className="text-primary-text-light dark:text-primary-text-dark text-2xl font-bold tracking-tight mb-6">
        Linha do Tempo do Processo
      </h2>

      <TooltipProvider>
        <ScrollArea className="w-full">
          <div className="relative min-w-max pb-2">
            <div className="flex items-center gap-8 px-4">
              {timelineSteps.map((step, index) => <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div id={step.status === "current" ? "current-step" : undefined} className="relative flex flex-col items-center min-w-[140px]" style={{
                  opacity: step.status === "pending" ? 0.5 : 1
                }}>
                      {/* Connector Line */}
                      {index < timelineSteps.length - 1 && <div className="absolute left-1/2 top-[20px] h-[2px] w-[calc(100%+32px)] -translate-y-1/2" style={{
                    backgroundColor: step.status === "completed" ? "#ffcd00" : "#E5E7EB",
                    zIndex: 0
                  }} />}

                      {/* Step Circle */}
                      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all mb-3" style={{
                    backgroundColor: step.status === "pending" ? "#D1D5DB" : step.status === "current" ? "#ffffff" : "#ffcd00",
                    border: step.status === "current" ? "3px solid #ffcd00" : "none"
                  }}>
                        {step.status === "completed" && <span className="material-symbols-outlined text-xl" style={{
                      color: "#00141D"
                    }}>
                            check
                          </span>}
                        {step.status === "current" && <div className="h-4 w-4 rounded-full animate-pulse" style={{
                      backgroundColor: "#ffcd00"
                    }} />}
                      </div>

                      {/* Step Label */}
                      <p className={`text-center text-sm font-semibold whitespace-nowrap ${step.status === "current" ? "text-[#00141D]" : step.status === "pending" ? "text-[#9CA3AF]" : "text-[#00141D]"}`}>
                        {step.label}
                      </p>

                      {step.status === "current" && <p className="text-[#ffcd00] mt-1 text-sm font-semibold">Em Progresso</p>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{step.label}</p>
                  </TooltipContent>
                </Tooltip>)}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </TooltipProvider>

      {/* Progress Indicator */}
      <div className="mt-4 px-4">
        <div className="flex items-center justify-between text-xs text-secondary-text-light dark:text-secondary-text-dark mb-1">
          <span className="text-base font-semibold">Progresso</span>
          <span className="font-semibold text-base">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" indicatorClassName="bg-[#ffcd00]" />
      </div>
    </div>;
}