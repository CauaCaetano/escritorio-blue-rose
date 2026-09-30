// =============================================================
// Cena: desenha o escritório e anima os agentes.
// -------------------------------------------------------------
// O backend decide TUDO (para onde cada agente vai, o que faz).
// Aqui só interpolamos o caminho recebido para a animação ficar
// suave, e desenhamos o quadro a quadro.
// =============================================================
import { TILE, COLS, ROWS, MESAS, LUZES } from '/shared/layout.js';
import { criarMapa } from './pixel/mapa.js';
import { desenharPersonagem } from './pixel/personagem.js';
import { desenharBalao } from './pixel/baloes.js';
import { ret } from './pixel/util.js';

const LARGURA = COLS * TILE;   // 480
const ALTURA = ROWS * TILE;    // 320
const DIRECOES = { '1,0': 'direita', '-1,0': 'esquerda', '0,1': 'baixo', '0,-1': 'cima' };

export class Cena {
  constructor(canvas, { aoClicarAgente }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mundo = document.createElement('canvas');   // resolução nativa 480x320
    this.mundo.width = LARGURA;
    this.mundo.height = ALTURA;
    this.mctx = this.mundo.getContext('2d');
    this.agentes = new Map();
    this.velocidade = 1;
    this.selecionado = null;
    this.escala = 1;
    this.aoClicarAgente = aoClicarAgente;
    this.definirTema('claro');

    canvas.addEventListener('click', (e) => this.clique(e));
    new ResizeObserver(() => this.ajustarTamanho()).observe(canvas.parentElement);
    window.addEventListener('resize', () => this.ajustarTamanho());
    this.ajustarTamanho();

    this.ultimo = performance.now();
    requestAnimationFrame((ts) => this.quadro(ts));
  }

  definirTema(tema) {
    this.noite = tema === 'escuro';
    this.mapa = criarMapa(this.noite ? 'escuro' : 'claro');
  }

  definirVelocidade(v) { this.velocidade = v; }

  // ---------------------------------------------------------------
  // Estado vindo do servidor
  // ---------------------------------------------------------------
  atualizarAgente(d) {
    let r = this.agentes.get(d.id);
    if (!r) {
      r = { px: d.x * TILE, py: d.y * TILE, dir: d.dir, movId: null, pts: null, prog: 0 };
      this.agentes.set(d.id, r);
    }
    r.dados = d;
    if (d.movimento) {
      const m = d.movimento;
      const progServidor = m.decorrido / m.passoMs;
      if (r.movId !== m.id) {
        r.movId = m.id;
        r.pts = [m.de, ...m.caminho];
        r.passoMs = m.passoMs;
      }
      r.prog = progServidor;       // ressincroniza (ex.: mudou a velocidade)
    } else {
      r.movId = null;
      r.pts = null;
      r.px = d.x * TILE;
      r.py = d.y * TILE;
      r.dir = d.dir;
    }
  }

  selecionar(id) { this.selecionado = id; }

  /** Posição (em px CSS, relativa ao canvas) acima da cabeça do agente */
  posicaoNaTela(id) {
    const r = this.agentes.get(id);
    if (!r) return null;
    const k = this.canvas.clientWidth / LARGURA;
    return { x: (r.px + 8) * k, y: (r.py - 6) * k, abaixo: (r.py + 18) * k };
  }

  // ---------------------------------------------------------------
  // Tamanho: escala inteira quando possível (pixels nítidos)
  // ---------------------------------------------------------------
  ajustarTamanho() {
    const pai = this.canvas.parentElement;
    const estilo = getComputedStyle(pai);
    const disponivel = pai.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    const alturaMax = Math.max(260, window.innerHeight - 190);
    const dpr = window.devicePixelRatio || 1;
    let s = Math.min(disponivel / LARGURA, alturaMax / ALTURA) * dpr;
    if (s >= 2) s = Math.floor(s);
    s = Math.max(s, 0.5);
    if (s === this.escala && this.canvas.width === Math.round(LARGURA * s)) return;
    this.escala = s;
    this.canvas.width = Math.round(LARGURA * s);
    this.canvas.height = Math.round(ALTURA * s);
    this.canvas.style.width = `${(LARGURA * s) / dpr}px`;
    this.canvas.style.height = `${(ALTURA * s) / dpr}px`;
  }

  // ---------------------------------------------------------------
  // Clique em personagem
  // ---------------------------------------------------------------
  clique(e) {
    const rect = this.canvas.getBoundingClientRect();
    const wx = ((e.clientX - rect.left) / rect.width) * LARGURA;
    const wy = ((e.clientY - rect.top) / rect.height) * ALTURA;
    let melhor = null, menor = Infinity;
    for (const [id, r] of this.agentes) {
      const cx = r.px + 8, cy = r.py + 6;
      const dx = Math.abs(wx - cx), dy = wy - cy;
      if (dx <= 9 && dy >= -14 && dy <= 12) {
        const d = dx * dx + dy * dy;
        if (d < menor) { menor = d; melhor = id; }
      }
    }
    this.aoClicarAgente(melhor);
  }

