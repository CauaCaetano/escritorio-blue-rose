// =============================================================
// Layout do escritório BLUE ROSE
// -------------------------------------------------------------
// Este arquivo é usado pelo BACKEND (para calcular caminhos e
// posições dos agentes) e pelo FRONT (para desenhar o mapa).
// Cada tile tem 16x16 pixels.
// =============================================================

export const TILE = 16;
export const COLS = 30;
export const ROWS = 20;

// Legenda dos tiles base:
//  W = parede         N = janela na parede
//  F = piso de madeira C = tapete azul (sala do Gerente)
//  P = divisória      D = porta (piso dentro da divisória)
//  B = rodapé inferior (borda do mapa)
const linhaParede = 'WWNNWWNNWWWWWWWNNWWWWNNWWWNNWW';
const resto = 'F'.repeat(19);

export const MAPA = [
  linhaParede,                               // y0
  linhaParede,                               // y1
  'FFFFFFFFFF' + 'P' + resto,                // y2
  'FCCCCCCCCF' + 'P' + resto,                // y3
  'FCCCCCCCCF' + 'P' + resto,                // y4
  'FCCCCCCCCF' + 'P' + resto,                // y5
  'FCCCCCCCCF' + 'D' + resto,                // y6  (porta da sala do Gerente)
  'FCCCCCCCCF' + 'D' + resto,                // y7
  'FFFFFFFFFF' + 'P' + resto,                // y8
  'PPPPPPPPPPP' + resto,                     // y9
  'F'.repeat(30),                            // y10
  'F'.repeat(30),                            // y11
  'F'.repeat(30),                            // y12
  'F'.repeat(30),                            // y13
  'F'.repeat(30),                            // y14
  'F'.repeat(30),                            // y15
  'F'.repeat(30),                            // y16
  'F'.repeat(30),                            // y17
  'F'.repeat(30),                            // y18
  'B'.repeat(30),                            // y19
];

// -------------------------------------------------------------
// Mesas de trabalho: uma por agente.
//  mesa   = tiles ocupados pela mesa (x, y, largura)
//  assento = onde o agente senta (olhando para cima, para o monitor)
//  visita  = onde outro agente para ao entregar uma tarefa
//  monitor = tile da mesa onde fica o monitor
// -------------------------------------------------------------
export const MESAS = {
  gerente:    { mesa: { x: 3, y: 4, w: 3 },  assento: { x: 4, y: 5 },  visita: { x: 6, y: 5 },  monitor: { x: 4, y: 4 } },
  prospector: { mesa: { x: 3, y: 11, w: 2 }, assento: { x: 3, y: 12 }, visita: { x: 5, y: 12 }, monitor: { x: 3, y: 11 } },
  redator:    { mesa: { x: 9, y: 11, w: 2 }, assento: { x: 9, y: 12 }, visita: { x: 11, y: 12 }, monitor: { x: 9, y: 11 } },
  dev:        { mesa: { x: 15, y: 11, w: 2 }, assento: { x: 15, y: 12 }, visita: { x: 17, y: 12 }, monitor: { x: 15, y: 11 } },
  revisor:    { mesa: { x: 6, y: 15, w: 2 }, assento: { x: 6, y: 16 }, visita: { x: 8, y: 16 }, monitor: { x: 6, y: 15 } },
  atendente:  { mesa: { x: 12, y: 15, w: 2 }, assento: { x: 12, y: 16 }, visita: { x: 14, y: 16 }, monitor: { x: 12, y: 15 } },
};

// Lugares na frente da cafeteira (agentes ociosos vão até lá)
export const CAFE = [
  { x: 12, y: 3 },
  { x: 13, y: 3 },
  { x: 14, y: 3 },
];

