// =============================================================
// Mapa estático do escritório BLUE ROSE — estilo "penthouse"
// -------------------------------------------------------------
// Piso de mármore, sala do Gerente em madeira espinha-de-peixe,
// divisórias de vidro com perfis dourados, janelas panorâmicas com
// a cidade ao fundo, móveis em nogueira escura e detalhes em dourado.
// Gera um canvas de 480x320 px, redesenhado só quando o tema muda.
// =============================================================
import { TILE, COLS, ROWS, MAPA, MESAS, OBJETOS } from '/shared/layout.js';
import { ret, sombrear, textoPixel, larguraTextoPixel, rosaAzul } from './util.js';

const OURO = '#c9a54a';
const OURO_CLARO = '#e6c878';
const OURO_ESCURO = '#8f7230';

const PALETAS = {
  claro: {
    parede: '#18213f', paredeBaixa: '#101832', friso: OURO,
    marmore: '#ece6da', marmoreVeio: '#d9d1c2', marmoreJunta: '#d2c9b8',
    madeira: ['#6b4630', '#5d3c28'], madeiraJunta: '#4a2f1f',
    ceuCima: '#8ec5ea', ceuBaixo: '#dff0fb', predio: ['#6f86a8', '#8aa0c0', '#5c7496'], janelaPredio: '#cfe3f5', noite: false,
  },
  escuro: {
    parede: '#121a33', paredeBaixa: '#0b1127', friso: OURO,
    marmore: '#e2dbcd', marmoreVeio: '#cfc6b5', marmoreJunta: '#c6bca9',
    madeira: ['#633f2b', '#553623'], madeiraJunta: '#43291a',
    ceuCima: '#070c24', ceuBaixo: '#1c2a5e', predio: ['#141d3d', '#1a2550', '#0f1733'], janelaPredio: '#f3cf6e', noite: true,
  },
};

export function criarMapa(tema) {
  const P = PALETAS[tema] || PALETAS.claro;
  const c = document.createElement('canvas');
  c.width = COLS * TILE;
  c.height = ROWS * TILE;
  const ctx = c.getContext('2d');

  // 1) Piso e paredes
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = MAPA[y][x];
      const px = x * TILE, py = y * TILE;
      if (t === 'W' || t === 'N') parede(ctx, P, px, py, y);
      else if (t === 'B') rodapeInferior(ctx, P, px, py);
      else if (salaGerente(x, y)) madeira(ctx, P, px, py);
      else marmore(ctx, P, px, py);
    }
  }
  tapeteGerente(ctx);

  // Sombra da parede sobre o piso
  ctx.fillStyle = 'rgba(10,12,30,.22)';
  ctx.fillRect(0, 2 * TILE, COLS * TILE, 3);
  ctx.fillStyle = 'rgba(10,12,30,.10)';
  ctx.fillRect(0, 2 * TILE + 3, COLS * TILE, 3);

  // Janelas panorâmicas (2x2 tiles)
  for (let x = 0; x < COLS; x++) {
    if (MAPA[0][x] === 'N' && MAPA[0][x - 1] !== 'N') janela(ctx, P, x * TILE, x);
  }

  // Divisórias de vidro e portas
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (MAPA[y][x] === 'P') divisoria(ctx, x, y);
      if (MAPA[y][x] === 'D') porta(ctx, x * TILE, y * TILE);
    }
  }

  // 2) Tapetes (por baixo dos móveis)
  for (const o of OBJETOS) if (o.tipo === 'tapeteLounge') tapeteLounge(ctx, o);
  for (const o of OBJETOS) if (o.tipo === 'tapeteMesa') tapeteMesa(ctx, o);

  // 3) Móveis, de cima para baixo (profundidade)
  const itens = [
    ...OBJETOS.filter((o) => !o.tipo.startsWith('tapete')),
    ...Object.entries(MESAS).map(([dono, m]) => ({ tipo: 'mesa', dono, ...m.mesa, monitor: m.monitor })),
  ].sort((a, b) => a.y - b.y);
  for (const o of itens) MOVEIS[o.tipo]?.(ctx, o, P);
  return c;
}

const salaGerente = (x, y) => x <= 9 && y >= 2 && y <= 8;