  // ---------------------------------------------------------------
  // Laço de animação
  // ---------------------------------------------------------------
  quadro(ts) {
    const dt = Math.min(0.1, (ts - this.ultimo) / 1000);
    this.ultimo = ts;
    const t = ts / 1000;
    this.animar(dt);
    this.desenharMundo(t);
    this.desenharTela();
    requestAnimationFrame((n) => this.quadro(n));
  }

  animar(dt) {
    for (const r of this.agentes.values()) {
      if (!r.pts) { r.andando = false; continue; }
      r.prog += (dt * 1000 * this.velocidade) / r.passoMs;
      const fim = r.pts.length - 1;
      if (r.prog >= fim) r.prog = fim;
      const seg = Math.min(Math.floor(r.prog), fim - 1);
      const f = r.prog - seg;
      const a = r.pts[seg], b = r.pts[seg + 1];
      r.px = (a.x + (b.x - a.x) * f) * TILE;
      r.py = (a.y + (b.y - a.y) * f) * TILE;
      r.dir = DIRECOES[`${b.x - a.x},${b.y - a.y}`] || r.dir;
      r.andando = r.prog < fim;
    }
  }

  desenharMundo(t) {
    const ctx = this.mctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.mapa, 0, 0);

    // Personagens e cadeiras ordenados por profundidade (y)
    const itens = [];
    for (const [id, m] of Object.entries(MESAS)) {
      itens.push({ y: m.assento.y * TILE + 8.5, desenhar: () => cadeira(ctx, m.assento.x * TILE, m.assento.y * TILE, id) });
    }
    for (const [id, r] of this.agentes) {
      itens.push({ y: r.py + 8, desenhar: () => this.desenharAgente(ctx, id, r, t) });
    }
    itens.sort((a, b) => a.y - b.y).forEach((i) => i.desenhar());

    // Noite: escurece o ambiente (monitores e balões ficam por cima, acesos)
    if (this.noite) {
      ctx.fillStyle = 'rgba(8, 12, 38, 0.42)';
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }
    luzes(ctx, this.noite);

    // Telas dos monitores
    for (const [id, m] of Object.entries(MESAS)) {
      const r = this.agentes.get(id);
      const d = r?.dados;
      const naMesa = d && !r.andando && d.sentado && d.x === m.assento.x && d.y === m.assento.y;
      const modo = naMesa && (d.estado === 'digitando' || d.estado === 'lendo') ? d.estado : 'desligado';
      tela(ctx, m.monitor.x * TILE, m.monitor.y * TILE, modo, t, this.noite);
    }

    // Balões
    for (const r of this.agentes.values()) {
      const d = r.dados;
      if (!d?.balao || r.andando) continue;
      // Sentado: o balão vai para o lado, para não esconder a tela do monitor
      const sentado = d.sentado && !r.andando;
      desenharBalao(ctx, d.balao, Math.round(r.px) + (sentado ? 17 : 8), Math.round(r.py) + (sentado ? -5 : -3), t);
    }
  }

  desenharAgente(ctx, id, r, t) {
    const d = r.dados;
    if (!d) return;
    const sentado = d.sentado && !r.andando;
    const ox = Math.round(r.px);
    const oy = Math.round(r.py) - (sentado ? 7 : 2);

    // Destaque do selecionado
    if (this.selecionado === id) {
      ctx.fillStyle = d.visual.camisa;
      ctx.globalAlpha = 0.45 + Math.sin(t * 5) * 0.15;
      ctx.fillRect(ox + 2, Math.round(r.py) + 12, 12, 3);
      ctx.fillRect(ox + 4, Math.round(r.py) + 11, 8, 5);
      ctx.globalAlpha = 1;
    }

    const quadro = r.andando ? [1, 0, 2, 0][Math.floor(r.prog * 4) % 4] : 0;
    desenharPersonagem(ctx, ox, oy, d.visual, {
      dir: r.dir || d.dir, quadro, sentado, digitando: sentado && d.estado === 'digitando', t,
    });
  }

  /** Copia o mundo ampliado (sem suavização) e escreve os nomes nítidos */
  desenharTela() {
    const ctx = this.ctx, s = this.escala;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.mundo, 0, 0, LARGURA * s, ALTURA * s);

    const dpr = window.devicePixelRatio || 1;
    const fonte = Math.round(Math.max(8.5, Math.min(11.5, s * 2.9 / dpr)) * dpr);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const [id, r] of this.agentes) {
      const d = r.dados;
      if (!d) continue;
      // Rótulo "Nome · Cargo": nome em branco, cargo em dourado
      const sentado = d.sentado && !r.andando;
      const nome = d.nome, cargo = ` · ${d.cargo}`;
      ctx.font = `600 ${fonte}px Inter, system-ui, sans-serif`;
      const wNome = ctx.measureText(nome).width;
      ctx.font = `500 ${fonte}px Inter, system-ui, sans-serif`;
      const wCargo = ctx.measureText(cargo).width;
      const x = (r.px + 8) * s;
      const y = (r.py + (sentado ? 13 : 15)) * s + fonte * 0.7;
      const w = wNome + wCargo + fonte * 1.0;
      const h = fonte * 1.5;
      ctx.fillStyle = this.selecionado === id ? '#1f3a8a' : 'rgba(10, 13, 30, 0.82)';
      arredondado(ctx, x - w / 2, y - h / 2, w, h, h / 2);
      ctx.strokeStyle = this.selecionado === id ? '#e6c878' : 'rgba(201,165,74,.55)';
      ctx.lineWidth = Math.max(1, dpr * 0.8);
      ctx.stroke();
      let tx = x - w / 2 + fonte * 0.5;
      ctx.font = `600 ${fonte}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(nome, tx, y + 0.5);
      tx += wNome;
      ctx.font = `500 ${fonte}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#e6c878';
      ctx.fillText(cargo, tx, y + 0.5);
    }
  }
}

