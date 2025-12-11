import { jsPDF } from "jspdf";

interface ComparisonResult {
  summary: string;
  table_markdown: string;
  detailed_justification: string;
  recommended_role: string;
  suggested_job_title: string;
  short_briefing: string[];
  selected_roles: Array<{
    role_id: string;
    title_pt: string;
    category: string;
    seniority_levels: string[];
    demand_trend: string;
  }>;
}

export function generateComparisonPdf(
  result: ComparisonResult,
  requirements: Record<string, number>,
  clientContext: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, fontSize: number, maxWidth: number): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, yPos);
    return lines.length * fontSize * 0.4;
  };

  // Helper to check and add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPos = margin;
    }
  };

  // === COVER PAGE ===
  // Header bar
  doc.setFillColor(0, 20, 29); // #00141D
  doc.rect(0, 0, pageWidth, 50, "F");

  // Title
  doc.setTextColor(255, 205, 0); // #FFCD00
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ANÁLISE COMPARATIVA DE CARGOS", pageWidth / 2, 30, { align: "center" });

  // Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("rhello flow | Ferramenta de Recrutamento", pageWidth / 2, 42, { align: "center" });

  // Reset colors
  doc.setTextColor(0, 20, 29);
  yPos = 70;

  // Recommended Role Box
  doc.setFillColor(255, 205, 0);
  doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("CARGO RECOMENDADO", margin + 5, yPos + 10);
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const recommendedRole = result.selected_roles.find(r => r.role_id === result.recommended_role);
  doc.text(recommendedRole?.title_pt || result.recommended_role, margin + 5, yPos + 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Categoria: ${recommendedRole?.category || "N/A"}`, margin + 5, yPos + 35);

  yPos += 55;

  // Executive Summary
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Executivo", margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  yPos += addWrappedText(result.summary, 11, contentWidth);
  yPos += 15;

  // Suggested Job Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Título Sugerido da Vaga", margin, yPos);
  yPos += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(result.suggested_job_title, margin, yPos);
  yPos += 15;

  // Briefing
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Briefing da Posição", margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  result.short_briefing.forEach((item) => {
    checkNewPage(10);
    doc.text(`• ${item}`, margin + 5, yPos);
    yPos += 7;
  });
  yPos += 10;

  // === PAGE 2: COMPARATIVE TABLE ===
  doc.addPage();
  yPos = margin;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Tabela Comparativa", margin, yPos);
  yPos += 15;

  // Parse markdown table and render
  const tableLines = result.table_markdown.split('\n').filter(line => line.trim());
  let tableData: string[][] = [];
  
  tableLines.forEach(line => {
    if (line.includes('|') && !line.match(/^[\|\-\s]+$/)) {
      const cells = line.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
      if (cells.length > 0) {
        tableData.push(cells);
      }
    }
  });

  if (tableData.length > 0) {
    const colWidth = contentWidth / tableData[0].length;
    const rowHeight = 12;

    tableData.forEach((row, rowIndex) => {
      checkNewPage(rowHeight + 5);
      
      // Header row styling
      if (rowIndex === 0) {
        doc.setFillColor(0, 20, 29);
        doc.rect(margin, yPos - 6, contentWidth, rowHeight, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(0, 20, 29);
        doc.setFont("helvetica", "normal");
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 6, contentWidth, rowHeight, "F");
        }
      }

      doc.setFontSize(9);
      row.forEach((cell, colIndex) => {
        const cellText = doc.splitTextToSize(cell, colWidth - 4);
        doc.text(cellText[0] || "", margin + colIndex * colWidth + 2, yPos);
      });

      yPos += rowHeight;
    });
  }

  // === PAGE 3: DETAILED JUSTIFICATION ===
  doc.addPage();
  yPos = margin;
  doc.setTextColor(0, 20, 29);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Justificativa Detalhada", margin, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const paragraphs = result.detailed_justification.split('\n\n');
  paragraphs.forEach(paragraph => {
    checkNewPage(30);
    yPos += addWrappedText(paragraph.trim(), 11, contentWidth);
    yPos += 8;
  });

  // === FOOTER ON ALL PAGES ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado por rhello flow | ${new Date().toLocaleDateString('pt-BR')} | Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save
  const filename = `comparacao_cargos_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
