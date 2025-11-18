import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = React.useState(false);

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

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected items display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(val => {
            const option = options.find(o => o.value === val);
            return (
              <Badge key={val} variant="secondary" className="flex items-center gap-1 pr-1">
                {option?.label || val}
                <button 
                  type="button" 
                  onClick={() => handleRemove(val)} 
                  className="ml-1 rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Dropdown trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value.length > 0 
              ? `${value.length} ${value.length === 1 ? 'item selecionado' : 'itens selecionados'}`
              : placeholder
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {options.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox 
                  id={`multi-select-${option.value}`} 
                  checked={value.includes(option.value)} 
                  onCheckedChange={() => handleToggle(option.value)} 
                />
                <Label 
                  htmlFor={`multi-select-${option.value}`} 
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}