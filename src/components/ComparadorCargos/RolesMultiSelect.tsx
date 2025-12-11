import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import rolesCatalog from "@/data/roles_catalog.json";

interface RolesMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

interface Role {
  role_id: string;
  title: string;
  category: string;
  seniority: string;
  core_focus: string[];
}

export function RolesMultiSelect({ value, onChange }: RolesMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const roles = rolesCatalog as unknown as Role[];

  // Group roles by category
  const groupedRoles = useMemo(() => {
    const groups: Record<string, Role[]> = {};
    roles.forEach((role) => {
      if (!groups[role.category]) {
        groups[role.category] = [];
      }
      groups[role.category].push(role);
    });
    return groups;
  }, []);

  const selectedRoles = roles.filter((r: Role) => value.includes(r.role_id));

  const handleToggle = (roleId: string) => {
    if (value.includes(roleId)) {
      onChange(value.filter((id) => id !== roleId));
    } else if (value.length < 5) {
      onChange([...value, roleId]);
    }
  };

  const handleRemove = (roleId: string) => {
    onChange(value.filter((id) => id !== roleId));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Produto": "bg-blue-100 text-blue-800",
      "Design": "bg-purple-100 text-purple-800",
      "Negócios": "bg-green-100 text-green-800",
      "Tecnologia": "bg-orange-100 text-orange-800",
      "Dados": "bg-cyan-100 text-cyan-800",
      "Customer Success": "bg-pink-100 text-pink-800",
      "Vendas": "bg-yellow-100 text-yellow-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-3">
      {/* Selected roles badges */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRoles.map((role: Role) => (
            <Badge
              key={role.role_id}
              variant="secondary"
              className={cn("pr-1", getCategoryColor(role.category))}
            >
              {role.title}
              <button
                type="button"
                onClick={() => handleRemove(role.role_id)}
                className="ml-1 rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Popover selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={value.length >= 5}
          >
            {value.length >= 5
              ? "Limite de 5 cargos atingido"
              : "Selecionar cargos..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cargo..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
              {Object.entries(groupedRoles).map(([category, categoryRoles]) => (
                <CommandGroup key={category} heading={category}>
                  {categoryRoles.map((role) => {
                    const isSelected = value.includes(role.role_id);
                    const isDisabled = !isSelected && value.length >= 5;
                    
                    return (
                      <CommandItem
                        key={role.role_id}
                        value={`${role.title} ${role.category}`}
                        onSelect={() => !isDisabled && handleToggle(role.role_id)}
                        className={cn(isDisabled && "opacity-50")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{role.title}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {role.seniority}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
