import { Construction, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Relatorios() {
  return (
    <div className="min-h-screen bg-[#FFFDF6]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 md:px-8 py-6">
          <div>
            <h1 className="text-[32px] font-bold text-[#00141D] mb-1">Relatórios</h1>
            <p className="text-[18px] text-[#36404A]">
              Indicadores de performance e produtividade
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-8 py-12 max-w-[1200px] mx-auto">
        <Card className="border-2 border-[#FFCD00] bg-white shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Construction className="h-24 w-24 text-[#FFCD00]" />
                <TrendingUp className="h-8 w-8 text-[#00141D] absolute -bottom-1 -right-1" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-[#00141D]">
              Página em Construção
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6 pb-8">
            <p className="text-lg text-[#36404A] max-w-2xl mx-auto">
              Estamos trabalhando em uma nova experiência de relatórios para você!
              Em breve você terá acesso a análises e insights ainda mais poderosos.
            </p>
            
            <div className="bg-[#FFF9E6] border-2 border-[#FFCD00] rounded-lg p-6 max-w-xl mx-auto">
              <p className="text-sm font-semibold text-[#00141D] mb-2">
                📊 O que está por vir:
              </p>
              <ul className="text-sm text-[#36404A] space-y-2 text-left">
                <li>• Dashboards interativos em tempo real</li>
                <li>• Análises personalizadas por período</li>
                <li>• Comparativos de performance</li>
                <li>• Exportação de dados em múltiplos formatos</li>
                <li>• Insights automáticos com inteligência artificial</li>
              </ul>
            </div>

            <p className="text-sm text-[#9AA6B2]">
              Enquanto isso, você pode acessar as outras funcionalidades do sistema normalmente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
