import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface VagaExport {
  id: string;
  titulo: string;
  recrutador: string | null;
  empresa: string;
  status: string;
  criado_em: string;
  data_abertura?: string | null;
}

export function exportVagasToXLS(vagas: VagaExport[], nomeArquivo = "vagas") {
  const dadosExportacao = vagas.map(vaga => ({
    Posição: vaga.titulo,
    Recrutador: vaga.recrutador || "Não atribuído",
    Cliente: vaga.empresa,
    "Status/Etapa": vaga.status,
    "Dias em Aberto": calcularDiasEmAberto(vaga.data_abertura || vaga.criado_em)
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);

  worksheet["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Vagas");

  const nomeComData = `${nomeArquivo}-${format(new Date(), "dd-MM-yyyy", {
    locale: ptBR
  })}.xlsx`;

  XLSX.writeFile(workbook, nomeComData);
}

export function calcularDiasEmAberto(dataAbertura: string | null | undefined): number {
  if (!dataAbertura) return 0;

  const data = new Date(dataAbertura);
  const agora = new Date();
  const diferenca = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));

  return diferenca >= 0 ? diferenca : 0;
}
