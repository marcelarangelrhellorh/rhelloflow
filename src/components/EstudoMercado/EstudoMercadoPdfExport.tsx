import logoRhelloDark from "@/assets/logo-rhello-dark.png";

// Interfaces importadas do EstudoMercado
interface FaixaPorPorte {
  min: string | null;
  media: string | null;
  max: string | null;
}

interface ResultadoSetor {
  setor: string;
  por_porte: {
    peq_med: FaixaPorPorte | null;
    grande: FaixaPorPorte | null;
  };
  registros_base: number;
  trecho_consultado?: string;
}

interface ResultadoFonte {
  encontrado: boolean;
  setores: ResultadoSetor[];
  observacao: string;
  fonte: string;
}

interface InfoJobsResultado {
  encontrado: boolean;
  salario_medio: string | null;
  faixa: {
    min: string | null;
    max: string | null;
  };
  registros_base: number | null;
  fonte: string;
  url: string | null;
}

interface GlassdoorResultado {
  encontrado: boolean;
  salario_medio: string | null;
  faixa: {
    min: string | null;
    max: string | null;
  };
  remuneracao_variavel: {
    media: string | null;
    min: string | null;
    max: string | null;
  } | null;
  registros_base: number | null;
  ultima_atualizacao: string | null;
  fonte: string;
  url: string | null;
}

interface EstudoMercadoNovo {
  consulta: {
    cargo_pedido: string;
    senioridade: string;
    localidade: string;
  };
  resultado: {
    hays: ResultadoFonte;
    michael_page: ResultadoFonte;
    infojobs?: InfoJobsResultado;
    glassdoor?: GlassdoorResultado;
  };
  consultoria: string[];
}

// Design System Colors (RGB values for jsPDF)
const colors = {
  primary: [255, 205, 0] as [number, number, number],       // #FFCD00
  primaryDark: [0, 20, 29] as [number, number, number],     // #00141D
  background: [255, 253, 246] as [number, number, number],  // #FFFDF6
  cardBg: [255, 255, 255] as [number, number, number],      // White
  textPrimary: [0, 20, 29] as [number, number, number],     // #00141D
  textSecondary: [107, 114, 128] as [number, number, number], // Gray
  success: [34, 197, 94] as [number, number, number],       // Green
  error: [239, 68, 68] as [number, number, number],         // Red
  border: [229, 231, 235] as [number, number, number],      // Light gray border
  tableHeader: [17, 24, 39] as [number, number, number],    // Dark header
  tableAlt: [249, 250, 251] as [number, number, number],    // Zebra row
  accentLight: [254, 249, 195] as [number, number, number], // Light yellow
};

