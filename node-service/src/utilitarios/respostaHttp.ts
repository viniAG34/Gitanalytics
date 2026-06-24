// Funções puras para formatar respostas HTTP — SDD-01, seção 4.3

export function responderComSucesso<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function responderComErro(
  code: string,
  message: string,
): { success: false; error: { code: string; message: string } } {
  return { success: false, error: { code, message } };
}
