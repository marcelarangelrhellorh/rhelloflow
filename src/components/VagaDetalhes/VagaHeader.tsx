import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onShare
}: VagaHeaderProps) {
  const categoryColors: Record<string, string> = {
    area: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
    role: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700",
    skill: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
    seniority: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700",
    location: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700"
  };
  return <div className="mb-8 flex justify-between items-start">
      <div>
        <h1 className="text-[#00141d] text-3xl font-bold">
          {vaga.titulo}
        </h1>
        <p className="text-[#36404a] mt-1 font-medium text-base">
          {vaga.empresa} • Acompanhe o progresso do processo de contratação
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {(vaga.salario_min || vaga.salario_max || vaga.salario_modalidade) && <Badge className="bg-[#ffcd00]/20 text-[#00141d] border-[#ffcd00]/30 font-bold text-sm px-3 py-1">
              💰 {formatSalaryRange(vaga.salario_min, vaga.salario_max, vaga.salario_modalidade)}
            </Badge>}
          {vagaTags.length > 0 && <div className="flex flex-wrap gap-2">
              {vagaTags.map(tag => <Badge key={tag.id} variant="outline" className={`text-sm ${categoryColors[tag.category] || "bg-gray-100 text-gray-800 border-gray-300"}`}>
                  {tag.label}
                </Badge>)}
            </div>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onGenerateClientLink} variant="outline" className="rounded-full font-bold text-sm min-w-[140px]">
          <span className="material-symbols-outlined text-lg">link</span>
          Link Cliente
        </Button>
        <Button onClick={onViewDetails} variant="outline" className="rounded-full font-bold text-sm min-w-[140px]">
          <span className="material-symbols-outlined text-lg">visibility</span>
          Ver Detalhes
        </Button>
        <Button onClick={onShare} className="rounded-full font-bold text-sm min-w-[140px]">
          <span className="material-symbols-outlined text-lg">share</span>
          Compartilhar
        </Button>
      </div>
    </div>;
}