// ---------------------------------------------------------------
// Pisos e paredes
// ---------------------------------------------------------------
function parede(ctx, P, px, py, y) {
  if (y === 0) {
    // Sanca e friso dourado no topo
    ret(ctx, px, py, TILE, 3, '#0a0f22');
    ret(ctx, px, py + 3, TILE, 1, P.friso);
    ret(ctx, px, py + 4, TILE, 12, P.parede);
    // Painéis (boiserie)
    ret(ctx, px + 2, py + 7, 12, 9, sombrear(P.parede, -0.06));
    ret(ctx, px + 2, py + 7, 12, 1, sombrear(P.parede, -0.14));
  } else {
    ret(ctx, px, py, TILE, TILE, P.parede);
    ret(ctx, px + 2, py, 12, 5, sombrear(P.parede, -0.06));
    // Lambri inferior com filete dourado
    ret(ctx, px, py + 6, TILE, 1, OURO_ESCURO);
    ret(ctx, px, py + 7, TILE, 6, P.paredeBaixa);
    ret(ctx, px + 2, py + 8, 12, 4, sombrear(P.paredeBaixa, -0.08));
    ret(ctx, px, py + 13, TILE, 1, P.friso);
    ret(ctx, px, py + 14, TILE, 2, '#0a0f22');
  }
}

function marmore(ctx, P, px, py) {
  ret(ctx, px, py, TILE, TILE, P.marmore);
  // Placas grandes de 32px com junta fina
  if ((px / TILE) % 2 === 0) ret(ctx, px, py, 1, TILE, P.marmoreJunta);
  if ((py / TILE) % 2 === 0) ret(ctx, px, py, TILE, 1, P.marmoreJunta);
  // Veios diagonais, pseudoaleatórios mas estáveis
  const s = (px * 7 + py * 13) % 29;
  for (let i = 0; i < 6; i++) {
    const vx = px + ((s + i * 5) % 14) + 1, vy = py + ((s * 3 + i * 3) % 13) + 1;
    ret(ctx, vx, vy, 2, 1, P.marmoreVeio);
    if (i % 2) ret(ctx, vx + 2, vy + 1, 1, 1, P.marmoreVeio);
  }
  // Brilho sutil (piso polido)
  if (s % 5 === 0) ret(ctx, px + 4, py + 3, 3, 1, 'rgba(255,255,255,.5)');
}

function madeira(ctx, P, px, py) {
  // Espinha-de-peixe: tacos de 8x4 alternando direção
  for (let by = 0; by < TILE; by += 4) {
    for (let bx = 0; bx < TILE; bx += 8) {
      const alterna = ((px + bx) / 8 + (py + by) / 4) % 2 === 0;
      ret(ctx, px + bx, py + by, 8, 4, P.madeira[alterna ? 0 : 1]);
      if (alterna) ret(ctx, px + bx, py + by, 1, 4, P.madeiraJunta);
      else ret(ctx, px + bx, py + by + 3, 8, 1, P.madeiraJunta);
    }
  }
}

function rodapeInferior(ctx, P, px, py) {
  ret(ctx, px, py, TILE, 1, P.friso);
  ret(ctx, px, py + 1, TILE, 15, '#0a0f22');
}

function tapeteGerente(ctx) {
  let x0 = COLS, y0 = ROWS, x1 = 0, y1 = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (MAPA[y][x] === 'C') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  const px = x0 * TILE + 3, py = y0 * TILE + 3;
  const w = (x1 - x0 + 1) * TILE - 6, h = (y1 - y0 + 1) * TILE - 6;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(px + 1, py + 2, w, h);
  ret(ctx, px, py, w, h, '#16286b');
  ret(ctx, px + 2, py + 2, w - 4, h - 4, OURO);
  ret(ctx, px + 3, py + 3, w - 6, h - 6, '#1f3a8a');
  // Padrão damasco discreto
  for (let yy = py + 7; yy < py + h - 7; yy += 8) {
    for (let xx = px + 7 + (((yy - py) / 8) % 2) * 4; xx < px + w - 7; xx += 8) {
      ret(ctx, xx, yy, 1, 1, '#3558b8'); ret(ctx, xx - 1, yy + 1, 3, 1, '#2b4aa3'); ret(ctx, xx, yy + 2, 1, 1, '#3558b8');
    }
  }
  ret(ctx, px + 6, py + 6, w - 12, 1, OURO_ESCURO);
  ret(ctx, px + 6, py + h - 7, w - 12, 1, OURO_ESCURO);
  // Medalhão dourado com a rosa no centro-inferior
  const cx = px + Math.floor(w / 2), cy = py + h - 18;
  ret(ctx, cx - 7, cy - 1, 14, 11, OURO_ESCURO);
  ret(ctx, cx - 6, cy, 12, 9, '#16286b');
  rosaAzul(ctx, cx - 3, cy + 2);
}

