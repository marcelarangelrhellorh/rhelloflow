import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ShareConfig {
  exibir_sobre: boolean;
  exibir_responsabilidades: boolean;
  exibir_requisitos: boolean;
  exibir_beneficios: boolean;
  exibir_localizacao: boolean;
  exibir_salario: boolean;
  empresa_confidencial: boolean;
  exibir_observacoes: boolean;
  texto_sobre_customizado?: string | null;
  responsabilidades_customizadas?: string | null;
  requisitos_customizados?: string | null;
}

interface ShareConfigStepProps {
  vaga: any;
  config: ShareConfig;
  onChange: (config: ShareConfig) => void;
}

export function ShareConfigStep({ vaga, config, onChange }: ShareConfigStepProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateConfig = (key: keyof ShareConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const configSections = [
    {
      key: 'sobre',
      label: 'Sobre a vaga',
      configKey: 'exibir_sobre' as keyof ShareConfig,
      hasCustomText: true,
      customTextKey: 'texto_sobre_customizado',
      defaultText: vaga.responsabilidades || '',
      description: 'Descrição geral da vaga e suas principais características'
    },
    {
      key: 'responsabilidades',
      label: 'Responsabilidades',
      configKey: 'exibir_responsabilidades' as keyof ShareConfig,
      hasCustomText: true,
      customTextKey: 'responsabilidades_customizadas',
      defaultText: vaga.responsabilidades || '',
      description: 'Atividades e responsabilidades do cargo'
    },
    {
      key: 'requisitos',
      label: 'Requisitos',
      configKey: 'exibir_requisitos' as keyof ShareConfig,
      hasCustomText: true,
      customTextKey: 'requisitos_customizados',
      defaultText: `Obrigatórios:\n${vaga.requisitos_obrigatorios || ''}\n\nDesejáveis:\n${vaga.requisitos_desejaveis || ''}`,
      description: 'Requisitos obrigatórios e desejáveis para a vaga'
    },
    {
      key: 'beneficios',
      label: 'Benefícios',
      configKey: 'exibir_beneficios' as keyof ShareConfig,
      hasCustomText: false,
      description: 'Pacote de benefícios oferecidos'
    },
    {
      key: 'localizacao',
      label: 'Localização e Modalidade',
      configKey: 'exibir_localizacao' as keyof ShareConfig,
      hasCustomText: false,
      description: 'Local de trabalho e modelo (presencial/híbrido/remoto)'
    },
    {
      key: 'salario',
      label: 'Faixa Salarial',
      configKey: 'exibir_salario' as keyof ShareConfig,
      hasCustomText: false,
      description: 'Valores mínimo e máximo da remuneração'
    },
    {
      key: 'observacoes',
      label: 'Observações Adicionais',
      configKey: 'exibir_observacoes' as keyof ShareConfig,
      hasCustomText: false,
      description: 'Informações complementares sobre a vaga'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Escolha quais informações deseja tornar públicas.</strong><br />
          Os dados não selecionados permanecerão visíveis apenas internamente.
        </p>
      </div>

      {/* Confidencialidade da Empresa */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {config.empresa_confidencial ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              <Label className="font-semibold">Nome da Empresa</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {config.empresa_confidencial 
                ? 'Será exibido como "Empresa Confidencial"' 
                : `Será exibido: "${vaga.empresa}"`}
            </p>
          </div>
          <Switch
            checked={config.empresa_confidencial}
            onCheckedChange={(checked) => updateConfig('empresa_confidencial', checked)}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {config.empresa_confidencial ? '🔒 Confidencial' : '👁️ Visível'}
        </div>
      </Card>

      {/* Seções Configuráveis */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Seções da Vaga
        </h3>
        
        {configSections.map((section) => (
          <Card key={section.key} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {config[section.configKey] ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  <Label className="font-semibold">{section.label}</Label>
                </div>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {section.hasCustomText && config[section.configKey] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection(section.key)}
                  >
                    {expandedSections[section.key] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                )}
                <Switch
                  checked={config[section.configKey] as boolean}
                  onCheckedChange={(checked) => updateConfig(section.configKey, checked)}
                />
              </div>
            </div>

            {/* Custom text editor */}
            {section.hasCustomText && config[section.configKey] && expandedSections[section.key] && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Personalizar texto (opcional - deixe em branco para usar o padrão)
                </Label>
                <Textarea
                  placeholder={section.defaultText}
                  value={(config[section.customTextKey as keyof ShareConfig] as string) || ''}
                  onChange={(e) => updateConfig(section.customTextKey as keyof ShareConfig, e.target.value || null)}
                  rows={5}
                  className="text-sm"
                />
              </div>
            )}

            <div className="mt-2 text-xs text-muted-foreground">
              {config[section.configKey] ? '👁️ Será exibido' : '🔒 Oculto'}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
