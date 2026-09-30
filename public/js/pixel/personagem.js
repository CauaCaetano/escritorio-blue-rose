// =============================================================
// Personagens em pixel art (16x16), desenhados por código.
// -------------------------------------------------------------
// 4 direções: cima, baixo, esquerda (espelho da direita), direita
// Poses: em pé, andando (quadros 1 e 2), sentado, digitando.
// =============================================================
import { ret, sombrear } from './util.js';

const CONTORNO = '#1d1a26';

/**
 * Desenha um personagem com o canto superior esquerdo em (ox, oy).
 * opcoes: { dir, quadro (0,1,2), sentado, digitando, t (segundos) }
 */
export function desenharPersonagem(ctx, ox, oy, v, opcoes = {}) {
  const { dir = 'baixo', quadro = 0, sentado = false, digitando = false, t = 0 } = opcoes;
  if (dir === 'esquerda') {
    ctx.save();
    ctx.translate(ox * 2 + 16, 0);
    ctx.scale(-1, 1);
    desenharLado(ctx, ox, oy, v, quadro, sentado, digitando, t);
    ctx.restore();
    return;
  }
  if (dir === 'direita') return desenharLado(ctx, ox, oy, v, quadro, sentado, digitando, t);
  return desenharFrenteCostas(ctx, ox, oy, v, dir === 'cima', quadro, sentado, digitando, t);
}

/** Retângulo com contorno de 1px em volta */
function parte(ctx, x, y, w, h, cor) {
  ret(ctx, x - 1, y - 1, w + 2, h + 2, CONTORNO);
  ret(ctx, x, y, w, h, cor);
}

function sombra(ctx, ox, oy) {
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(ox + 4, oy + 15, 8, 1);
  ctx.fillRect(ox + 5, oy + 16, 6, 1);
}

// ---------------------------------------------------------------
// Frente (baixo) e costas (cima)
// ---------------------------------------------------------------
function desenharFrenteCostas(ctx, ox, oy, v, costas, quadro, sentado, digitando, t) {
  const camisa = v.camisa, camisaEsc = sombrear(v.camisa, 0.25);
  const calca = v.calca, sapato = '#241f1c';
  const bob = quadro === 0 ? 0 : -1;

  if (!sentado) sombra(ctx, ox, oy);

  // Pernas
  if (!sentado) {
    const hEsq = quadro === 1 ? 1 : 2;
    const hDir = quadro === 2 ? 1 : 2;
    parte(ctx, ox + 5, oy + 12, 2, hEsq, calca);
    parte(ctx, ox + 9, oy + 12, 2, hDir, calca);
    ret(ctx, ox + 5, oy + 12 + hEsq, 2, 1, sapato);
    ret(ctx, ox + 9, oy + 12 + hDir, 2, 1, sapato);
  }

  const y = oy + bob;

  // Braços (quando digita, alternam para cima)
  let bEsq = 0, bDir = 0;
  if (digitando) {
    const f = Math.floor(t * 8) % 2;
    bEsq = f ? -1 : 0;
    bDir = f ? 0 : -1;
  }
  parte(ctx, ox + 3, y + 8 + bEsq, 1, 3, camisaEsc);
  parte(ctx, ox + 12, y + 8 + bDir, 1, 3, camisaEsc);
  // Tronco
  parte(ctx, ox + 4, y + 8, 8, 4, camisa);
  ret(ctx, ox + 3, y + 8 + bEsq, 1, 3, camisaEsc);
  ret(ctx, ox + 12, y + 8 + bDir, 1, 3, camisaEsc);
  if (!costas) {
    ret(ctx, ox + 3, y + 11 + bEsq, 1, 1, v.pele);
    ret(ctx, ox + 12, y + 11 + bDir, 1, 1, v.pele);
    // Blazer com camisa social branca em "V" (e gravata, se tiver)
    ret(ctx, ox + 6, y + 8, 4, 1, '#f4f1ea');
    ret(ctx, ox + 7, y + 9, 2, 1, '#f4f1ea');
    ret(ctx, ox + 5, y + 8, 1, 2, sombrear(camisa, 0.35));
    ret(ctx, ox + 10, y + 8, 1, 2, sombrear(camisa, 0.35));
    if (v.gravata) { ret(ctx, ox + 7, y + 9, 2, 2, v.gravata); ret(ctx, ox + 7, y + 9, 2, 1, sombrear(v.gravata, 0.2)); }
  }
  ret(ctx, ox + 4, y + 11, 8, 1, camisaEsc);

  // Cabeça
  parte(ctx, ox + 4, y + 1, 8, 7, v.pele);
  cabeloFrenteCostas(ctx, ox, y, v, costas);

  if (!costas) {
    // Olhos
    ret(ctx, ox + 6, y + 4, 1, 2, CONTORNO);
    ret(ctx, ox + 9, y + 4, 1, 2, CONTORNO);
    ret(ctx, ox + 5, y + 6, 1, 1, sombrear(v.pele, -0.2));
    ret(ctx, ox + 10, y + 6, 1, 1, sombrear(v.pele, -0.2));
    if (v.oculos) {
      ret(ctx, ox + 5, y + 4, 3, 1, '#39364a');
      ret(ctx, ox + 8, y + 4, 3, 1, '#39364a');
      ret(ctx, ox + 5, y + 5, 1, 1, '#39364a'); ret(ctx, ox + 7, y + 5, 1, 1, '#39364a');
      ret(ctx, ox + 8, y + 5, 1, 1, '#39364a'); ret(ctx, ox + 10, y + 5, 1, 1, '#39364a');
    }
  }
}

