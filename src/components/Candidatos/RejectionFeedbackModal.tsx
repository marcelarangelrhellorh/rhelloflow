import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, X } from "lucide-react";

interface RejectionFeedbackModalProps {
  open: boolean;
  onConfirm: (gaveFeedback: boolean) => void;
  candidateName: string;
  jobTitle?: string;
}

export function RejectionFeedbackModal({
  open,
  onConfirm,
  candidateName,
  jobTitle,
}: RejectionFeedbackModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirmação de Retorno
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Você já deu retorno/negativa para{" "}
            <span className="font-semibold text-foreground">{candidateName}</span>
            {jobTitle && (
              <>
                {" "}sobre a vaga{" "}
                <span className="font-semibold text-foreground">{jobTitle}</span>
              </>
            )}
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Isso nos ajuda a acompanhar candidatos que ainda precisam receber uma resposta.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={() => onConfirm(true)}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Check className="mr-2 h-4 w-4" />
            Sim, já dei retorno
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Não ainda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
