import { FileText, UserCheck, UserPlus, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface Activity {
  id: string;
  type: "offer" | "status_change" | "candidate_added" | "process_started";
  description: string;
  date: string;
}

interface ActivityLogProps {
  activities: Activity[];
}

const activityIcons = {
  offer: FileText,
  status_change: UserCheck,
  candidate_added: UserPlus,
  process_started: Briefcase,
};

const activityIconColors = {
  offer: "bg-success/10 text-success",
  status_change: "bg-info/10 text-info",
  candidate_added: "bg-primary/10 text-primary",
  process_started: "bg-muted text-muted-foreground",
};

export function ActivityLog({ activities }: ActivityLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
        ) : (
          activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            const colorClass = activityIconColors[activity.type];
            
            return (
              <div key={activity.id} className="flex gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
