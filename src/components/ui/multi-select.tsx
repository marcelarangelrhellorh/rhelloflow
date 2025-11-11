import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
export interface MultiSelectOption {
  label: string;
  value: string;
}
interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}
export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Selecione os itens...",
  className
}: MultiSelectProps) {
  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };
  const handleRemove = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };
  return <div className={cn("space-y-3", className)}>
      {/* Selected items display */}
      {value.length > 0 && <div className="flex flex-wrap gap-2">
          {value.map(val => {
        const option = options.find(o => o.value === val);
        return <Badge key={val} variant="secondary" className="flex items-center gap-1 pr-1">
                {option?.label || val}
                <button type="button" onClick={() => handleRemove(val)} className="ml-1 rounded-full hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>;
      })}
        </div>}

      {/* Options list */}
      <div className="rounded-md border border-input bg-background p-3 space-y-2 max-h-64 overflow-y-auto">
        {options.map(option => <div key={option.value} className="flex items-center space-x-2">
            <Checkbox id={`multi-select-${option.value}`} checked={value.includes(option.value)} onCheckedChange={() => handleToggle(option.value)} />
            <Label htmlFor={`multi-select-${option.value}`} className="text-sm font-normal cursor-pointer flex-1">
              {option.label}
            </Label>
          </div>)}
      </div>

      {value.length === 0 && <p className="text-sm text-muted-foreground font-semibold">{placeholder}</p>}
    </div>;
}