/**
 * Utilitários para formatação e validação de CNPJ
 */

/**
 * Remove todos os caracteres não numéricos do CNPJ
 */
export const cleanCNPJ = (cnpj: string): string => {
  return cnpj.replace(/\D/g, '');
};

/**
 * Formata o CNPJ no padrão 00.000.000/0000-00
 */
export const formatCNPJ = (value: string): string => {
  const numbers = cleanCNPJ(value);
  
  if (numbers.length <= 14) {
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  
  return value.slice(0, 18);
};

/**
 * Valida o CNPJ verificando os dígitos verificadores
 * Algoritmo oficial da Receita Federal
 */
export const validateCNPJ = (cnpj: string): boolean => {
  const numbers = cleanCNPJ(cnpj);
  
  // Deve ter exatamente 14 dígitos
  if (numbers.length !== 14) {
    return false;
  }
  
  // Não pode ter todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(numbers)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numbers[12]) !== firstDigit) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numbers[13]) !== secondDigit) {
    return false;
  }
  
  return true;
};
