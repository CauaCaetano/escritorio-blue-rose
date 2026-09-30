// =============================================================
// WhatsApp: só MONTA links com o texto pronto. Nada é enviado
// automaticamente; quem clica em "enviar" no WhatsApp é você.
// =============================================================

/**
 * Normaliza um número brasileiro para o formato internacional só com
 * dígitos (ex.: "(16) 98765-4321" → "5516987654321").
 * Retorna null se vier vazio; lança erro se for inválido.
 */
export function normalizarWhatsapp(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) return digitos;
  throw new Error('WhatsApp inválido. Use DDD + número, ex.: (16) 99999-9999.');
}

/** Links para abrir a conversa com a mensagem já digitada */
export function linksWhatsapp(numero, mensagem) {
  const texto = encodeURIComponent(mensagem || '');
  return {
    web: numero ? `https://web.whatsapp.com/send?phone=${numero}&text=${texto}` : `https://web.whatsapp.com/send?text=${texto}`,
    app: numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`,
  };
}
