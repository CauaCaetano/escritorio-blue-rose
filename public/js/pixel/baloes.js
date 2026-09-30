// =============================================================
// Balões sobre os personagens (pixel art)
//  digitando → "..." animado     lendo → "?"
//  aprovacao → "!" amarelo       envelope → carta
//  cafe      → xícara com vapor
// =============================================================
import { ret, textoPixel } from './util.js';

const CONTORNO = '#1d1a26';

/** (cx, base) = centro horizontal e linha de baixo do balão */
export function desenharBalao(ctx, tipo, cx, base, t) {
  const amarelo = tipo === 'aprovacao';
  const pulo = amarelo ? Math.round(Math.abs(Math.sin(t * 4)) * -2) : 0;
  const w = 13, h = 10;
  const x = Math.round(cx - w / 2), y = base - h - 3 + pulo;
  const fundo = amarelo ? '#ffd23f' : '#ffffff';

  // Corpo do balão (cantos arredondados) + rabinho
  ret(ctx, x + 1, y, w - 2, h, CONTORNO);
  ret(ctx, x, y + 1, w, h - 2, CONTORNO);
  ret(ctx, x + 1, y + 1, w - 2, h - 2, fundo);
  ret(ctx, x + 5, y + h, 3, 1, CONTORNO);
  ret(ctx, x + 6, y + h + 1, 1, 1, CONTORNO);
  ret(ctx, x + 6, y + h - 1, 1, 1, fundo);
  ret(ctx, x + 6, y + h, 1, 1, fundo);

  const ix = x + 1, iy = y + 1; // área interna 11x8
  switch (tipo) {
    case 'digitando': {
      const n = Math.floor(t * 3) % 4; // 0..3 pontinhos
      for (let i = 0; i < 3; i++) {
        ret(ctx, ix + 2 + i * 3, iy + 4, 2, 2, i < n ? '#2f5fd0' : '#c9cfe0');
      }
      break;
    }
    case 'lendo':
      textoPixel(ctx, '?', ix + 4, iy + 1, '#7a45c2');
      break;
    case 'aprovacao':
      textoPixel(ctx, '!', ix + 5, iy + 1, '#8a1c1c');
      ret(ctx, ix + 6, iy + 1, 1, 3, '#8a1c1c');
      break;
    case 'envelope':
      ret(ctx, ix + 2, iy + 1, 7, 6, '#f7e7c4');
      ret(ctx, ix + 2, iy + 1, 7, 1, '#b9854a');
      ret(ctx, ix + 2, iy + 6, 7, 1, '#b9854a');
      ret(ctx, ix + 2, iy + 1, 1, 6, '#b9854a');
      ret(ctx, ix + 8, iy + 1, 1, 6, '#b9854a');
      ret(ctx, ix + 3, iy + 2, 1, 1, '#b9854a'); ret(ctx, ix + 7, iy + 2, 1, 1, '#b9854a');
      ret(ctx, ix + 4, iy + 3, 1, 1, '#b9854a'); ret(ctx, ix + 6, iy + 3, 1, 1, '#b9854a');
      ret(ctx, ix + 5, iy + 4, 1, 1, '#d34848');
      break;
    case 'cafe': {
      const f = Math.floor(t * 3) % 2;
      ret(ctx, ix + 3, iy + 3, 5, 4, '#f4f1ea');
      ret(ctx, ix + 3, iy + 3, 5, 1, '#6b4a2c');
      ret(ctx, ix + 8, iy + 4, 1, 2, '#f4f1ea');
      ret(ctx, ix + 4 + f, iy, 1, 2, '#b8bccb');
      ret(ctx, ix + 6 - f, iy + 1, 1, 1, '#b8bccb');
      break;
    }
  }
}