export async function generateEstudoMercadoPdf(estudo: EstudoMercadoNovo): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  // =====================================
  // HELPER FUNCTIONS
  // =====================================
  
  let currentPage = 1;
  
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    return 30; // Return starting Y position for new page
  };
  
  const checkPageBreak = (yPos: number, needed: number): number => {
    if (yPos + needed > pageHeight - 30) {
      return addNewPage();
    }
    return yPos;
  };
  
  const drawHeader = (title: string, subtitle?: string) => {
    // Dark header bar
    doc.setFillColor(...colors.primaryDark);
    doc.rect(0, 0, pageWidth, 50, "F");
    
    // Yellow accent line
    doc.setFillColor(...colors.primary);
    doc.rect(0, 50, pageWidth, 3, "F");
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(title, margin, 28);
    
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...colors.primary);
      doc.text(subtitle, margin, 40);
    }
    
    return 70; // Y position after header
  };
  
  const drawSectionTitle = (title: string, yPos: number): number => {
    // Yellow accent bar
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos - 5, 4, 18, "F");
    
    // Title text
    doc.setTextColor(...colors.textPrimary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title.toUpperCase(), margin + 10, yPos + 5);
    
    return yPos + 20;
  };
  
  const drawHighlightBox = (content: { label: string; value: string; sublabel?: string }, x: number, y: number, width: number, height: number) => {
    // Yellow background box
    doc.setFillColor(...colors.primary);
    doc.roundedRect(x, y, width, height, 3, 3, "F");
    
    // Label
    doc.setTextColor(...colors.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(content.label, x + 10, y + 15);
    
    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const valueLines = doc.splitTextToSize(content.value, width - 20);
    doc.text(valueLines, x + 10, y + 30);
    
    // Sublabel
    if (content.sublabel) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(content.sublabel, x + 10, y + height - 10);
    }
  };
  
  const drawStatusBadge = (found: boolean, x: number, y: number, width: number = 80): number => {
    const badgeColor = found ? colors.success : colors.error;
    const badgeText = found ? "DADOS ENCONTRADOS" : "NÃO ENCONTRADO";
    
    doc.setFillColor(...badgeColor);
    doc.roundedRect(x, y, width, 16, 3, 3, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(badgeText, x + width / 2, y + 10.5, { align: "center" });
    
    return y + 22;
  };
  
  const drawSourceCard = (
    fonte: ResultadoFonte | undefined, 
    nomeFonte: string, 
    x: number, 
    y: number, 
    width: number
  ): number => {
    let currentY = y;
    
    // Card background
    doc.setFillColor(...colors.cardBg);
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, currentY, width, 120, 3, 3, "FD");
    
    // Card header
    doc.setFillColor(...colors.primaryDark);
    doc.roundedRect(x, currentY, width, 28, 3, 3, "F");
    // Fix rounded corners at bottom of header
    doc.setFillColor(...colors.primaryDark);
    doc.rect(x, currentY + 20, width, 8, "F");
    
    // Source name
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(nomeFonte, x + 10, currentY + 18);
    
    currentY += 35;
    
    if (!fonte) {
      doc.setTextColor(...colors.textSecondary);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Fonte não disponível", x + 10, currentY);
      return y + 125;
    }
    
    // Status badge
    const badgeWidth = 70;
    drawStatusBadge(fonte.encontrado, x + width - badgeWidth - 10, currentY - 28, badgeWidth);
    
    if (fonte.encontrado && fonte.setores && fonte.setores.length > 0) {
      // Sectors count
      doc.setTextColor(...colors.textPrimary);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${fonte.setores.length} setor(es) encontrado(s)`, x + 10, currentY);
      currentY += 10;
      
      // Render each sector
      for (const setor of fonte.setores.slice(0, 2)) { // Max 2 sectors per card
        // Sector name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...colors.textPrimary);
        const sectorName = setor.setor.length > 35 
          ? setor.setor.substring(0, 35) + '...' 
          : setor.setor;
        doc.text(sectorName, x + 10, currentY);
        
        currentY += 10;
        
        // Salary ranges
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        
        if (setor.por_porte.peq_med) {
          doc.setTextColor(...colors.textSecondary);
          doc.text("Peq/Méd:", x + 12, currentY);
          doc.setTextColor(...colors.textPrimary);
          doc.text(`${setor.por_porte.peq_med.min || '—'} a ${setor.por_porte.peq_med.max || '—'}`, x + 35, currentY);
          currentY += 8;
        }
        
        if (setor.por_porte.grande) {
          doc.setTextColor(...colors.textSecondary);
          doc.text("Grande:", x + 12, currentY);
          doc.setTextColor(...colors.textPrimary);
          doc.text(`${setor.por_porte.grande.min || '—'} a ${setor.por_porte.grande.max || '—'}`, x + 35, currentY);
          currentY += 8;
        }
        
        currentY += 4;
      }
    } else {
      doc.setTextColor(...colors.textSecondary);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("Cargo não encontrado nesta fonte", x + 10, currentY + 10);
    }
    
    return y + 125;
  };
  
  const drawOnlineSourceCard = (
    fonte: InfoJobsResultado | GlassdoorResultado | undefined,
    nomeFonte: string,
    x: number,
    y: number,
    width: number
  ): number => {
    // Card background
    doc.setFillColor(...colors.cardBg);
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, 90, 3, 3, "FD");
    
    // Card header
    doc.setFillColor(...colors.primaryDark);
    doc.roundedRect(x, y, width, 28, 3, 3, "F");
    doc.setFillColor(...colors.primaryDark);
    doc.rect(x, y + 20, width, 8, "F");
    
    // Source name
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(nomeFonte, x + 10, y + 18);
    
    let currentY = y + 38;
    
    if (!fonte || !fonte.encontrado) {
      // Status badge
      drawStatusBadge(false, x + width - 80, y + 7, 70);
      
      doc.setTextColor(...colors.textSecondary);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("Dados não disponíveis", x + 10, currentY + 10);
      return y + 95;
    }
    
    // Status badge
    drawStatusBadge(true, x + width - 80, y + 7, 70);
    
    // Average salary (big number)
    if (fonte.salario_medio) {
      doc.setTextColor(...colors.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(fonte.salario_medio, x + 10, currentY + 5);
      
      doc.setTextColor(...colors.textSecondary);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("MÉDIA SALARIAL", x + 10, currentY + 12);
    }
    
    currentY += 20;
    
    // Salary range
    if (fonte.faixa) {
      doc.setTextColor(...colors.textSecondary);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Faixa: ${fonte.faixa.min || '—'} a ${fonte.faixa.max || '—'}`, x + 10, currentY);
    }
    
    // Records count
    if (fonte.registros_base) {
      currentY += 10;
      doc.text(`Base: ${fonte.registros_base} registros`, x + 10, currentY);
    }
    
    return y + 95;
  };
  
  const drawInsightItem = (number: number, text: string, yPos: number): number => {
    // Number circle
    doc.setFillColor(...colors.primary);
    doc.circle(margin + 8, yPos, 8, "F");
    
    doc.setTextColor(...colors.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(number), margin + 8, yPos + 3.5, { align: "center" });
    
    // Insight text
    doc.setTextColor(...colors.textPrimary);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth - 30);
    doc.text(lines, margin + 22, yPos + 3);
    
    return yPos + lines.length * 5 + 12;
  };
  
  const drawFooter = (pageNum: number, totalPages: number) => {
    // Footer line
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(1);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    
    // Footer text
    doc.setTextColor(...colors.textSecondary);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("rhello flow | Inteligência em Recrutamento", margin, pageHeight - 10);
    doc.text("www.rhello.com.br", pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text(`${pageNum}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  };
  
  // =====================================
  // PAGE 1: COVER
  // =====================================
  
  // Background
  doc.setFillColor(...colors.background);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Header bar
  doc.setFillColor(...colors.primaryDark);
  doc.rect(0, 0, pageWidth, 65, "F");
  
  // Yellow accent
  doc.setFillColor(...colors.primary);
  doc.rect(0, 65, pageWidth, 4, "F");
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("ESTUDO DE MERCADO", margin, 35);
  doc.setFontSize(18);
  doc.text("SALARIAL", margin, 50);
  
  // Subtitle
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("rhello flow | Inteligência Salarial", pageWidth - margin, 45, { align: "right" });
  
  // Main highlight box
  const highlightY = 90;
  drawHighlightBox(
    {
      label: "CARGO ANALISADO",
      value: estudo.consulta.cargo_pedido,
      sublabel: [
        estudo.consulta.senioridade !== 'Não especificado' ? estudo.consulta.senioridade : null,
        estudo.consulta.localidade !== 'Brasil' ? estudo.consulta.localidade : null
      ].filter(Boolean).join(" | ") || "Brasil"
    },
    margin,
    highlightY,
    contentWidth,
    55
  );
  
  // Info cards
  const infoY = 160;
  const infoCardWidth = (contentWidth - 10) / 2;
  
  // Card 1: Data de geração
  doc.setFillColor(...colors.cardBg);
  doc.setDrawColor(...colors.border);
  doc.roundedRect(margin, infoY, infoCardWidth, 45, 3, 3, "FD");
  
  doc.setTextColor(...colors.textSecondary);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("DATA DE GERAÇÃO", margin + 10, infoY + 15);
  
  doc.setTextColor(...colors.textPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(new Date().toLocaleDateString("pt-BR", { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  }), margin + 10, infoY + 32);
  
  // Card 2: Fontes consultadas
  doc.setFillColor(...colors.cardBg);
  doc.roundedRect(margin + infoCardWidth + 10, infoY, infoCardWidth, 45, 3, 3, "FD");
  
  doc.setTextColor(...colors.textSecondary);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FONTES CONSULTADAS", margin + infoCardWidth + 20, infoY + 15);
  
  const fontes: string[] = [];
  if (estudo.resultado.hays?.encontrado) fontes.push("Hays 2026");
  if (estudo.resultado.michael_page?.encontrado) fontes.push("Michael Page 2026");
  if (estudo.resultado.infojobs?.encontrado) fontes.push("InfoJobs");
  if (estudo.resultado.glassdoor?.encontrado) fontes.push("Glassdoor");
  
  doc.setTextColor(...colors.textPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(fontes.join(" • "), margin + infoCardWidth + 20, infoY + 32);
  
  // Logo at bottom
  try {
    const imgData = await fetch(logoRhelloDark).then(r => r.blob()).then(b => new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(b);
    }));
    doc.addImage(imgData, "PNG", pageWidth / 2 - 25, pageHeight - 60, 50, 13);
  } catch {
    // Logo failed, continue without it
  }
  
  // =====================================
  // PAGE 2: COMPARATIVE VIEW
  // =====================================
  
  const hasHays = estudo.resultado.hays?.encontrado === true;
  const hasMichaelPage = estudo.resultado.michael_page?.encontrado === true;
  
  const colWidth = (contentWidth - 10) / 2;
  let yPos: number;
  
  if (hasHays || hasMichaelPage) {
    yPos = addNewPage();
    yPos = drawHeader("COMPARATIVO DE FONTES", "Análise detalhada por fonte");
    
    yPos = drawSectionTitle("Guias Salariais 2026", yPos);
    
    if (hasHays && hasMichaelPage) {
      // Both sources - side by side
      drawSourceCard(estudo.resultado.hays, "HAYS 2026", margin, yPos, colWidth);
      drawSourceCard(estudo.resultado.michael_page, "MICHAEL PAGE 2026", margin + colWidth + 10, yPos, colWidth);
    } else if (hasHays) {
      // Only Hays
      drawSourceCard(estudo.resultado.hays, "HAYS 2026", margin, yPos, colWidth);
    } else if (hasMichaelPage) {
      // Only Michael Page
      drawSourceCard(estudo.resultado.michael_page, "MICHAEL PAGE 2026", margin, yPos, colWidth);
    }
    
    yPos += 135;
  } else {
    // No salary guides found - start page for online sources
    yPos = addNewPage();
    yPos = drawHeader("FONTES ONLINE", "Dados de mercado em tempo real");
  }
  
  // Online sources section - only show if at least one source has data
  const hasInfojobs = estudo.resultado.infojobs?.encontrado === true;
  const hasGlassdoor = estudo.resultado.glassdoor?.encontrado === true;
  
  if (hasInfojobs || hasGlassdoor) {
    yPos = checkPageBreak(yPos, 120);
    yPos = drawSectionTitle("Fontes Online", yPos);
    
    if (hasInfojobs && hasGlassdoor) {
      // Both sources - side by side
      drawOnlineSourceCard(estudo.resultado.infojobs, "INFOJOBS", margin, yPos, colWidth);
      drawOnlineSourceCard(estudo.resultado.glassdoor, "GLASSDOOR", margin + colWidth + 10, yPos, colWidth);
    } else if (hasInfojobs) {
      // Only InfoJobs
      drawOnlineSourceCard(estudo.resultado.infojobs, "INFOJOBS", margin, yPos, colWidth);
    } else if (hasGlassdoor) {
      // Only Glassdoor
      drawOnlineSourceCard(estudo.resultado.glassdoor, "GLASSDOOR", margin, yPos, colWidth);
    }
  }
  
  // =====================================
  // PAGE 3: INSIGHTS
  // =====================================
  
  if (estudo.consultoria && estudo.consultoria.length > 0) {
    yPos = addNewPage();
    yPos = drawHeader("INSIGHTS CONSULTIVOS", "Análise e recomendações do estudo");
    
    yPos = drawSectionTitle("Principais Descobertas", yPos);
    
    // Calculate dynamic height for insights box based on actual text content
    let insightsTotalHeight = 20; // padding
    for (const texto of estudo.consultoria) {
      const lines = doc.splitTextToSize(texto, contentWidth - 30);
      insightsTotalHeight += lines.length * 5 + 12;
    }
    
    // Insights box with dynamic height
    doc.setFillColor(...colors.cardBg);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(margin, yPos, contentWidth, insightsTotalHeight, 3, 3, "FD");
    
    yPos += 15;
    
    for (let i = 0; i < estudo.consultoria.length; i++) {
      yPos = drawInsightItem(i + 1, estudo.consultoria[i], yPos);
    }
  }
  
  // =====================================
  // PAGE 4: AUDIT TRAILS
  // =====================================
  
  const hasAuditData = 
    (estudo.resultado.hays.encontrado && estudo.resultado.hays.setores?.some(s => s.trecho_consultado)) ||
    (estudo.resultado.michael_page.encontrado && estudo.resultado.michael_page.setores?.some(s => s.trecho_consultado));
  
  if (hasAuditData) {
    yPos = addNewPage();
    yPos = drawHeader("ANEXO - AUDITORIA", "Trechos consultados para validação");
    
    yPos = drawSectionTitle("Trechos dos Guias Salariais", yPos);
    
    // Hays excerpts
    if (estudo.resultado.hays.encontrado && estudo.resultado.hays.setores) {
      for (const setor of estudo.resultado.hays.setores) {
        if (setor.trecho_consultado) {
          yPos = checkPageBreak(yPos, 50);
          
          // Source header
          doc.setFillColor(...colors.tableHeader);
          doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(`HAYS - ${setor.setor}`, margin + 8, yPos + 11);
          
          yPos += 22;
          
          // Content box
          doc.setFillColor(...colors.tableAlt);
          const lines = doc.splitTextToSize(setor.trecho_consultado, contentWidth - 20);
          const boxHeight = lines.length * 4 + 15;
          doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, "F");
          
          doc.setTextColor(...colors.textSecondary);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.text(lines, margin + 10, yPos + 10);
          
          yPos += boxHeight + 10;
        }
      }
    }
    
    // Michael Page excerpts
    if (estudo.resultado.michael_page.encontrado && estudo.resultado.michael_page.setores) {
      for (const setor of estudo.resultado.michael_page.setores) {
        if (setor.trecho_consultado) {
          yPos = checkPageBreak(yPos, 50);
          
          // Source header
          doc.setFillColor(...colors.tableHeader);
          doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(`MICHAEL PAGE - ${setor.setor}`, margin + 8, yPos + 11);
          
          yPos += 22;
          
          // Content box
          doc.setFillColor(...colors.tableAlt);
          const lines = doc.splitTextToSize(setor.trecho_consultado, contentWidth - 20);
          const boxHeight = lines.length * 4 + 15;
          doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, "F");
          
          doc.setTextColor(...colors.textSecondary);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.text(lines, margin + 10, yPos + 10);
          
          yPos += boxHeight + 10;
        }
      }
    }
  }
  
  // =====================================
  // ADD FOOTERS TO ALL PAGES
  // =====================================
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }
  
  // =====================================
  // SAVE PDF
  // =====================================
  
  const fileName = `estudo-mercado-${estudo.consulta.cargo_pedido
    .replace(/\s+/g, "-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  }-${new Date().toISOString().split("T")[0]}.pdf`;
  
  doc.save(fileName);
}