// ---------------------------------------------------------------
// Peças dinâmicas
// ---------------------------------------------------------------
/** Poltrona executiva de couro (a do Gerente é mais alta e caramelo) */
function cadeira(ctx, px, py, dono) {
  const executiva = dono === 'gerente';
  const couro = executiva ? '#5b3320' : '#16161c';
  const brilho = executiva ? '#7a4a30' : '#2e2e38';
  const topo = executiva ? 1 : 3;
  ret(ctx, px + 3, py + topo, 10, 11 - topo, couro);
  ret(ctx, px + 4, py + topo, 8, 1, brilho);
  ret(ctx, px + 3, py + topo + 1, 1, 9 - topo, brilho);
  // Costuras horizontais do encosto
  const costura = executiva ? '#43240f' : '#0a0a0e';
  ret(ctx, px + 5, py + topo + 3, 6, 1, costura);
  ret(ctx, px + 5, py + topo + 6, 6, 1, costura);
  // Base dourada com rodízios
  ret(ctx, px + 7, py + 11, 2, 2, '#c9a54a');
  ret(ctx, px + 4, py + 13, 8, 1, '#8f7230');
  ret(ctx, px + 4, py + 14, 1, 1, '#0f1119'); ret(ctx, px + 11, py + 14, 1, 1, '#0f1119');
}

/** Focos de luz quentes no piso (mais fortes à noite) */
function luzes(ctx, noite) {
  for (const l of LUZES) {
    const cx = l.x * TILE, cy = l.y * TILE, r = l.r * TILE;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, noite ? 'rgba(255,214,150,.30)' : 'rgba(255,230,190,.16)');
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}

function tela(ctx, mx, my, modo, t, noite) {
  const x = mx + 3, y = my - 2, w = 10, h = 7;
  if (modo === 'desligado') {
    ret(ctx, x, y, w, h, '#1b2030');
    ret(ctx, x + 1, y + 1, 2, 1, '#2d3448');
    return;
  }
  // Brilho em volta do monitor ligado
  ctx.fillStyle = noite ? 'rgba(120,160,255,.16)' : 'rgba(120,160,255,.10)';
  ctx.fillRect(x - 4, y - 3, w + 8, h + 9);
  ctx.fillRect(x - 2, y - 2, w + 4, h + 6);
  if (modo === 'digitando') {
    ret(ctx, x, y, w, h, '#2b5fd9');
    const linhas = [7, 5, 8, 4];
    const progresso = Math.floor(t * 6) % 24;
    linhas.forEach((len, i) => {
      const visivel = Math.max(0, Math.min(len, progresso - i * 6));
      if (visivel) ret(ctx, x + 1, y + 1 + i * 1.5, visivel, 1, '#cfe0ff');
    });
    if (Math.floor(t * 3) % 2) ret(ctx, x + 1 + Math.min(8, progresso % 9), y + 5, 1, 1, '#ffffff');
  } else {
    // Lendo: página clara rolando devagar
    ret(ctx, x, y, w, h, '#eef3ff');
    const desloc = Math.floor(t * 2) % 2;
    for (let i = 0; i < 3; i++) ret(ctx, x + 1, y + 1 + i * 2 + desloc, [8, 6, 7][i], 1, '#9aa6c4');
  }
}

function arredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
