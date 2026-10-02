// =============================================================
// App: conecta ao servidor (WebSocket), guarda o estado recebido
// e repassa para a cena (canvas) e o painel.
// =============================================================
import { Cena } from './cena.js';
import { Painel } from './painel.js';
import { api, avisar } from './util.js';

const estado = {
  agentes: new Map(),
  negocios: new Map(),
  log: [],
  contadores: {},
  velocidade: 1,
};

// ---------------------------------------------------------------
// Tema claro/escuro
// ---------------------------------------------------------------
const midiaEscura = matchMedia('(prefers-color-scheme: dark)');
const temaAtual = () => document.documentElement.dataset.theme || (midiaEscura.matches ? 'dark' : 'light');

// ---------------------------------------------------------------
// Cena e painel
// ---------------------------------------------------------------
const cartao = document.getElementById('cartao-agente');
let agenteSelecionado = null;

// Duas visões do mesmo escritório: 2D (pixel art) e 3D (Three.js).
// Ambas recebem os eventos; só a ativa é desenhada.
const cena2d = new Cena(document.getElementById('cena'), { aoClicarAgente: selecionarAgente });
let cena3d = null;
const visoes = () => [cena2d, cena3d].filter(Boolean);
let ativa = cena2d;

const cena = {
  atualizarAgente: (a) => visoes().forEach((v) => v.atualizarAgente(a)),
  selecionar: (id) => visoes().forEach((v) => v.selecionar(id)),
  definirTema: (t) => visoes().forEach((v) => v.definirTema(t)),
  definirVelocidade: (vel) => visoes().forEach((v) => v.definirVelocidade(vel)),
  posicaoNaTela: (id) => ativa.posicaoNaTela(id),
  get elemento() { return ativa.elemento; },
};
const temaCena = () => (temaAtual() === 'dark' ? 'escuro' : 'claro');
cena.definirTema(temaCena());

function escolherVisao(nome) {
  const quer3d = nome === '3d' && cena3d;
  ativa = quer3d ? cena3d : cena2d;
  cena2d.ativar(!quer3d);
  cena3d?.ativar(Boolean(quer3d));
  document.getElementById('botao-centralizar').hidden = !quer3d;
  for (const b of document.querySelectorAll('[data-visao]')) b.setAttribute('aria-pressed', String(b.dataset.visao === (quer3d ? '3d' : '2d')));
  try { localStorage.setItem('br-visao', quer3d ? '3d' : '2d'); } catch (e) { /* sem armazenamento */ }
}

let visaoPreferida = '3d';
try { visaoPreferida = localStorage.getItem('br-visao') || '3d'; } catch (e) { /* padrão: 3D */ }
// ?visao=2d ou ?visao=3d na URL tem prioridade (útil para prints)
const visaoNaUrl = new URLSearchParams(location.search).get('visao');
if (visaoNaUrl === '2d' || visaoNaUrl === '3d') visaoPreferida = visaoNaUrl;
escolherVisao('2d');

// O 3D é carregado à parte: se o computador não tiver WebGL, o 2D continua funcionando
import('./cena3d.js').then(({ Cena3D }) => {
  cena3d = new Cena3D(document.getElementById('cena3d'), { aoClicarAgente: selecionarAgente });
  cena3d.definirTema(temaCena());
  cena3d.definirVelocidade(estado.velocidade);
  for (const a of estado.agentes.values()) cena3d.atualizarAgente(a);
  if (agenteSelecionado) cena3d.selecionar(agenteSelecionado);
  escolherVisao(visaoPreferida);
}).catch((e) => {
  console.warn('Visão 3D indisponível; usando 2D.', e);
  document.querySelector('[data-visao="3d"]').disabled = true;
  document.getElementById('cena3d').hidden = true;
  escolherVisao('2d');
});

document.querySelector('.grupo-visao').addEventListener('click', (e) => {
  const b = e.target.closest('[data-visao]');
  if (b && !b.disabled) escolherVisao(b.dataset.visao);
});
document.getElementById('botao-centralizar').addEventListener('click', () => cena3d?.centralizar());

