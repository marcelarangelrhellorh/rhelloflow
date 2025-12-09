import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Briefcase, TrendingUp, Phone, Mail, Globe, MapPin, User } from "lucide-react";
import type { Empresa } from "@/hooks/data/useEmpresaQuery";
interface EmpresaInfoCardProps {
  empresa: Empresa;
}
export function EmpresaInfoCard({
  empresa
}: EmpresaInfoCardProps) {
  const InfoRow = ({
    icon: Icon,
    label,
    value,
    isLink = false
  }: {
    icon: React.ElementType;
    label: string;
    value: string | null;
    isLink?: boolean;
  }) => {
    if (!value) return null;
    return <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-muted-foreground">{label}:</span>
          {isLink ? <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-base font-medium text-primary hover:underline break-all">
              {value}
            </a> : <span className="ml-2 text-base font-medium text-foreground break-all">
              {value}
            </span>}
        </div>
      </div>;
  };
  const endereco = [empresa.endereco, empresa.numero && `nº ${empresa.numero}`, empresa.complemento, empresa.bairro].filter(Boolean).join(", ");
  const localizacao = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");
  const enderecoCompleto = [endereco, localizacao, empresa.cep].filter(Boolean).join(" | ");
  return <Card className="border border-gray-300 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 bg-transparent text-[#ffcd00]" />
          Informações da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <InfoRow icon={FileText} label="CNPJ" value={empresa.cnpj} />
        {empresa.razao_social && empresa.razao_social !== empresa.nome && <InfoRow icon={Building2} label="Razão Social" value={empresa.razao_social} />}
        {empresa.nome_fantasia && empresa.nome_fantasia !== empresa.nome && <InfoRow icon={Building2} label="Nome Fantasia" value={empresa.nome_fantasia} />}
        <InfoRow icon={Briefcase} label="Setor" value={empresa.setor} />
        <InfoRow icon={TrendingUp} label="Porte" value={empresa.porte} />
        <InfoRow icon={Phone} label="Telefone" value={empresa.telefone} />
        <InfoRow icon={Mail} label="Email" value={empresa.email} />
        <InfoRow icon={Globe} label="Site" value={empresa.site} isLink />
        <InfoRow icon={MapPin} label="Endereço" value={enderecoCompleto} />

        {/* Contato Principal */}
        {empresa.contato_principal_nome && <div className="pt-4 border-t border-gray-200 mt-4">
            <h4 className="font-semibold text-base text-foreground mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Contato Principal
            </h4>
            <div className="pl-6 space-y-1">
              <p className="text-base">
                <span className="font-medium">{empresa.contato_principal_nome}</span>
                {empresa.contato_principal_cargo && <span className="text-muted-foreground">
                    {" "}
                    - {empresa.contato_principal_cargo}
                  </span>}
              </p>
              {empresa.contato_principal_email && <p className="text-base text-muted-foreground">
                  {empresa.contato_principal_email}
                </p>}
              {empresa.contato_principal_telefone && <p className="text-base text-muted-foreground">
                  {empresa.contato_principal_telefone}
                </p>}
            </div>
          </div>}

        {/* Observações */}
        {empresa.observacoes && <div className="pt-4 border-t border-gray-200 mt-4">
            <h4 className="font-semibold text-base text-foreground mb-2">Observações</h4>
            <p className="text-base text-muted-foreground whitespace-pre-wrap">
              {empresa.observacoes}
            </p>
          </div>}
      </CardContent>
    </Card>;
}