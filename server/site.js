// =============================================================
// O site da BLUE ROSE como ferramenta do time
// -------------------------------------------------------------
// Os agentes usam o site para divulgar a BLUE ROSE: cada negócio
// recebe o link do exemplo do nicho dele, com uma marca de origem
// (?origem=...) para sabermos de onde veio cada contato.
// O formulário do site devolve essa origem junto com o pedido.
// =============================================================
import { config } from './config.js';

// Ordem importa: o primeiro padrão que bater define o exemplo
const NICHOS = [
  [/odont|dentist|dental/i, 'demo-odonto-index.html'],
  [/fisio|pilates|quiropr|reabilita/i, 'demo-fisio-index.html'],
  [/personal|academia|treino|crossfit|funcional/i, 'demo-personal-index.html'],
  [/est[eé]tic|sobrancelha|depila|manicure|unha|spa\b|massag/i, 'demo-estetica-index.html'],
  [/sal[aã]o|barbe|cabel|beleza|maquia|trancista/i, 'demo-salao-index.html'],
  [/restaurante|lanchonete|pizzaria|hamburg|caf[eé]|padaria|doceria|confeitaria|marmit|a[cç]a[ií]/i, 'demo-restaurante.html'],
];

export const PAGINAS = {
  inicio: '',
  projetos: 'projetos.html',
  exemplos: 'exemplos.html',
  demonstracao: '#demo',
  contato: '#contato',
};

/** Página de exemplo mais parecida com o negócio (ou a lista de exemplos) */
export function exemploDoNicho(tipo) {
  const achado = NICHOS.find(([padrao]) => padrao.test(tipo || ''));
  return achado ? achado[1] : PAGINAS.exemplos;
}

/** Marca de origem curta e segura para URL: "redator-n12" */
export function marcaOrigem(agente, negocioId) {
  const base = String(agente || 'time').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'time';
  return negocioId ? `${base}-n${negocioId}` : base;
}

/** Link absoluto para uma página do site, com ?origem= antes da âncora */
export function linkSite(caminho = '', origem) {
  const base = config.siteUrl.endsWith('/') ? config.siteUrl : `${config.siteUrl}/`;
  const [pagina, ancora] = String(caminho).split('#');
  const consulta = origem ? `?origem=${encodeURIComponent(origem)}` : '';
  return `${base}${pagina}${consulta}${ancora ? `#${ancora}` : ''}`;
}

/** Os links que um agente pode usar ao falar com este negócio */
export function linksParaNegocio(negocio, agente) {
  const origem = marcaOrigem(agente, negocio?.id);
  return {
    exemplo: linkSite(exemploDoNicho(negocio?.tipo), origem),
    site: linkSite('', origem),
    projetos: linkSite(PAGINAS.projetos, origem),
  };
}