const painel = new Painel(estado, { aoSelecionarAgente: selecionarAgente });

function selecionarAgente(id) {
  agenteSelecionado = id;
  cena.selecionar(id);
  atualizarCartao();
  if (id) document.getElementById('moldura').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function atualizarCartao() {
  const a = agenteSelecionado && estado.agentes.get(agenteSelecionado);
  if (!a) { cartao.hidden = true; return; }
  cartao.innerHTML = painel.htmlCartaoAgente(a);
  cartao.hidden = false;
  cartao.querySelector('.fechar').addEventListener('click', () => selecionarAgente(null));
  posicionarCartao();
}

function posicionarCartao() {
  if (cartao.hidden || !agenteSelecionado) return;
  const p = cena.posicaoNaTela(agenteSelecionado);
  if (!p) return;
  const alvo = cena.elemento;
  const moldura = document.getElementById('moldura');
  const offX = alvo.offsetLeft + (alvo.offsetParent !== moldura ? alvo.offsetParent?.offsetLeft || 0 : 0);
  const offY = alvo.offsetTop + (alvo.offsetParent !== moldura ? alvo.offsetParent?.offsetTop || 0 : 0);
  const w = cartao.offsetWidth, h = cartao.offsetHeight;
  let x = offX + p.x - w / 2;
  x = Math.max(8, Math.min(moldura.clientWidth - w - 8, x));
  // Acima do personagem; se não couber, abaixo
  let y = offY + p.y - h - 6;
  if (y < 8) y = offY + p.abaixo + 6;
  cartao.style.left = `${x}px`;
  cartao.style.top = `${y}px`;
}
// O cartão acompanha o personagem enquanto ele anda
(function seguir() { posicionarCartao(); requestAnimationFrame(seguir); })();

// ---------------------------------------------------------------
// Eventos do servidor
// ---------------------------------------------------------------
function marcarIA(ia) {
  const selo = document.getElementById('selo-ia');
  selo.classList.toggle('ativa', Boolean(ia?.ativa));
  selo.textContent = ia?.ativa ? 'IA real ligada' : 'Modo simulado';
  selo.title = ia?.ativa
    ? `Os agentes usam a IA real (${ia.modelo}).`
    : 'Sem chave da API: os agentes usam textos simulados. Veja o README para ligar a IA real.';
}

function marcarSupabase(s) {
  const selo = document.getElementById('selo-supabase');
  selo.hidden = !s?.ativo;
  selo.classList.toggle('ativa', Boolean(s?.ativo && !s.erro));
  selo.textContent = s?.erro ? '☁ Supabase com erro' : '☁ Supabase';
  selo.title = s?.erro ? `Erro ao sincronizar: ${s.erro}` : 'Dados espelhados na nuvem (Supabase).';
}

function aplicarRetrato(r) {
  marcarIA(r.ia);
  marcarSupabase(r.supabase);
  estado.velocidade = r.velocidade;
  estado.contadores = r.contadores;
  estado.log = r.log;
  estado.agentes = new Map(r.agentes.map((a) => [a.id, a]));
  estado.negocios = new Map([...r.negocios, ...r.aguardando].map((n) => [n.id, n]));
  for (const a of r.agentes) cena.atualizarAgente(a);
  cena.definirVelocidade(r.velocidade);
  marcarVelocidade(r.velocidade);
  painel.renderContadores();
  painel.renderTime();
  painel.renderAguardando();
  painel.renderNegocios();
  painel.renderLogCompleto();
}

let timerTime = null;
const TRATADORES = {
  retrato: aplicarRetrato,
  agente(a) {
    estado.agentes.set(a.id, a);
    cena.atualizarAgente(a);
    if (a.id === agenteSelecionado) atualizarCartao();
    // Agrupa atualizações seguidas da lista do time
    clearTimeout(timerTime);
    timerTime = setTimeout(() => painel.renderTime(), 60);
  },
  negocio(n) {
    if (!n) return;
    estado.negocios.set(n.id, n);
    painel.renderAguardando();
    painel.renderNegocios();
  },
  log(l) {
    estado.log.push(l);
    if (estado.log.length > 200) estado.log.shift();
    painel.adicionarLog(l);
  },
  contadores(c) {
    estado.contadores = c;
    painel.renderContadores();
  },
  velocidade(v) {
    estado.velocidade = v;
    cena.definirVelocidade(v);
    marcarVelocidade(v);
  },
};

// ---------------------------------------------------------------
// WebSocket com reconexão automática
// ---------------------------------------------------------------
const indicador = document.getElementById('conexao');
function marcarConexao(e, texto) {
  indicador.dataset.estado = e;
  indicador.title = texto;
  indicador.querySelector('.rotulo').textContent = texto;
}

let tentativas = 0;
function conectar() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.addEventListener('open', () => { tentativas = 0; marcarConexao('online', 'Ao vivo'); });
  ws.addEventListener('message', (ev) => {
    const { tipo, dados } = JSON.parse(ev.data);
    TRATADORES[tipo]?.(dados);
  });
  ws.addEventListener('close', () => {
    marcarConexao('offline', 'Reconectando…');
    const espera = Math.min(10000, 500 * 2 ** tentativas++);
    setTimeout(conectar, espera);
  });
}
conectar();