function cabeloFrenteCostas(ctx, ox, y, v, costas) {
  const c = v.cabelo, cEsc = sombrear(v.cabelo, 0.25);
  const estilo = v.cabeloEstilo;
  if (estilo === 'bone') {
    ret(ctx, ox + 3, y, 10, 3, v.bone);
    ret(ctx, ox + 4, y, 8, 1, sombrear(v.bone, -0.2));
    if (!costas) ret(ctx, ox + 3, y + 3, 10, 1, sombrear(v.bone, 0.3));
    else ret(ctx, ox + 4, y + 3, 8, 3, c);
    ret(ctx, ox + 4, y + 3, 1, 2, c); ret(ctx, ox + 11, y + 3, 1, 2, c);
    return;
  }
  // Base: topo da cabeça
  ret(ctx, ox + 4, y + 1, 8, 2, c);
  ret(ctx, ox + 5, y + 1, 4, 1, sombrear(c, -0.2));
  ret(ctx, ox + 4, y + 3, 1, 2, c);
  ret(ctx, ox + 11, y + 3, 1, 2, c);
  if (costas) ret(ctx, ox + 4, y + 3, 8, 4, c), ret(ctx, ox + 4, y + 6, 8, 1, cEsc);
  if (estilo === 'longo') {
    ret(ctx, ox + 3, y + 3, 2, 7, c);
    ret(ctx, ox + 11, y + 3, 2, 7, c);
    if (costas) ret(ctx, ox + 4, y + 7, 8, 3, c);
  }
  if (estilo === 'coque') {
    ret(ctx, ox + 6, y - 2, 4, 3, c);
    ret(ctx, ox + 5, y - 1, 6, 1, c);
    ret(ctx, ox + 7, y - 2, 2, 1, sombrear(c, -0.2));
  }
  if (estilo === 'fone' || v.fone) {
    const f = v.fone || '#23232b';
    ret(ctx, ox + 4, y, 8, 1, f);
    ret(ctx, ox + 3, y + 1, 1, 1, f); ret(ctx, ox + 12, y + 1, 1, 1, f);
    ret(ctx, ox + 2, y + 3, 2, 3, f); ret(ctx, ox + 12, y + 3, 2, 3, f);
  }
}

