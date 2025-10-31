// Utility functions for salary formatting and parsing

export const formatCurrency = (value: number | null | undefined): string => {
  if (!value) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const parseCurrency = (value: string): number | null => {
  if (!value) return null;
  // Remove tudo exceto números
  const numbers = value.replace(/[^\d]/g, "");
  return numbers ? parseFloat(numbers) : null;
};

export const formatSalaryRange = (
  min: number | null | undefined,
  max: number | null | undefined,
  modalidade?: string | null
): string => {
  if (modalidade === "A_COMBINAR") return "A combinar";
  
  const hasMin = min != null && min > 0;
  const hasMax = max != null && max > 0;
  
  if (hasMin && hasMax) {
    return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  } else if (hasMin) {
    return `A partir de ${formatCurrency(min)}`;
  } else if (hasMax) {
    return `Até ${formatCurrency(max)}`;
  }
  
  return "A combinar";
};

export const applyCurrencyMask = (value: string): string => {
  // Remove tudo exceto números
  const numbers = value.replace(/[^\d]/g, "");
  
  if (!numbers) return "";
  
  // Converte para número e formata
  const num = parseFloat(numbers);
  return formatCurrency(num);
};
