import { toast } from "sonner";
import { logger } from "./logger";

// Tipos de erros conhecidos
export type ApiErrorCode = 'NETWORK' | 'AUTH' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER' | 'VALIDATION' | 'UNKNOWN';

// Mensagens amigáveis ao usuário (sem detalhes técnicos)
const USER_FRIENDLY_MESSAGES: Record<ApiErrorCode, string> = {
  NETWORK: "Sem conexão. Verifique sua internet.",
  AUTH: "Sessão expirada. Faça login novamente.",
  FORBIDDEN: "Você não tem permissão para isso.",
  NOT_FOUND: "Não encontrado.",
  SERVER: "Erro no servidor. Tente novamente em instantes.",
  VALIDATION: "Dados inválidos. Verifique os campos.",
  UNKNOWN: "Ocorreu um erro inesperado. Tente novamente."
};

// Função para identificar tipo de erro
export function getApiErrorCode(error: unknown): ApiErrorCode {
  if (!error) return 'UNKNOWN';
  
  const err = error as any;
  
  // Erro de rede (fetch failed, offline)
  if (
    err?.message?.toLowerCase().includes('fetch') || 
    err?.message?.toLowerCase().includes('network') || 
    err?.name === 'TypeError' ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return 'NETWORK';
  }
  
  // Erros HTTP (Supabase ou fetch)
  const status = err?.status || err?.code || err?.statusCode;
  const message = err?.message?.toLowerCase() || '';
  
  if (status === 401 || status === 'PGRST301' || message.includes('jwt') || message.includes('unauthorized')) {
    return 'AUTH';
  }
  if (status === 403 || message.includes('permission') || message.includes('rls') || message.includes('policy')) {
    return 'FORBIDDEN';
  }
  if (status === 404 || err?.code === 'PGRST116' || message.includes('not found')) {
    return 'NOT_FOUND';
  }
  if (status === 422 || message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION';
  }
  if (status >= 500 || message.includes('server') || message.includes('internal')) {
    return 'SERVER';
  }
  
  return 'UNKNOWN';
}

// Função para extrair mensagem de erro
function extractErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido';
  
  const err = error as any;
  return err?.message || err?.error_description || err?.msg || String(error);
}

// Interface para opções do handler
interface HandleApiErrorOptions {
  context?: string; // Ex: "ao carregar vagas"
  showToast?: boolean; // Default: true
  onAuthError?: () => void; // Callback para redirect
}

// Função principal de tratamento de erros
export function handleApiError(
  error: unknown, 
  options?: HandleApiErrorOptions
): { code: ApiErrorCode; message: string } {
  const { context = '', showToast = true, onAuthError } = options || {};
  
  const code = getApiErrorCode(error);
  const baseMessage = USER_FRIENDLY_MESSAGES[code];
  const userMessage = context ? `${baseMessage}` : baseMessage;
  
  // Log detalhado para debug (só em dev)
  const err = error as any;
  logger.error(`[${code}] ${context || 'API Error'}:`, {
    message: extractErrorMessage(error),
    code: err?.code,
    status: err?.status,
    details: err?.details,
    hint: err?.hint,
  });
  
  // Toast amigável
  if (showToast) {
    toast.error(userMessage);
  }
  
  // Ação especial para erro de autenticação
  if (code === 'AUTH' && onAuthError) {
    onAuthError();
  }
  
  return { code, message: userMessage };
}

// Função para redirect em erros de auth
export function redirectToLogin() {
  // Salvar URL atual para redirect após login
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    sessionStorage.setItem('redirectAfterLogin', currentPath);
  }
  window.location.href = '/login';
}

// Wrapper para ações assíncronas com tratamento automático
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  options?: HandleApiErrorOptions
): Promise<{ data: T | null; error: ReturnType<typeof handleApiError> | null }> {
  try {
    const data = await asyncFn();
    return { data, error: null };
  } catch (error) {
    const handledError = handleApiError(error, options);
    return { data: null, error: handledError };
  }
}

// Função para verificar se erro é recuperável (permite retry)
export function isRecoverableError(code: ApiErrorCode): boolean {
  return code === 'NETWORK' || code === 'SERVER' || code === 'UNKNOWN';
}