// ---------------------------------------------------------------
// Controles
// ---------------------------------------------------------------
function marcarVelocidade(v) {
  for (const b of document.querySelectorAll('[data-vel]')) b.setAttribute('aria-pressed', String(Number(b.dataset.vel) === v));
}
document.querySelector('.grupo-velocidade').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-vel]');
  if (!b) return;
  try {
    await api('/api/velocidade', { metodo: 'POST', corpo: { valor: Number(b.dataset.vel) } });
  } catch (err) { avisar(err.message, 'erro'); }
});

document.getElementById('botao-tema').addEventListener('click', () => {
  const novo = temaAtual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = novo;
  try { localStorage.setItem('br-tema', novo); } catch (e) { /* sem armazenamento: tudo bem */ }
  cena.definirTema(novo === 'dark' ? 'escuro' : 'claro');
});
midiaEscura.addEventListener('change', () => cena.definirTema(temaAtual() === 'dark' ? 'escuro' : 'claro'));

// Alterna entre "Negócio real" e "Demonstração"
document.querySelector('.alternador').addEventListener('click', (e) => {
  const b = e.target.closest('[data-form]');
  if (!b) return;
  for (const x of document.querySelectorAll('.alternador [data-form]')) x.setAttribute('aria-pressed', String(x === b));
  document.getElementById('form-negocio').hidden = b.dataset.form !== 'negocio';
  document.getElementById('form-pedido').hidden = b.dataset.form !== 'demo';
});

document.getElementById('form-negocio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const botao = form.querySelector('[type=submit]');
  botao.disabled = true;
  try {
    const dados = Object.fromEntries(new FormData(form));
    await api('/api/negocios', { metodo: 'POST', corpo: dados });
    form.reset();
    avisar(`${dados.nome} entregue ao Gerente Henrique!`);
  } catch (err) {
    avisar(err.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

document.getElementById('form-pedido').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const botao = form.querySelector('button');
  botao.disabled = true;
  try {
    await api('/api/pedidos', { metodo: 'POST', corpo: { texto: form.texto.value, quantidade: Number(form.quantidade.value) } });
    form.texto.value = '';
    avisar('Pedido entregue ao Gerente!');
  } catch (err) {
    avisar(err.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

// Clicar fora do mapa fecha o cartão do agente
document.addEventListener('click', (e) => {
  if (!agenteSelecionado) return;
  if (e.target.closest('#cena, #cena3d, #cartao-agente, .lista-time')) return;
  selecionarAgente(null);
});