function janela(ctx, P, px, x) {
  const x0 = px + 2, y0 = 5, w = 28, h = 22;
  ret(ctx, x0 - 2, y0 - 2, w + 4, h + 4, OURO_ESCURO);
  ret(ctx, x0 - 1, y0 - 1, w + 2, h + 2, OURO);
  for (let i = 0; i < h; i++) {
    ctx.fillStyle = misturar(P.ceuCima, P.ceuBaixo, i / h);
    ctx.fillRect(x0, y0 + i, w, 1);
  }
  if (P.noite) {
    for (let i = 0; i < 7; i++) ret(ctx, x0 + ((i * 11 + x * 5) % w), y0 + ((i * 7 + x) % 9), 1, 1, '#f4f1d0');
    if (x === 15) { ret(ctx, x0 + 19, y0 + 2, 4, 4, '#f7f0c6'); ret(ctx, x0 + 21, y0 + 2, 2, 2, P.ceuCima); }
  }
  // Silhueta da cidade
  let bx = x0;
  let i = x;
  while (bx < x0 + w) {
    const bw = 3 + (i * 7) % 4;
    const bh = 6 + (i * 13) % 11;
    const cor = P.predio[i % P.predio.length];
    const largura = Math.min(bw, x0 + w - bx);
    ret(ctx, bx, y0 + h - bh, largura, bh, cor);
    for (let wy = y0 + h - bh + 2; wy < y0 + h - 1; wy += 3) {
      for (let wx = bx + 1; wx < bx + largura - 1; wx += 2) {
        if ((wx * 3 + wy * 5 + i) % (P.noite ? 3 : 5) === 0) ret(ctx, wx, wy, 1, 1, P.janelaPredio);
      }
    }
    bx += bw;
    i++;
  }
  // Caixilho fino dourado e reflexo
  ret(ctx, x0 + Math.floor(w / 2), y0, 1, h, OURO);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x0 + 2, y0 + 1, 1, 8);
  ctx.fillRect(x0 + 4, y0 + 1, 1, 4);
  ctx.fillRect(x0 + w / 2 + 3, y0 + 1, 1, 6);
  // Cortinas laterais em veludo azul
  ret(ctx, x0 - 3, y0 - 3, 2, h + 7, '#23357a');
  ret(ctx, x0 + w + 1, y0 - 3, 2, h + 7, '#23357a');
  ret(ctx, x0 - 3, y0 - 3, 1, h + 7, '#2f46a0');
  ret(ctx, x0 + w + 1, y0 - 3, 1, h + 7, '#2f46a0');
}

function misturar(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return `rgb(${c.join(',')})`;
}

function divisoria(ctx, x, y) {
  const px = x * TILE, py = y * TILE;
  const cima = MAPA[y - 1]?.[x], baixo = MAPA[y + 1]?.[x];
  const vertical = (cima === 'P' || cima === 'D' || cima === 'W') && (baixo === 'P' || baixo === 'D') && MAPA[y][x - 1] !== 'P';
  if (vertical) {
    // Vidro visto de cima: faixa translúcida entre perfis dourados
    ctx.fillStyle = 'rgba(160,200,235,.45)';
    ctx.fillRect(px + 6, py, 4, TILE);
    ret(ctx, px + 6, py, 1, TILE, OURO);
    ret(ctx, px + 9, py, 1, TILE, OURO_ESCURO);
    if (y % 2 === 0) ret(ctx, px + 5, py, 6, 2, OURO);
  } else {
    // Parede de vidro de frente: perfil dourado em cima e embaixo
    ret(ctx, px, py + 1, TILE, 2, OURO);
    ctx.fillStyle = 'rgba(170,205,240,.42)';
    ctx.fillRect(px, py + 3, TILE, 10);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(px + ((x * 5) % 12), py + 4, 1, 8);
    ctx.fillRect(px + ((x * 5) % 12) + 2, py + 4, 1, 4);
    ret(ctx, px, py + 13, TILE, 2, OURO_ESCURO);
    ret(ctx, px + 15, py + 1, 1, 14, OURO);
    if (x === 10) { ret(ctx, px + 5, py, 6, 3, OURO); }
  }
}

