// Utilitários de pixel art (tudo desenhado com retângulos de 1px)

/** Retângulo preenchido (coordenadas inteiras) */
export function ret(ctx, x, y, w, h, cor) {
  ctx.fillStyle = cor;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Escurece (+) ou clareia (-) uma cor hex. qtd de -1 a 1 */
export function sombrear(hex, qtd) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (qtd >= 0) {
    r *= 1 - qtd; g *= 1 - qtd; b *= 1 - qtd;
  } else {
    r += (255 - r) * -qtd; g += (255 - g) * -qtd; b += (255 - b) * -qtd;
  }
  const h = (v) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Fonte minúscula 3x5 para textos dentro do mapa
const FONTE = {
  B: ['110', '101', '110', '101', '110'],
  L: ['100', '100', '100', '100', '111'],
  U: ['101', '101', '101', '101', '111'],
  E: ['111', '100', '110', '100', '111'],
  R: ['110', '101', '110', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  S: ['111', '100', '111', '001', '111'],
  '?': ['111', '001', '010', '000', '010'],
  '!': ['1', '1', '1', '0', '1'],
  ' ': ['0', '0', '0', '0', '0'],
};

/** Escreve texto com a fonte 3x5. Retorna a largura usada. */
export function textoPixel(ctx, texto, x, y, cor) {
  let cx = x;
  for (const ch of texto) {
    const g = FONTE[ch] || FONTE[' '];
    g.forEach((linha, dy) => {
      [...linha].forEach((b, dx) => { if (b === '1') ret(ctx, cx + dx, y + dy, 1, 1, cor); });
    });
    cx += g[0].length + 1;
  }
  return cx - x - 1;
}

export function larguraTextoPixel(texto) {
  let w = 0;
  for (const ch of texto) w += (FONTE[ch] || FONTE[' '])[0].length + 1;
  return w - 1;
}

/** Rosa azul pequena (identidade BLUE ROSE), 5x5 px a partir de (x,y) */
export function rosaAzul(ctx, x, y) {
  ret(ctx, x + 1, y, 3, 1, '#2f5fd0');
  ret(ctx, x, y + 1, 5, 3, '#2f5fd0');
  ret(ctx, x + 1, y + 4, 3, 1, '#1e3a8a');
  ret(ctx, x + 1, y + 1, 2, 1, '#8fb0ff');
  ret(ctx, x + 2, y + 2, 1, 1, '#1e3a8a');
}