// -------------------------------------------------------------
// Objetos decorativos / móveis. "bloqueia" = ninguém anda por cima.
// -------------------------------------------------------------
export const OBJETOS = [
  // Sala do Gerente
  { tipo: 'estante', x: 7, y: 2, w: 2, h: 1, bloqueia: true },
  { tipo: 'vaso', x: 1, y: 2, bloqueia: true },
  { tipo: 'vaso', x: 8, y: 8, bloqueia: true },
  { tipo: 'arquivo', x: 0, y: 5, bloqueia: true },

  // Copa / café
  { tipo: 'balcao', x: 12, y: 2, w: 3, h: 1, bloqueia: true },
  { tipo: 'bebedouro', x: 11, y: 2, bloqueia: true },
  { tipo: 'vaso', x: 16, y: 2, bloqueia: true },

  // Na parede (não bloqueiam): placa BLUE ROSE, TV com painel, quadros e relógio
  { tipo: 'placa', x: 17, y: 0, w: 4, h: 2 },
  { tipo: 'quadro', x: 23, y: 0, w: 3, h: 2 },
  { tipo: 'arte', x: 4, y: 0, w: 2, h: 2, cores: ['#1f3a8a', '#c9a54a', '#8fb0ff'] },
  { tipo: 'arte', x: 28, y: 0, w: 2, h: 2, cores: ['#b83a4b', '#1f3a8a', '#e8dcc4'] },
  { tipo: 'relogio', x: 11, y: 0 },

  // Mesa de reunião
  { tipo: 'mesaReuniao', x: 21, y: 4, w: 6, h: 2, bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 22, y: 3, dir: 'baixo', bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 25, y: 3, dir: 'baixo', bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 22, y: 6, dir: 'cima', bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 25, y: 6, dir: 'cima', bloqueia: true },
  { tipo: 'vaso', x: 28, y: 2, bloqueia: true },
  { tipo: 'vaso', x: 19, y: 7, bloqueia: true },

  // Área das mesas: tapete sob cada estação, plantas e aparadores
  { tipo: 'tapeteMesa', x: 2, y: 10, w: 4, h: 3 },
  { tipo: 'tapeteMesa', x: 8, y: 10, w: 4, h: 3 },
  { tipo: 'tapeteMesa', x: 14, y: 10, w: 4, h: 3 },
  { tipo: 'tapeteMesa', x: 5, y: 14, w: 4, h: 3 },
  { tipo: 'tapeteMesa', x: 11, y: 14, w: 4, h: 3 },
  { tipo: 'vaso', x: 6, y: 11, bloqueia: true },
  { tipo: 'vaso', x: 12, y: 11, bloqueia: true },
  { tipo: 'vaso', x: 9, y: 15, bloqueia: true },
  { tipo: 'aparador', x: 2, y: 18, w: 3, h: 1, bloqueia: true },
  { tipo: 'aparador', x: 8, y: 18, w: 3, h: 1, bloqueia: true },
  { tipo: 'aparador', x: 14, y: 18, w: 3, h: 1, bloqueia: true },
  { tipo: 'vaso', x: 0, y: 10, bloqueia: true },
  { tipo: 'vaso', x: 18, y: 15, bloqueia: true },
  { tipo: 'impressora', x: 20, y: 11, bloqueia: true },
  { tipo: 'vaso', x: 0, y: 18, bloqueia: true },

  // Lounge
  { tipo: 'tapeteLounge', x: 22, y: 13, w: 6, h: 5 },
  { tipo: 'sofa', x: 23, y: 17, w: 4, h: 1, bloqueia: true },
  { tipo: 'luminaria', x: 22, y: 17, bloqueia: true },
  { tipo: 'luminaria', x: 1, y: 8, bloqueia: true },
  { tipo: 'mesinha', x: 24, y: 15, w: 2, h: 1, bloqueia: true },
  { tipo: 'estante', x: 26, y: 10, w: 2, h: 1, bloqueia: true },
  { tipo: 'vaso', x: 28, y: 10, bloqueia: true },
  { tipo: 'vaso', x: 28, y: 18, bloqueia: true },
  { tipo: 'vaso', x: 21, y: 18, bloqueia: true },
];

// -------------------------------------------------------------
// Grade de "andável" (true = pode andar)
// -------------------------------------------------------------
function montarGrade() {
  const grade = [];
  for (let y = 0; y < ROWS; y++) {
    const linha = [];
    for (let x = 0; x < COLS; x++) {
      const t = MAPA[y][x];
      linha.push(t === 'F' || t === 'C' || t === 'D');
    }
    grade.push(linha);
  }
  // Móveis que bloqueiam
  for (const o of OBJETOS) {
    if (!o.bloqueia) continue;
    for (let dy = 0; dy < (o.h || 1); dy++) {
      for (let dx = 0; dx < (o.w || 1); dx++) grade[o.y + dy][o.x + dx] = false;
    }
  }
  // Mesas de trabalho bloqueiam; os assentos continuam livres
  for (const m of Object.values(MESAS)) {
    for (let dx = 0; dx < m.mesa.w; dx++) grade[m.mesa.y][m.mesa.x + dx] = false;
  }
  return grade;
}

export const GRADE = montarGrade();

// Pontos de luz do teto (focos quentes desenhados no piso)
export const LUZES = [
  { x: 4.5, y: 5, r: 3.2 },
  { x: 4, y: 12.5, r: 2.6 }, { x: 10, y: 12.5, r: 2.6 }, { x: 16, y: 12.5, r: 2.6 },
  { x: 7, y: 16.5, r: 2.6 }, { x: 13, y: 16.5, r: 2.6 },
  { x: 24, y: 5, r: 3.4 }, { x: 13.5, y: 3.5, r: 2.2 }, { x: 25, y: 15.5, r: 3.4 },
];

export function andavel(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS && GRADE[y][x];
}

/**
 * Busca em largura (BFS) do caminho mais curto entre dois tiles.
 * Retorna a lista de tiles SEM o ponto de partida (ex.: [{x,y}, ...]).
 * Retorna [] se já estiver no destino ou se não houver caminho.
 */
export function acharCaminho(de, para) {
  if (de.x === para.x && de.y === para.y) return [];
  const chave = (x, y) => y * COLS + x;
  const veio = new Map([[chave(de.x, de.y), null]]);
  const fila = [de];
  const passos = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (fila.length) {
    const atual = fila.shift();
    if (atual.x === para.x && atual.y === para.y) break;
    for (const [dx, dy] of passos) {
      const nx = atual.x + dx, ny = atual.y + dy;
      const k = chave(nx, ny);
      if (veio.has(k)) continue;
      // O destino pode ser qualquer tile andável
      if (!andavel(nx, ny)) continue;
      veio.set(k, atual);
      fila.push({ x: nx, y: ny });
    }
  }
  if (!veio.has(chave(para.x, para.y))) return [];
  const caminho = [];
  let p = para;
  while (p && !(p.x === de.x && p.y === de.y)) {
    caminho.unshift({ x: p.x, y: p.y });
    p = veio.get(chave(p.x, p.y));
  }
  return caminho;
}

/** Direção ('cima','baixo','esquerda','direita') de um tile para outro vizinho */
export function direcao(de, para) {
  if (para.x > de.x) return 'direita';
  if (para.x < de.x) return 'esquerda';
  if (para.y > de.y) return 'baixo';
  return 'cima';
}
