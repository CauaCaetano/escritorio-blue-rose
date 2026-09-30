// Utilitários do painel

/** Escapa texto para inserir em HTML com segurança */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function hora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function dataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Chamada à API REST; lança erro com a mensagem do servidor */
export async function api(url, { metodo = 'GET', corpo } = {}) {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.erro || `Erro ${r.status}`);
  return json;
}

/** Mostra um aviso rápido no rodapé */
export function avisar(texto, tipo = 'info') {
  // Se houver um diálogo aberto, o aviso aparece dentro dele (senão fica escurecido atrás)
  const dialogo = document.querySelector('dialog[open]');
  let caixa = document.getElementById('avisos');
  if (dialogo) {
    caixa = dialogo.querySelector('.avisos') || dialogo.appendChild(Object.assign(document.createElement('div'), { className: 'avisos' }));
  }
  const el = document.createElement('div');
  el.className = `aviso ${tipo}`;
  el.textContent = texto;
  caixa.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/** Copia texto; usa um plano B quando o navegador bloqueia a área de transferência */
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    // Com um diálogo aberto, o resto da página fica inerte: o campo precisa ficar dentro dele
    (document.querySelector('dialog[open]') || document.body).appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** Links do WhatsApp com o texto pronto (quem envia é você) */
export function linksWhatsapp(numero, mensagem) {
  const texto = encodeURIComponent(mensagem || '');
  return {
    web: numero ? `https://web.whatsapp.com/send?phone=${numero}&text=${texto}` : `https://web.whatsapp.com/send?text=${texto}`,
    app: numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`,
  };
}

/** "5516987654321" → "(16) 98765-4321" */
export function formatarWhatsapp(n) {
  if (!n) return '';
  const d = n.replace(/^55/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

export const ROTULO_ESTADO = {
  parado: 'Parado', andando: 'Andando', digitando: 'Digitando', lendo: 'Lendo', esperando: 'Esperando',
};

export const ROTULO_STATUS = {
  em_andamento: 'Em andamento', em_ajuste: 'Em ajuste', aguardando_aprovacao: 'Aguardando você', aprovado: 'Aprovado',
};

export const ROTULO_ETAPA = {
  prospeccao: 'Prospecção', redacao: 'Redação', previa: 'Prévia', revisao: 'Revisão',
  atendimento: 'Atendimento', consolidacao: 'Com o Gerente', aprovacao: 'Sua aprovação',
  aprovado: 'Aprovado', ajuste: 'Ajuste pedido',
};
