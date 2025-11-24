import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TagPicker } from "@/components/TagPicker";
import type { Vaga } from "@/hooks/data/useVaga";
import type { VagaTag } from "@/hooks/data/useVagaTags";
interface VagaDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaga: Vaga;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onSaveTags: () => void;
  savingTags: boolean;
}
export function VagaDetailsDrawer({
  open,
  onOpenChange,
  vaga,
  selectedTags,
  onTagsChange,
  onSaveTags,
  savingTags
}: VagaDetailsDrawerProps) {
  const navigate = useNavigate();
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold">Detalhes da Vaga</SheetTitle>
              <SheetDescription>Informações completas sobre a vaga</SheetDescription>
            </div>
            <button onClick={() => {
            onOpenChange(false);
            navigate(`/vagas/${vaga.id}/editar`);
          }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-xl">edit</span>
              Editar Vaga
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4">Informações Gerais</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Título da Vaga</p>
                <p className="text-lg font-semibold">{vaga.titulo}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Empresa</p>
                <p className="text-base">
                  {vaga.confidencial ? "Confidencial" : vaga.empresa}
                </p>
                {vaga.confidencial && vaga.motivo_confidencial && <p className="text-sm text-muted-foreground mt-1">{vaga.motivo_confidencial}</p>}
              </div>

              {vaga.recrutador && <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Recrutador Responsável
                  </p>
                  <p className="text-base">{vaga.recrutador}</p>
                </div>}

              {vaga.cs_responsavel && <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">CS Responsável</p>
                  <p className="text-base">{vaga.cs_responsavel}</p>
                </div>}

              {vaga.contato_nome && <div className="pt-4 border-t space-y-3">
                  <h4 className="text-lg font-bold">Contato do Solicitante</h4>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Nome</p>
                    <p className="text-base">{vaga.contato_nome}</p>
                  </div>

                  {vaga.contato_email && <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">E-mail</p>
                      <p className="text-base">
                        <a href={`mailto:${vaga.contato_email}`} className="text-primary hover:underline">
                          {vaga.contato_email}
                        </a>
                      </p>
                    </div>}

                  {vaga.contato_telefone && <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Telefone</p>
                      <p className="text-base">
                        <a href={`tel:${vaga.contato_telefone}`} className="text-primary hover:underline">
                          {vaga.contato_telefone}
                        </a>
                      </p>
                    </div>}
                </div>}

              <div className="grid grid-cols-2 gap-4">
                {vaga.complexidade && <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Complexidade</p>
                    <p className="text-base">{vaga.complexidade}</p>
                  </div>}

                {vaga.prioridade && <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Prioridade</p>
                    <p className="text-base">{vaga.prioridade}</p>
                  </div>}
              </div>

              {vaga.modelo_trabalho && <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Modelo de Trabalho
                  </p>
                  <p className="text-base">{vaga.modelo_trabalho}</p>
                </div>}

              {(vaga.horario_inicio || vaga.horario_fim) && <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Horário de Trabalho
                  </p>
                  <p className="text-base">
                    {vaga.horario_inicio || "?"} às {vaga.horario_fim || "?"}
                  </p>
                  {vaga.dias_semana && vaga.dias_semana.length > 0 && <p className="text-sm text-muted-foreground mt-1">
                      {vaga.dias_semana.join(", ")}
                    </p>}
                </div>}
            </div>
          </div>

          {/* Responsabilidades */}
          {vaga.responsabilidades && <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-4">Responsabilidades</h3>
              <div className="text-base whitespace-pre-wrap">{vaga.responsabilidades}</div>
            </div>}

          {/* Requisitos Obrigatórios */}
          {vaga.requisitos_obrigatorios && <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-4">Requisitos Obrigatórios</h3>
              <div className="text-base whitespace-pre-wrap">{vaga.requisitos_obrigatorios}</div>
            </div>}

          {/* Requisitos Desejáveis */}
          {vaga.requisitos_desejaveis && <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-4">Requisitos Desejáveis</h3>
              <div className="text-base whitespace-pre-wrap">{vaga.requisitos_desejaveis}</div>
            </div>}

          {/* Benefícios */}
          {vaga.beneficios && vaga.beneficios.length > 0 && <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-4">Benefícios</h3>
              <div className="flex flex-wrap gap-2">
                {vaga.beneficios.map((beneficio, index) => <span key={index} className="px-3 py-1 bg-primary/10 text-primary-text-light dark:text-primary-text-dark rounded-full text-sm font-medium">
                    {beneficio}
                  </span>)}
              </div>
              {vaga.beneficios_outros && <p className="text-base mt-4">{vaga.beneficios_outros}</p>}
            </div>}

          {/* Observações */}
          {vaga.observacoes && <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-4">Observações</h3>
              <div className="text-base whitespace-pre-wrap">{vaga.observacoes}</div>
            </div>}

          {/* Tags */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4">Tags</h3>
            <TagPicker selectedTags={selectedTags} onChange={onTagsChange} />
            <div className="mt-4 flex justify-end">
              <button onClick={onSaveTags} disabled={savingTags} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                {savingTags ? "Salvando..." : "Salvar Tags"}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>;
}
