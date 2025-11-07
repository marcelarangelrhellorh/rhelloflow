import { Badge } from "@/components/ui/badge";
import { formatSalaryRange } from "@/lib/salaryUtils";
import type { Vaga } from "@/hooks/data/useVaga";
import type { VagaTag } from "@/hooks/data/useVagaTags";

interface VagaHeaderProps {
  vaga: Vaga;
  vagaTags: VagaTag[];
  onGenerateClientLink: () => void;
  onViewDetails: () => void;
  onShare: () => void;
}

export function VagaHeader({
  vaga,
  vagaTags,
  onGenerateClientLink,
  onViewDetails,
  onShare,
}: VagaHeaderProps) {
  const categoryColors: Record<string, string> = {
    area: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
    role: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700",
    skill: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
    seniority: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700",
    location: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700",
  };

  return (
    <div className="mb-8 flex justify-between items-start">
      <div>
        <h1 className="text-primary-text-light dark:text-primary-text-dark text-4xl font-black tracking-tight">
          {vaga.titulo}
        </h1>
        <p className="text-secondary-text-light dark:text-secondary-text-dark text-base font-normal mt-2">
          {vaga.empresa} • Acompanhe o progresso do processo de contratação
        </p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {(vaga.salario_min || vaga.salario_max || vaga.salario_modalidade) && (
            <p className="text-secondary-text-light dark:text-secondary-text-dark text-lg font-semibold">
              💰 {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
            </p>
          )}
          {vagaTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vagaTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={categoryColors[tag.category] || "bg-gray-100 text-gray-800 border-gray-300"}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onGenerateClientLink}
          className="px-4 py-2 dark:bg-background-dark border-2 border-slate-800 text-slate-900 dark:text-slate-100 transition-colors flex items-center gap-2 font-bold rounded-sm hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <span className="material-symbols-outlined text-xl">link</span>
          Link Cliente
        </button>
        <button
          onClick={onViewDetails}
          className="px-4 py-2 dark:bg-background-dark border-2 border-primary text-primary-text-light dark:text-primary-text-dark transition-colors flex items-center gap-2 font-bold bg-[#faec3e] rounded-sm"
        >
          <span className="material-symbols-outlined text-xl">info</span>
          Ver Detalhes
        </button>
        <button
          onClick={onShare}
          className="px-4 py-2 text-primary-foreground rounded-md transition-colors flex items-center gap-2 font-bold bg-[#faec3e]"
        >
          <span className="material-symbols-outlined text-xl">share</span>
          Compartilhar
        </button>
      </div>
    </div>
  );
}
