// =============================================================
// Texturas do escritório 3D, todas desenhadas em canvas (sem imagens)
// =============================================================
import * as THREE from 'three';

export const OURO = '#c9a54a';

function canvas(w, h, desenhar) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Gerador pseudoaleatório estável (mesma textura sempre) */
function aleatorio(semente) {
  let s = semente;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Mármore claro em placas grandes, com veios suaves */
export function marmore(noite = false) {
  const t = canvas(512, 512, (ctx, w, h) => {
    const r = aleatorio(7);
    ctx.fillStyle = noite ? '#d9d2c3' : '#efe9de';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(150,140,125,${0.08 + r() * 0.12})`;
      ctx.lineWidth = 0.6 + r() * 1.6;
      ctx.beginPath();
      let x = r() * w, y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.3) * 120; y += (r() - 0.5) * 90; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // Juntas das placas (2x2 tiles por placa)
    ctx.strokeStyle = 'rgba(120,110,95,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Madeira em espinha-de-peixe (sala do CEO) */
export function espinhaDePeixe() {
  const t = canvas(256, 256, (ctx) => {
    const cores = ['#6b4630', '#5d3c28', '#71492f', '#563624'];
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 64) {
        const i = (x / 64 + y / 32) % cores.length;
        ctx.fillStyle = cores[i];
        ctx.fillRect(x, y, 64, 32);
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        if ((x / 64 + y / 32) % 2) ctx.fillRect(x, y, 2, 32); else ctx.fillRect(x, y + 30, 64, 2);
        ctx.fillStyle = 'rgba(255,220,180,.06)';
        ctx.fillRect(x + 4, y + 6, 40, 3);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Tapete com borda dourada (cor livre); damasco opcional */
export function tapete(cor, { damasco = false, borda = OURO, larguraPx = 512, alturaPx = 256 } = {}) {
  return canvas(larguraPx, alturaPx, (ctx, w, h) => {
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, w, h);
    if (damasco) {
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      for (let y = 18; y < h; y += 28) for (let x = 18 + ((y / 28) % 2) * 14; x < w; x += 28) {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = borda;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, w - 44, h - 44);
  });
}

/** Vista da cidade pela janela (dia ou noite) */
export function cidade(noite, semente = 3) {
  return canvas(256, 256, (ctx, w, h) => {
    const r = aleatorio(semente);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (noite) { g.addColorStop(0, '#060b22'); g.addColorStop(1, '#1c2a5e'); }
    else { g.addColorStop(0, '#7fbde8'); g.addColorStop(1, '#dff0fb'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (noite) for (let i = 0; i < 30; i++) { ctx.fillStyle = '#f4f1d0'; ctx.fillRect(r() * w, r() * h * 0.5, 1.5, 1.5); }
    else { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(40 + r() * 100, 40, 70, 14); ctx.fillRect(60 + r() * 80, 30, 36, 12); }
    let x = 0;
    while (x < w) {
      const bw = 18 + r() * 30, bh = 60 + r() * 150;
      ctx.fillStyle = noite ? ['#141d3d', '#1a2550', '#0f1733'][Math.floor(r() * 3)] : ['#6f86a8', '#8aa0c0', '#5c7496'][Math.floor(r() * 3)];
      ctx.fillRect(x, h - bh, bw, bh);
      for (let wy = h - bh + 8; wy < h - 6; wy += 12) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 8) {
          if (r() < (noite ? 0.45 : 0.25)) { ctx.fillStyle = noite ? '#f3cf6e' : '#cfe3f5'; ctx.fillRect(wx, wy, 4, 6); }
        }
      }
      x += bw + 2;
    }
  });
}

/** Placa BLUE ROSE (letras douradas sobre veludo azul) */
export function placaBlueRose() {
  return canvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0d1430';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = OURO; ctx.lineWidth = 8; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = OURO;
    ctx.font = '600 64px "Playfair Display", Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌹 BLUE ROSE', w / 2, h / 2 + 4);
  });
}

/** Painel de resultados da TV de parede */
export function painelTV() {
  return canvas(256, 144, (ctx, w, h) => {
    ctx.fillStyle = '#0f1a3d'; ctx.fillRect(0, 0, w, h);
    [30, 48, 40, 64, 80, 104].forEach((bh, i) => {
      ctx.fillStyle = i === 5 ? OURO : '#6f94ff';
      ctx.fillRect(24 + i * 22, h - 18 - bh, 14, bh);
    });
    ctx.fillStyle = '#8fb0ff';
    for (let i = 0; i < 4; i++) ctx.fillRect(170, 30 + i * 22, 60 - i * 8, 6);
    ctx.fillStyle = '#4cc783'; ctx.fillRect(170, 120, 40, 6);
  });
}

/** Quadro abstrato */
export function arteAbstrata([c1, c2, c3]) {
  return canvas(128, 160, (ctx, w, h) => {
    ctx.fillStyle = '#f1ebdd'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c1; ctx.fillRect(14, 20, 56, 74);
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(84, 104, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c3; ctx.fillRect(30, 118, 44, 22);
  });
}

/** Tela de monitor: código (digitando) ou página (lendo) */
export function telaMonitor(modo) {
  return canvas(128, 80, (ctx, w, h) => {
    if (modo === 'lendo') {
      ctx.fillStyle = '#eef3ff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#9aa6c4';
      for (let i = 0; i < 6; i++) ctx.fillRect(10, 10 + i * 11, 70 + ((i * 37) % 38), 5);
    } else {
      ctx.fillStyle = '#10204d'; ctx.fillRect(0, 0, w, h);
      const cores = ['#8fb0ff', '#e6c878', '#4cc783', '#cfe0ff'];
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = cores[i % 4];
        ctx.fillRect(8 + (i % 3) * 8, 8 + i * 10, 30 + ((i * 29) % 60), 5);
      }
    }
  });
}
