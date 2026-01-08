/**
 * Utilitários para validação e formatação de CPF
 */

/**
 * Remove caracteres não numéricos do CPF
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata CPF para o padrão 000.000.000-00
 */
export function formatCPF(value: string): string {
  const cleaned = cleanCPF(value);
  
  if (cleaned.length <= 3) {
    return cleaned;
  }
  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  }
  if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  }
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

/**
 * Valida se o CPF é válido usando o algoritmo oficial
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);
  
  // Deve ter 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }
  
  // Não pode ser sequência de números iguais
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned[9])) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned[10])) {
    return false;
  }
  
  return true;
}

/**
 * Verifica se o CPF tem formato válido (sem validar dígitos)
 */
export function isValidCPFFormat(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);
  return cleaned.length === 11;
}