// ---------------------------------------------------------------
// Perfil (direita). A esquerda é desenhada espelhando esta.
// ---------------------------------------------------------------
function desenharLado(ctx, ox, oy, v, quadro, sentado, digitando, t) {
  const camisa = v.camisa, camisaEsc = sombrear(v.camisa, 0.25);
  const calca = v.calca, sapato = '#241f1c';
  const bob = quadro === 0 ? 0 : -1;

  if (!sentado) {
    sombra(ctx, ox, oy);
    if (quadro === 0) {
      parte(ctx, ox + 7, oy + 12, 2, 2, calca);
      ret(ctx, ox + 7, oy + 14, 3, 1, sapato);
    } else {
      // Passada: uma perna à frente, outra atrás
      const frente = quadro === 1 ? 1 : -1;
      parte(ctx, ox + 7 - 2 * frente, oy + 12, 2, 2, sombrear(calca, 0.2));
      parte(ctx, ox + 7 + 2 * frente, oy + 12, 2, 2, calca);
      ret(ctx, ox + 7 - 2 * frente, oy + 14, 3, 1, sapato);
      ret(ctx, ox + 7 + 2 * frente, oy + 14, 3, 1, sapato);
    }
  }

  const y = oy + bob;
  // Tronco
  parte(ctx, ox + 5, y + 8, 6, 4, camisa);
  ret(ctx, ox + 5, y + 11, 6, 1, camisaEsc);
  if (v.gravata) ret(ctx, ox + 10, y + 8, 1, 3, v.gravata);
  // Braço (balança ao andar; vai para frente ao digitar)
  let bx = 0;
  if (quadro === 1) bx = 1;
  if (quadro === 2) bx = -1;
  if (digitando) bx = 1 + (Math.floor(t * 8) % 2);
  parte(ctx, ox + 7 + bx, y + 8, 2, 3, camisaEsc);
  ret(ctx, ox + 7 + bx, y + 11, 2, 1, v.pele);

  // Cabeça
  parte(ctx, ox + 4, y + 1, 8, 7, v.pele);
  const c = v.cabelo;
  if (v.cabeloEstilo === 'bone') {
    ret(ctx, ox + 3, y, 9, 3, v.bone);
    ret(ctx, ox + 12, y + 2, 3, 1, sombrear(v.bone, 0.3));
    ret(ctx, ox + 4, y + 3, 3, 3, c);
  } else {
    ret(ctx, ox + 4, y + 1, 8, 2, c);
    ret(ctx, ox + 4, y + 3, 3, 3, c);
    ret(ctx, ox + 5, y + 1, 4, 1, sombrear(c, -0.2));
    if (v.cabeloEstilo === 'longo') ret(ctx, ox + 3, y + 3, 4, 7, c);
    if (v.cabeloEstilo === 'coque') { ret(ctx, ox + 3, y - 1, 4, 3, c); ret(ctx, ox + 2, y, 1, 2, c); }
    if (v.fone || v.cabeloEstilo === 'fone') {
      const f = v.fone || '#23232b';
      ret(ctx, ox + 6, y, 3, 1, f);
      ret(ctx, ox + 6, y + 3, 3, 3, f);
    }
  }
  // Olho e nariz
  ret(ctx, ox + 10, y + 4, 1, 2, CONTORNO);
  ret(ctx, ox + 12, y + 5, 1, 1, sombrear(v.pele, 0.15));
  if (v.oculos) {
    ret(ctx, ox + 9, y + 4, 3, 1, '#39364a');
    ret(ctx, ox + 7, y + 4, 2, 1, '#39364a');
  }
}

/** Retrato pequeno (para a lista do time): personagem de frente num canvas próprio */
export function retrato(v, tamanho = 40) {
  const base = document.createElement('canvas');
  base.width = 16; base.height = 18;
  const b = base.getContext('2d');
  desenharPersonagem(b, 0, 2, v, { dir: 'baixo' });
  const c = document.createElement('canvas');
  c.width = tamanho; c.height = tamanho;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const s = Math.floor(tamanho / 18);
  ctx.drawImage(base, Math.floor((tamanho - 16 * s) / 2), Math.floor((tamanho - 18 * s) / 2), 16 * s, 18 * s);
  return c;
}
