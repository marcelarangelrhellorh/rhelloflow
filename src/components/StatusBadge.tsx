import { Badge } from "@/components/ui/badge";

type StatusType = "active" | "pending" | "cancelled" | "completed";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
}

export function StatusBadge({ status, type = "pending" }: StatusBadgeProps) {
  const variants: Record<StatusType, string> = {
    active: "bg-success/10 text-success hover:bg-success/20 border-success/20",
    pending: "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20",
    cancelled: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
    completed: "bg-info/10 text-info hover:bg-info/20 border-info/20",
  };

  return (
    <Badge variant="outline" className={variants[type]}>
      {status}
    </Badge>
  );
}