function porta(ctx, px, py) {
  ret(ctx, px + 5, py, 6, TILE, '#b89a5a');
  ret(ctx, px + 5, py, 1, TILE, OURO_ESCURO);
  ret(ctx, px + 10, py, 1, TILE, OURO_ESCURO);
}

function tapeteLounge(ctx, o) {
  const px = o.x * TILE + 2, py = o.y * TILE + 2, w = o.w * TILE - 4, h = o.h * TILE - 4;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(px + 1, py + 2, w, h);
  ret(ctx, px, py, w, h, '#e9dfc9');
  ret(ctx, px + 2, py + 2, w - 4, h - 4, '#1a2a63');
  ret(ctx, px + 4, py + 4, w - 8, h - 8, '#223579');
  // Borda geométrica dourada
  for (let xx = px + 3; xx < px + w - 3; xx += 4) { ret(ctx, xx, py + 3, 2, 1, OURO); ret(ctx, xx, py + h - 4, 2, 1, OURO); }
  for (let yy = py + 3; yy < py + h - 3; yy += 4) { ret(ctx, px + 3, yy, 1, 2, OURO); ret(ctx, px + w - 4, yy, 1, 2, OURO); }
}

/** Tapete grafite com filete dourado sob cada estação de trabalho */
function tapeteMesa(ctx, o) {
  const px = o.x * TILE + 3, py = o.y * TILE + 6, w = o.w * TILE - 6, h = o.h * TILE - 8;
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.fillRect(px + 1, py + 2, w, h);
  // Cor do departamento (vendas, marketing ou tecnologia), se houver
  ret(ctx, px, py, w, h, o.cor ? sombrear(o.cor, 0.3) : '#2a2f45');
  ret(ctx, px + 2, py + 2, w - 4, h - 4, o.cor || '#343a55');
  ctx.strokeStyle = 'rgba(201,165,74,.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 3.5, py + 3.5, w - 7, h - 7);
  for (let xx = px + 6; xx < px + w - 6; xx += 6) ret(ctx, xx, py + h - 6, 2, 1, '#454c6e');
}

// ---------------------------------------------------------------
// Móveis
// ---------------------------------------------------------------
function sombraMovel(ctx, x, y, w, h = 2) {
  ctx.fillStyle = 'rgba(15,10,5,.28)';
  ctx.fillRect(x, y, w, h);
}

