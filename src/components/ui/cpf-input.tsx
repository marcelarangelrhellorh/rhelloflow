import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCPF, validateCPF, cleanCPF } from "@/lib/cpfUtils";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  showValidation?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CPFInput({
  value,
  onChange,
  error,
  required = true,
  showValidation = true,
  label = "CPF",
  placeholder = "000.000.000-00",
  disabled = false,
  className,
}: CPFInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCPF(rawValue);
    // Limita a 14 caracteres (formato completo com pontos e hífen)
    if (formatted.length <= 14) {
      onChange(formatted);
    }
  };

  const isComplete = cleanCPF(value).length === 11;
  const isValid = isComplete && validateCPF(value);
  const showStatus = showValidation && isComplete;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="cpf">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id="cpf"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            showStatus && !isValid && "border-destructive focus-visible:ring-destructive",
            showStatus && isValid && "border-green-500 focus-visible:ring-green-500",
            "pr-10"
          )}
        />
        {showStatus && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {showStatus && !isValid && !error && (
        <p className="text-sm text-destructive">CPF inválido</p>
      )}
    </div>
  );
}
