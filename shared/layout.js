// =============================================================
// Layout do escritório BLUE ROSE
// -------------------------------------------------------------
// Este arquivo é usado pelo BACKEND (para calcular caminhos e
// posições dos agentes) e pelo FRONT (visões 2D e 3D).
// Cada tile tem 16x16 pixels na visão 2D e 1 unidade na visão 3D.
//
// Andar dividido em áreas:
//   Diretoria (sala do CEO) · Copa · Sala de reunião · Lounge
//   Vendas (Head + 3) · Marketing (Head + 3) · Tecnologia (CTO + 4)
// =============================================================

export const TILE = 16;
export const COLS = 40;
export const ROWS = 26;

// Legenda dos tiles base:
//  W = parede         N = janela na parede
//  F = piso            C = tapete azul (sala do CEO)
//  P = divisória       D = porta (piso dentro da divisória)
//  B = rodapé inferior (borda do mapa)
const JANELAS = [2, 6, 15, 26, 31, 36];
const linhaParede = Array.from({ length: COLS }, (_, x) =>
  (JANELAS.some((j) => x === j || x === j + 1) ? 'N' : 'W')).join('');
const resto = 'F'.repeat(COLS - 11);

export const MAPA = [
  linhaParede,                               // y0
  linhaParede,                               // y1
  'FFFFFFFFFF' + 'P' + resto,                // y2
  'FCCCCCCCCF' + 'P' + resto,                // y3
  'FCCCCCCCCF' + 'P' + resto,                // y4
  'FCCCCCCCCF' + 'P' + resto,                // y5
  'FCCCCCCCCF' + 'D' + resto,                // y6  (porta da sala do CEO)
  'FCCCCCCCCF' + 'D' + resto,                // y7
  'FFFFFFFFFF' + 'P' + resto,                // y8
  'PPPPPPPPPPP' + resto,                     // y9
  ...Array.from({ length: 15 }, () => 'F'.repeat(COLS)), // y10..y24
  'B'.repeat(COLS),                          // y25
];

// -------------------------------------------------------------
// Mesas de trabalho: uma por agente.
//  mesa    = tiles ocupados pela mesa (x, y, largura)
//  assento = onde o agente senta (olhando para cima, para o monitor)
//  visita  = onde outro agente para ao entregar uma tarefa
//  monitor = tile da mesa onde fica o monitor
// -------------------------------------------------------------
function estacao(x, y, w = 2) {
  const seat = { x: x + (w === 3 ? 1 : 0), y: y + 1 };
  return { mesa: { x, y, w }, assento: seat, visita: { x: x + w, y: y + 1 }, monitor: { x: seat.x, y } };
}

export const MESAS = {
  // Diretoria
  gerente: { mesa: { x: 3, y: 4, w: 3 }, assento: { x: 4, y: 5 }, visita: { x: 6, y: 5 }, monitor: { x: 4, y: 4 } },
  // Vendas
  headVendas: estacao(2, 11, 3),
  prospector: estacao(7, 11),
  redator: estacao(10, 11),
  atendente: estacao(13, 11),
  // Marketing
  headMarketing: estacao(21, 11, 3),
  designer: estacao(26, 11),
  conteudo: estacao(29, 11),
  anuncios: estacao(32, 11),
  // Tecnologia
  cto: estacao(2, 19, 3),
  seo: estacao(7, 19),
  dev: estacao(10, 19),
  automacao: estacao(13, 19),
  revisor: estacao(16, 19),
};

// Lugares na frente da cafeteira (agentes ociosos vão até lá)
export const CAFE = [
  { x: 12, y: 3 },
  { x: 13, y: 3 },
  { x: 14, y: 3 },
];

// Departamentos: área no chão, cor e placa
export const DEPARTAMENTOS = [
  { id: 'vendas', nome: 'VENDAS', x: 1, y: 10, w: 16, h: 3, cor: '#1f7a4c' },
  { id: 'marketing', nome: 'MARKETING', x: 20, y: 10, w: 16, h: 3, cor: '#9c3f7a' },
  { id: 'tecnologia', nome: 'TECNOLOGIA', x: 1, y: 18, w: 19, h: 3, cor: '#c06a1f' },
];