const MOVEIS = {
  mesa(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    const executiva = o.dono === 'gerente';
    sombraMovel(ctx, px + 2, py + 15, W - 3, 2);
    // Tampo de nogueira com borda dourada
    ret(ctx, px + 1, py + 2, W - 2, 11, executiva ? '#3d2415' : '#4a2f1e');
    ret(ctx, px + 1, py + 2, W - 2, 1, OURO);
    ret(ctx, px + 2, py + 3, W - 4, 1, executiva ? '#5a3822' : '#5f3d27');
    ret(ctx, px + 1, py + 13, W - 2, 3, executiva ? '#2a180d' : '#321f13');
    ret(ctx, px + 1, py + 13, W - 2, 1, OURO_ESCURO);
    // Pés dourados
    ret(ctx, px + 2, py + 15, 1, 1, OURO); ret(ctx, px + W - 3, py + 15, 1, 1, OURO);
    // Base de couro (sob o teclado)
    const mx = o.monitor.x * TILE;
    ret(ctx, mx + 2, py + 9, 12, 4, '#1c1c24');
    // Monitor fino com pé dourado (a tela acende na cena)
    ret(ctx, mx + 2, py - 4, 12, 10, '#0e0f14');
    ret(ctx, mx + 2, py - 4, 12, 1, '#2a2c36');
    ret(ctx, mx + 7, py + 6, 2, 2, OURO);
    ret(ctx, mx + 5, py + 8, 6, 1, OURO_ESCURO);
    // Teclado
    ret(ctx, mx + 4, py + 10, 8, 2, '#e8e6e1');
    ret(ctx, mx + 5, py + 10, 6, 1, '#c9c6bf');
    const rx = mx + TILE;
    if (executiva) {
      // Luminária de latão, porta-retrato e placa da rosa
      ret(ctx, rx + 3, py - 2, 5, 3, OURO_CLARO); ret(ctx, rx + 5, py + 1, 1, 7, OURO); ret(ctx, rx + 3, py + 8, 5, 1, OURO_ESCURO);
      ret(ctx, rx + 10, py + 4, 5, 6, OURO); ret(ctx, rx + 11, py + 5, 3, 4, '#8fb0ff');
      ret(ctx, rx + 18, py + 5, 10, 5, '#0e0f14'); rosaAzul(ctx, rx + 21, py + 5);
      ret(ctx, rx + 20, py + 11, 6, 1, OURO);
    } else {
      // Pasta de documentos, caneta dourada e xícara
      ret(ctx, rx + 1, py + 5, 8, 6, '#f5f1e8');
      ret(ctx, rx + 2, py + 6, 6, 1, '#b8b2a4'); ret(ctx, rx + 2, py + 8, 4, 1, '#b8b2a4');
      ret(ctx, rx + 3, py + 10, 5, 1, OURO);
      ret(ctx, rx + 11, py + 6, 3, 3, '#f5f1e8'); ret(ctx, rx + 14, py + 7, 1, 1, '#f5f1e8');
      ret(ctx, rx + 11, py + 6, 3, 1, '#4b2e1c');
    }
  },

  vaso(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE;
    sombraMovel(ctx, px + 3, py + 14, 10, 2);
    // Folhagem
    ret(ctx, px + 3, py - 1, 10, 11, '#24693f');
    ret(ctx, px + 1, py + 3, 4, 5, '#24693f');
    ret(ctx, px + 11, py + 2, 4, 6, '#24693f');
    ret(ctx, px + 4, py, 3, 2, '#35925a'); ret(ctx, px + 10, py + 5, 3, 2, '#35925a'); ret(ctx, px + 2, py + 4, 2, 1, '#35925a');
    // Rosas azuis
    rosaAzul(ctx, px + 2, py - 5);
    rosaAzul(ctx, px + 9, py - 6);
    rosaAzul(ctx, px + 5, py + 1);
    rosaAzul(ctx, px + 10, py + 2);
    // Vaso preto fosco com aro dourado
    ret(ctx, px + 3, py + 9, 10, 1, OURO);
    ret(ctx, px + 4, py + 10, 8, 5, '#15151b');
    ret(ctx, px + 5, py + 11, 1, 3, '#2c2c36');
    ret(ctx, px + 4, py + 14, 8, 1, OURO_ESCURO);
  },

  estante(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    sombraMovel(ctx, px + 1, py + 14, W - 2, 2);
    ret(ctx, px + 1, py - 11, W - 2, 26, '#2e1b10');
    ret(ctx, px + 1, py - 11, W - 2, 1, OURO);
    ret(ctx, px + 2, py - 10, W - 4, 24, '#1d1109');
    const cores = ['#1f3a8a', '#7a1f2b', OURO, '#1d4f36', '#e8dcc4', '#3b2a5c'];
    for (let prat = 0; prat < 3; prat++) {
      const by = py - 10 + prat * 8;
      let bx = px + 3;
      let i = prat * 3 + o.x;
      while (bx < px + W - 4) {
        if (i % 7 === 3) { ret(ctx, bx + 1, by + 4, 3, 3, OURO_CLARO); bx += 6; i++; continue; } // objeto decorativo
        const bw = 2 + (i % 2), bh = 5 + ((i * 7) % 3);
        ret(ctx, bx, by + 7 - bh, bw, bh, cores[i % cores.length]);
        ret(ctx, bx, by + 7 - bh + 1, bw, 1, OURO_ESCURO);
        bx += bw;
        i++;
      }
      ret(ctx, px + 2, by + 7, W - 4, 1, OURO_ESCURO);
    }
  },

  arquivo(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE;
    sombraMovel(ctx, px + 2, py + 14, 12, 2);
    ret(ctx, px + 2, py - 6, 12, 21, '#2e1b10');
    ret(ctx, px + 2, py - 6, 12, 1, OURO);
    for (let i = 0; i < 3; i++) {
      ret(ctx, px + 3, py - 4 + i * 6, 10, 5, '#3d2415');
      ret(ctx, px + 7, py - 2 + i * 6, 2, 1, OURO);
    }
  },

  balcao(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    sombraMovel(ctx, px, py + 15, W, 2);
    // Tampo de mármore branco e frente em nogueira
    ret(ctx, px, py - 3, W, 7, '#f4f0e8');
    for (let i = 0; i < W; i += 7) ret(ctx, px + i + 2, py - 1 + (i % 3), 3, 1, '#ddd6c8');
    ret(ctx, px, py + 4, W, 1, OURO);
    ret(ctx, px, py + 5, W, 10, '#3a2416');
    for (let d = 0; d < o.w; d++) {
      ret(ctx, px + d * TILE + 2, py + 6, 12, 8, '#4a2f1e');
      ret(ctx, px + d * TILE + 12, py + 9, 1, 2, OURO);
    }
    // Máquina de espresso cromada
    const cx = px + TILE + 2;
    ret(ctx, cx, py - 14, 12, 12, '#b9bec9');
    ret(ctx, cx, py - 14, 12, 2, '#dfe3ea');
    ret(ctx, cx + 1, py - 11, 10, 3, '#8d93a0');
    ret(ctx, cx + 9, py - 10, 1, 1, '#ff6a5a');
    ret(ctx, cx + 3, py - 7, 2, 2, '#2a2a33'); ret(ctx, cx + 7, py - 7, 2, 2, '#2a2a33');
    ret(ctx, cx + 3, py - 4, 3, 2, '#f5f1e8'); ret(ctx, cx + 7, py - 4, 3, 2, '#f5f1e8');
    // Xícaras e bandeja dourada
    ret(ctx, px + 3, py - 5, 9, 1, OURO);
    ret(ctx, px + 4, py - 8, 3, 3, '#f5f1e8'); ret(ctx, px + 8, py - 8, 3, 3, '#1f3a8a');
    ret(ctx, px + 2 * TILE + 4, py - 9, 6, 6, '#e8dcc4'); ret(ctx, px + 2 * TILE + 4, py - 9, 6, 1, OURO);
  },

  bebedouro(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE;
    sombraMovel(ctx, px + 3, py + 14, 10, 2);
    ret(ctx, px + 5, py - 11, 6, 7, '#9fd6ff');
    ret(ctx, px + 6, py - 10, 1, 4, '#dff2ff');
    ret(ctx, px + 4, py - 4, 8, 18, '#1b1b22');
    ret(ctx, px + 4, py - 4, 8, 1, OURO);
    ret(ctx, px + 6, py + 1, 4, 3, '#2c2c36');
    ret(ctx, px + 7, py + 2, 2, 1, '#9fd6ff');
  },

  placa(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    // Painel de veludo azul com moldura dourada e letras douradas
    ret(ctx, px + 1, py + 6, W - 2, 20, OURO_ESCURO);
    ret(ctx, px + 2, py + 7, W - 4, 18, OURO);
    ret(ctx, px + 3, py + 8, W - 6, 16, '#0d1430');
    ret(ctx, px + 3, py + 8, W - 6, 1, '#1a2550');
    const texto = 'BLUE ROSE';
    const tw = larguraTextoPixel(texto) + 8;
    const tx = px + Math.floor((W - tw) / 2);
    rosaAzul(ctx, tx, py + 13);
    textoPixel(ctx, texto, tx + 8, py + 14, OURO_CLARO);
    textoPixel(ctx, texto, tx + 8, py + 13, OURO);
  },

  quadro(ctx, o) {
    // TV de parede com o painel de resultados
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    ret(ctx, px + 1, py + 6, W - 2, 20, '#07080c');
    ret(ctx, px + 3, py + 8, W - 6, 16, '#0f1a3d');
    const base = py + 21;
    [3, 5, 4, 7, 9, 12].forEach((h, i) => ret(ctx, px + 6 + i * 3, base - h, 2, h, i === 5 ? OURO : '#6f94ff'));
    ret(ctx, px + 5, base + 1, 19, 1, '#3a4a7a');
    ret(ctx, px + 28, py + 11, 12, 1, OURO); ret(ctx, px + 28, py + 14, 9, 1, '#8fb0ff');
    ret(ctx, px + 28, py + 17, 11, 1, '#8fb0ff'); ret(ctx, px + 28, py + 20, 6, 1, '#4cc783');
    ret(ctx, px + W / 2 - 1, py + 26, 2, 1, OURO);
  },

  arte(ctx, o) {
    // Quadro abstrato com moldura dourada
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    const [c1, c2, c3] = o.cores;
    ret(ctx, px + 5, py + 6, W - 10, 21, OURO_ESCURO);
    ret(ctx, px + 6, py + 7, W - 12, 19, OURO);
    ret(ctx, px + 7, py + 8, W - 14, 17, '#f1ebdd');
    ret(ctx, px + 8, py + 10, 7, 9, c1);
    ret(ctx, px + 13, py + 15, 8, 8, c2);
    ret(ctx, px + 10, py + 20, 5, 3, c3);
    ret(ctx, px + 17, py + 10, 2, 4, c1);
  },

  relogio(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE;
    ret(ctx, px + 3, py + 8, 10, 10, OURO);
    ret(ctx, px + 4, py + 9, 8, 8, '#0d1430');
    ret(ctx, px + 8, py + 10, 1, 4, OURO_CLARO);
    ret(ctx, px + 8, py + 13, 3, 1, OURO_CLARO);
  },

  mesaReuniao(ctx, o) {
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE, H = o.h * TILE;
    sombraMovel(ctx, px + 3, py + H - 1, W - 4, 3);
    // Mármore negro com veios brancos e borda dourada
    ret(ctx, px + 1, py + 1, W - 2, H - 5, OURO);
    ret(ctx, px + 2, py + 2, W - 4, H - 7, '#15151c');
    for (let i = 0; i < W - 8; i += 9) {
      ret(ctx, px + 4 + i, py + 5 + (i % 7), 4, 1, '#3a3a46');
      ret(ctx, px + 8 + i, py + 6 + (i % 7), 2, 1, '#55556a');
    }
    ret(ctx, px + 1, py + H - 4, W - 2, 3, '#0c0c11');
    ret(ctx, px + 1, py + H - 4, W - 2, 1, OURO_ESCURO);
    // Notebook, documentos e arranjo de rosas
    ret(ctx, px + 18, py + 8, 12, 8, '#b9bec9'); ret(ctx, px + 19, py + 9, 10, 5, '#6f94ff');
    ret(ctx, px + 50, py + 9, 9, 11, '#f5f1e8'); ret(ctx, px + 51, py + 11, 7, 1, '#b8b2a4'); ret(ctx, px + 51, py + 13, 5, 1, '#b8b2a4');
    ret(ctx, px + 70, py + 12, 5, 4, OURO);
    rosaAzul(ctx, px + 68, py + 7); rosaAzul(ctx, px + 72, py + 8);
  },

  cadeiraReuniao(ctx, o) {
    // Poltronas de couro creme
    const px = o.x * TILE, py = o.y * TILE;
    if (o.dir === 'baixo') {
      ret(ctx, px + 3, py + 1, 10, 6, '#cbb892'); ret(ctx, px + 3, py + 1, 10, 1, '#e8dcc4');
      ret(ctx, px + 4, py + 7, 8, 5, '#dccaa4');
    } else {
      ret(ctx, px + 4, py + 2, 8, 5, '#dccaa4');
      ret(ctx, px + 3, py + 7, 10, 6, '#cbb892'); ret(ctx, px + 3, py + 7, 10, 1, '#e8dcc4');
    }
    ret(ctx, px + 7, py + 13, 2, 2, OURO);
  },

  impressora(ctx, o) {
    // Aparador com escultura dourada
    const px = o.x * TILE, py = o.y * TILE;
    sombraMovel(ctx, px + 2, py + 14, 12, 2);
    ret(ctx, px + 2, py + 3, 12, 11, '#1b1b22');
    ret(ctx, px + 2, py + 3, 12, 1, OURO);
    ret(ctx, px + 6, py - 6, 4, 9, OURO);
    ret(ctx, px + 5, py - 8, 3, 3, OURO_CLARO);
    ret(ctx, px + 9, py - 3, 2, 2, OURO_CLARO);
  },

  sofa(ctx, o) {
    // Chesterfield de veludo azul com capitonê
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    sombraMovel(ctx, px + 1, py + 14, W - 2, 2);
    ret(ctx, px + 2, py, W - 4, 8, '#2a3f8f');
    for (let xx = px + 5; xx < px + W - 4; xx += 5) ret(ctx, xx, py + 3, 1, 1, '#1a2a63');
    ret(ctx, px, py + 7, W, 8, '#1f3070');
    ret(ctx, px, py + 7, W, 1, '#3a52a8');
    ret(ctx, px, py - 1, 3, 15, '#1a2a63'); ret(ctx, px + W - 3, py - 1, 3, 15, '#1a2a63');
    ret(ctx, px + 1, py - 1, 1, 15, '#2a3f8f');
    ret(ctx, px + 7, py + 1, 6, 5, OURO); ret(ctx, px + W - 13, py + 1, 6, 5, '#e8dcc4');
    ret(ctx, px + 2, py + 14, 1, 1, OURO); ret(ctx, px + W - 3, py + 14, 1, 1, OURO);
  },

  mesinha(ctx, o) {
    // Mesa de centro de vidro com estrutura dourada
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    sombraMovel(ctx, px + 3, py + 13, W - 5, 2);
    ret(ctx, px + 2, py + 3, W - 4, 9, OURO);
    ctx.fillStyle = 'rgba(190,220,245,.75)';
    ctx.fillRect(px + 3, py + 4, W - 6, 7);
    ret(ctx, px + 6, py + 5, 7, 5, '#7a1f2b'); ret(ctx, px + 8, py + 6, 4, 3, '#f5f1e8');
    ret(ctx, px + 20, py + 6, 4, 4, '#15151b');
    rosaAzul(ctx, px + 20, py + 1);
  },

  aparador(ctx, o) {
    // Aparador baixo de nogueira com puxadores dourados e objetos de decoração
    const px = o.x * TILE, py = o.y * TILE, W = o.w * TILE;
    sombraMovel(ctx, px + 1, py + 15, W - 2, 1);
    ret(ctx, px + 1, py + 1, W - 2, 3, '#4a2f1e');
    ret(ctx, px + 1, py + 1, W - 2, 1, OURO);
    ret(ctx, px + 1, py + 4, W - 2, 11, '#2e1b10');
    for (let d = 0; d < o.w; d++) {
      ret(ctx, px + d * TILE + 2, py + 5, 12, 9, '#3d2415');
      ret(ctx, px + d * TILE + 7, py + 8, 2, 1, OURO);
    }
    // Decoração: livros, vaso com rosa, troféu
    ret(ctx, px + 4, py - 5, 2, 6, '#1f3a8a'); ret(ctx, px + 6, py - 4, 2, 5, '#7a1f2b'); ret(ctx, px + 8, py - 5, 2, 6, OURO);
    ret(ctx, px + 21, py - 2, 4, 3, '#15151b'); rosaAzul(ctx, px + 20, py - 7);
    ret(ctx, px + 38, py - 6, 4, 4, OURO_CLARO); ret(ctx, px + 39, py - 2, 2, 2, OURO); ret(ctx, px + 37, py, 6, 1, OURO_ESCURO);
  },

  luminaria(ctx, o) {
    // Luminária de piso em latão
    const px = o.x * TILE, py = o.y * TILE;
    sombraMovel(ctx, px + 4, py + 14, 8, 2);
    ret(ctx, px + 4, py - 12, 8, 6, '#f1e3c0');
    ret(ctx, px + 4, py - 12, 8, 1, OURO);
    ret(ctx, px + 4, py - 7, 8, 1, OURO_ESCURO);
    ret(ctx, px + 7, py - 6, 2, 19, OURO);
    ret(ctx, px + 5, py + 13, 6, 1, OURO_ESCURO);
  },
};
