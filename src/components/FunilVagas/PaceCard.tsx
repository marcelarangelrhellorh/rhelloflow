import { Gauge, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PaceMetrics } from "@/hooks/usePaceMetrics";
interface PaceCardProps {
  metrics: PaceMetrics;
}
export function PaceCard({
  metrics
}: PaceCardProps) {
  const {
    currentWeekCompleted,
    currentWeekPace,
    lastWeekCompleted,
    lastWeekPace,
    monthCompleted,
    monthPace,
    weekOverWeekChange,
    isLoading
  } = metrics;
  const formatPace = (pace: number) => pace.toFixed(1);
  const renderChangeIndicator = () => {
    if (weekOverWeekChange === null) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    const isPositive = weekOverWeekChange >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? "text-green-600" : "text-red-600";
    return <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(weekOverWeekChange).toFixed(0)}%
      </span>;
  };
  if (isLoading) {
    return <Card className="border-gray-300 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Pace de Fechamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>;
  }
  return <TooltipProvider>
      <Card className="border-gray-300 shadow-md">
        <CardHeader className="pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 cursor-help">
                <Gauge className="h-4 w-4 text-primary" />
                Pace de Fechamento
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                O Pace mede a velocidade de fechamento de vagas. 
                Calculado como: (Vagas Concluídas ÷ Dias Úteis) × 5 = vagas/semana
              </p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Week - Highlighted */}
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted-foreground text-sm font-medium">Esta Semana</span>
              {renderChangeIndicator()}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPace(currentWeekPace)}
              </span>
              <span className="text-muted-foreground text-sm font-medium">vagas/semana</span>
            </div>
            <span className="text-muted-foreground text-sm font-medium">
              {currentWeekCompleted} vaga{currentWeekCompleted !== 1 ? "s" : ""} concluída{currentWeekCompleted !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Last Week */}
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div>
              <span className="text-muted-foreground block text-sm font-semibold">Semana Passada</span>
              <span className="text-muted-foreground text-sm font-medium">
                {lastWeekCompleted} vaga{lastWeekCompleted !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-foreground">
                {formatPace(lastWeekPace)}
              </span>
              <span className="text-muted-foreground ml-1 text-sm font-medium">v/s</span>
            </div>
          </div>

          {/* Current Month */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-muted-foreground block text-sm font-semibold">Este Mês</span>
              <span className="text-muted-foreground text-sm font-medium">
                {monthCompleted} vaga{monthCompleted !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-foreground">
                {formatPace(monthPace)}
              </span>
              <span className="text-muted-foreground ml-1 text-sm font-medium">v/s</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>;
}