// -------------------------------------------------------------
// Objetos decorativos / móveis. "bloqueia" = ninguém anda por cima.
// -------------------------------------------------------------
export const OBJETOS = [
  // Sala do CEO
  { tipo: 'estante', x: 7, y: 2, w: 2, h: 1, bloqueia: true },
  { tipo: 'vaso', x: 1, y: 2, bloqueia: true },
  { tipo: 'vaso', x: 8, y: 8, bloqueia: true },
  { tipo: 'arquivo', x: 0, y: 5, bloqueia: true },
  { tipo: 'luminaria', x: 1, y: 8, bloqueia: true },

  // Copa / café
  { tipo: 'balcao', x: 12, y: 2, w: 3, h: 1, bloqueia: true },
  { tipo: 'bebedouro', x: 11, y: 2, bloqueia: true },
  { tipo: 'vaso', x: 16, y: 2, bloqueia: true },

  // Na parede (não bloqueiam)
  { tipo: 'placa', x: 17, y: 0, w: 4, h: 2 },
  { tipo: 'quadro', x: 21, y: 0, w: 3, h: 2 },
  { tipo: 'arte', x: 4, y: 0, w: 2, h: 2, cores: ['#1f3a8a', '#c9a54a', '#8fb0ff'] },
  { tipo: 'arte', x: 28, y: 0, w: 2, h: 2, cores: ['#b83a4b', '#1f3a8a', '#e8dcc4'] },
  { tipo: 'arte', x: 33, y: 0, w: 2, h: 2, cores: ['#1d4f36', '#c9a54a', '#e8dcc4'] },
  { tipo: 'arte', x: 38, y: 0, w: 2, h: 2, cores: ['#7a4fc2', '#c9a54a', '#1f3a8a'] },
  { tipo: 'relogio', x: 11, y: 0 },

  // Sala de reunião
  { tipo: 'mesaReuniao', x: 17, y: 4, w: 6, h: 2, bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 18, y: 3, dir: 'baixo', bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 21, y: 3, dir: 'baixo', bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 18, y: 6, dir: 'cima', bloqueia: true },
  { tipo: 'cadeiraReuniao', x: 21, y: 6, dir: 'cima', bloqueia: true },
  { tipo: 'vaso', x: 24, y: 2, bloqueia: true },

  // Lounge de cima
  { tipo: 'tapeteLounge', x: 28, y: 3, w: 9, h: 5 },
  { tipo: 'sofa', x: 30, y: 7, w: 4, h: 1, bloqueia: true },
  { tipo: 'mesinha', x: 31, y: 5, w: 2, h: 1, bloqueia: true },
  { tipo: 'luminaria', x: 29, y: 7, bloqueia: true },
  { tipo: 'estante', x: 35, y: 2, w: 2, h: 1, bloqueia: true },
  { tipo: 'vaso', x: 38, y: 2, bloqueia: true },
  { tipo: 'vaso', x: 38, y: 8, bloqueia: true },

  // Áreas dos departamentos (tapetes coloridos) e plantas entre as mesas
  ...[
    { x: 1, y: 10, w: 16, h: 3, cor: '#1f7a4c' },
    { x: 20, y: 10, w: 16, h: 3, cor: '#9c3f7a' },
    { x: 1, y: 18, w: 19, h: 3, cor: '#c06a1f' },
  ].map((t) => ({ tipo: 'tapeteMesa', ...t })),
  { tipo: 'vaso', x: 0, y: 10, bloqueia: true },
  { tipo: 'vaso', x: 18, y: 11, bloqueia: true },
  { tipo: 'vaso', x: 37, y: 11, bloqueia: true },
  { tipo: 'vaso', x: 0, y: 18, bloqueia: true },
  { tipo: 'vaso', x: 20, y: 19, bloqueia: true },

  // Lounge de baixo
  { tipo: 'tapeteLounge', x: 24, y: 17, w: 12, h: 6 },
  { tipo: 'sofa', x: 26, y: 22, w: 4, h: 1, bloqueia: true },
  { tipo: 'sofa', x: 31, y: 22, w: 4, h: 1, bloqueia: true },
  { tipo: 'mesinha', x: 27, y: 19, w: 2, h: 1, bloqueia: true },
  { tipo: 'mesinha', x: 32, y: 19, w: 2, h: 1, bloqueia: true },
  { tipo: 'luminaria', x: 25, y: 22, bloqueia: true },
  { tipo: 'estante', x: 37, y: 15, w: 2, h: 1, bloqueia: true },
  { tipo: 'impressora', x: 22, y: 15, bloqueia: true },

  // Aparadores e plantas junto à parede de baixo
  { tipo: 'aparador', x: 2, y: 24, w: 3, h: 1, bloqueia: true },
  { tipo: 'aparador', x: 8, y: 24, w: 3, h: 1, bloqueia: true },
  { tipo: 'aparador', x: 14, y: 24, w: 3, h: 1, bloqueia: true },
  { tipo: 'vaso', x: 0, y: 24, bloqueia: true },
  { tipo: 'vaso', x: 21, y: 24, bloqueia: true },
  { tipo: 'vaso', x: 39, y: 24, bloqueia: true },
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
  for (const o of OBJETOS) {
    if (!o.bloqueia) continue;
    for (let dy = 0; dy < (o.h || 1); dy++) {
      for (let dx = 0; dx < (o.w || 1); dx++) grade[o.y + dy][o.x + dx] = false;
    }
  }
  for (const m of Object.values(MESAS)) {
    for (let dx = 0; dx < m.mesa.w; dx++) grade[m.mesa.y][m.mesa.x + dx] = false;
  }
  return grade;
}

export const GRADE = montarGrade();

// Pontos de luz do teto (focos quentes desenhados no piso)
export const LUZES = [
  { x: 4.5, y: 5, r: 3.2 },
  { x: 8.5, y: 12.5, r: 4 }, { x: 28.5, y: 12.5, r: 4 }, { x: 10.5, y: 20.5, r: 4.5 },
  { x: 19.5, y: 5, r: 3.4 }, { x: 13.5, y: 3.5, r: 2.2 }, { x: 32.5, y: 5.5, r: 3.4 }, { x: 30, y: 20, r: 4 },
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
