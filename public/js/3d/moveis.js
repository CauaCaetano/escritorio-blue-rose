// =============================================================
// Móveis do escritório 3D (estilo executivo: nogueira, couro,
// mármore, vidro e detalhes dourados). 1 tile = 1 unidade.
// Cada função recebe o objeto do layout e devolve um THREE.Group
// já posicionado no canto (x, y) do tile.
// =============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OURO } from './texturas.js';

// ---------------------------------------------------------------
// Materiais compartilhados
// ---------------------------------------------------------------
const std = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, metalness: 0, ...extra });
export const MAT = {
  ouro: std(OURO, { metalness: 0.85, roughness: 0.28 }),
  nogueira: std('#4a2f1e', { roughness: 0.45 }),
  nogueiraEscura: std('#2e1b10', { roughness: 0.5 }),
  couroPreto: std('#16161c', { roughness: 0.35 }),
  couroCaramelo: std('#6b3a22', { roughness: 0.38 }),
  couroCreme: std('#d8c6a0', { roughness: 0.45 }),
  veludoAzul: std('#24387c', { roughness: 0.9 }),
  marmoreBranco: std('#f2eee6', { roughness: 0.2 }),
  marmoreNegro: std('#15151c', { roughness: 0.15, metalness: 0.1 }),
  cromado: std('#c3c8d2', { metalness: 0.9, roughness: 0.2 }),
  preto: std('#0e0f14', { roughness: 0.4 }),
  branco: std('#f5f1e8'),
  vidro: new THREE.MeshStandardMaterial({ color: '#a8cff0', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  folha: std('#2f8f4e', { roughness: 0.8 }),
  folhaClara: std('#3fb866', { roughness: 0.8 }),
  rosa: std('#2f5fd0', { roughness: 0.5, emissive: '#0b1e5a', emissiveIntensity: 0.4 }),
};

/** Caixa com sombra; posição = centro */
export function caixa(w, h, d, mat, x, y, z, arredondado = 0) {
  const geo = arredondado ? new RoundedBoxGeometry(w, h, d, 2, arredondado) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cilindro(rTopo, rBase, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTopo, rBase, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const grupo = (o) => { const g = new THREE.Group(); g.position.set(o.x, 0, o.y); return g; };

// ---------------------------------------------------------------
// Mesa de trabalho com monitor (a tela é devolvida para acender)
// ---------------------------------------------------------------
export function mesa(m, executiva) {
  const g = grupo(m.mesa);
  const W = m.mesa.w;
  const tampo = executiva ? MAT.nogueiraEscura : MAT.nogueira;
  g.add(caixa(W - 0.1, 0.07, 0.86, tampo, W / 2, 0.76, 0.5, 0.02));
  g.add(caixa(W - 0.08, 0.02, 0.02, MAT.ouro, W / 2, 0.79, 0.93));            // filete dourado
  // Gaveteiro lateral e pés dourados
  g.add(caixa(0.45, 0.68, 0.7, tampo, W - 0.35, 0.36, 0.5));
  for (const x of [0.12]) for (const z of [0.15, 0.85]) g.add(cilindro(0.025, 0.025, 0.74, MAT.ouro, x, 0.37, z, 8));
  // Monitor (perto do lado do assento: coluna m.monitor.x)
  const mx = m.monitor.x - m.mesa.x + 0.5;
  g.add(cilindro(0.03, 0.03, 0.22, MAT.ouro, mx, 0.9, 0.3, 8));
  g.add(caixa(0.28, 0.02, 0.16, MAT.ouro, mx, 0.8, 0.3));
  const moldura = caixa(0.78, 0.46, 0.04, MAT.preto, mx, 1.22, 0.28, 0.01);
  g.add(moldura);
  const telaMat = new THREE.MeshStandardMaterial({ color: '#0b0e18', emissive: '#000000', roughness: 0.3 });
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.4), telaMat);
  tela.position.set(mx, 1.22, 0.305);
  g.add(tela);
  // Teclado, mouse e itens
  g.add(caixa(0.46, 0.02, 0.14, MAT.branco, mx, 0.8, 0.62));
  g.add(caixa(0.06, 0.02, 0.09, MAT.branco, mx + 0.34, 0.8, 0.64));
  if (executiva) {
    // Luminária de latão e porta-retrato
    g.add(cilindro(0.02, 0.02, 0.38, MAT.ouro, mx + 1.2, 0.98, 0.25, 8));
    g.add(cilindro(0.06, 0.13, 0.12, MAT.ouro, mx + 1.2, 1.18, 0.25));
    g.add(caixa(0.16, 0.2, 0.02, MAT.ouro, mx + 0.75, 0.89, 0.32));
  } else {
    g.add(cilindro(0.04, 0.035, 0.09, MAT.branco, mx + 0.8, 0.84, 0.55, 12));   // xícara
    g.add(caixa(0.22, 0.015, 0.3, MAT.branco, mx + 0.75, 0.795, 0.35));         // papéis
  }
  return { grupo: g, tela, telaMat };
}

/** Poltrona do assento (encosto atrás do agente, ou seja, para +z) */
export function cadeira(assento, executiva) {
  const g = grupo(assento);
  const couro = executiva ? MAT.couroCaramelo : MAT.couroPreto;
  g.add(caixa(0.5, 0.1, 0.48, couro, 0.5, 0.46, 0.55, 0.04));
  g.add(caixa(0.5, executiva ? 0.72 : 0.56, 0.1, couro, 0.5, executiva ? 0.86 : 0.78, 0.82, 0.04));
  g.add(cilindro(0.03, 0.03, 0.34, MAT.ouro, 0.5, 0.25, 0.55, 8));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = caixa(0.26, 0.03, 0.04, MAT.ouro, 0.5 + Math.cos(a) * 0.13, 0.06, 0.55 + Math.sin(a) * 0.13);
    p.rotation.y = -a;
    g.add(p);
  }
  return g;
}

// ---------------------------------------------------------------
// Demais móveis (por tipo do layout)
// ---------------------------------------------------------------
export const MOVEIS = {
  vaso(o) {
    const g = grupo(o);
    g.add(cilindro(0.2, 0.15, 0.42, MAT.preto, 0.5, 0.21, 0.5));
    g.add(cilindro(0.21, 0.21, 0.03, MAT.ouro, 0.5, 0.43, 0.5));
    const folhas = [[0.5, 0.75, 0.5, 0.26], [0.36, 0.62, 0.42, 0.18], [0.64, 0.66, 0.58, 0.2], [0.5, 0.95, 0.46, 0.17]];
    folhas.forEach(([x, y, z, r], i) => {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), i % 2 ? MAT.folhaClara : MAT.folha);
      f.position.set(x, y, z); f.castShadow = true; g.add(f);
    });
    [[0.4, 0.98, 0.6], [0.62, 1.04, 0.42], [0.52, 1.12, 0.55], [0.34, 0.86, 0.36]].forEach(([x, y, z]) => {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), MAT.rosa);
      r.position.set(x, y, z); g.add(r);
    });
    return g;
  },

  estante(o) {
    const g = grupo(o);
    const W = o.w || 1;
    g.add(caixa(W - 0.1, 2.0, 0.4, MAT.nogueiraEscura, W / 2, 1.0, 0.25));
    const cores = ['#1f3a8a', '#7a1f2b', OURO, '#1d4f36', '#e8dcc4', '#3b2a5c'];
    for (let p = 0; p < 4; p++) {
      const y = 0.25 + p * 0.45;
      g.add(caixa(W - 0.2, 0.03, 0.36, MAT.ouro, W / 2, y, 0.3));
      let x = 0.15;
      let i = p * 3 + o.x;
      while (x < W - 0.25) {
        const bw = 0.06 + (i % 3) * 0.02, bh = 0.26 + ((i * 7) % 4) * 0.03;
        g.add(caixa(bw, bh, 0.26, std(cores[i % cores.length]), x + bw / 2, y + bh / 2 + 0.02, 0.32));
        x += bw + 0.012 + (i % 5 === 0 ? 0.1 : 0);
        i++;
      }
    }
    return g;
  },

  arquivo(o) {
    const g = grupo(o);
    g.add(caixa(0.6, 1.1, 0.55, MAT.nogueiraEscura, 0.5, 0.55, 0.5));
    for (let i = 0; i < 3; i++) g.add(caixa(0.14, 0.03, 0.03, MAT.ouro, 0.5, 0.25 + i * 0.32, 0.79));
    return g;
  },

  balcao(o) {
    const g = grupo(o);
    const W = o.w;
    g.add(caixa(W, 0.9, 0.7, MAT.nogueiraEscura, W / 2, 0.45, 0.45));
    g.add(caixa(W + 0.05, 0.06, 0.78, MAT.marmoreBranco, W / 2, 0.93, 0.45));
    g.add(caixa(W, 0.02, 0.02, MAT.ouro, W / 2, 0.88, 0.85));
    // Máquina de espresso cromada
    g.add(caixa(0.55, 0.5, 0.42, MAT.cromado, 1.5, 1.21, 0.4, 0.04));
    g.add(caixa(0.4, 0.06, 0.1, MAT.preto, 1.5, 1.05, 0.66));
    [1.38, 1.62].forEach((x) => g.add(cilindro(0.045, 0.04, 0.09, MAT.branco, x, 1.0, 0.62, 12)));
    // Xícaras e pote
    [0.4, 0.6].forEach((x, i) => g.add(cilindro(0.05, 0.045, 0.1, i ? std('#1f3a8a') : MAT.branco, x, 1.01, 0.55, 12)));
    g.add(cilindro(0.12, 0.12, 0.2, std('#e8dcc4'), 2.55, 1.06, 0.45, 16));
    return g;
  },

  bebedouro(o) {
    const g = grupo(o);
    g.add(caixa(0.4, 1.0, 0.4, MAT.preto, 0.5, 0.5, 0.5));
    g.add(cilindro(0.15, 0.15, 0.4, new THREE.MeshStandardMaterial({ color: '#9fd6ff', transparent: true, opacity: 0.7 }), 0.5, 1.2, 0.5));
    return g;
  },

  mesaReuniao(o) {
    const g = grupo(o);
    const W = o.w, H = o.h;
    g.add(caixa(W - 0.2, 0.08, H - 0.3, MAT.marmoreNegro, W / 2, 0.76, H / 2, 0.03));
    g.add(caixa(W - 0.16, 0.03, H - 0.26, MAT.ouro, W / 2, 0.71, H / 2));
    [[0.6, 0.5], [W - 0.6, 0.5], [0.6, H - 0.5], [W - 0.6, H - 0.5]].forEach(([x, z]) =>
      g.add(cilindro(0.05, 0.05, 0.7, MAT.ouro, x, 0.35, z, 10)));
    // Notebook, papéis e arranjo de rosas
    const tampa = caixa(0.5, 0.3, 0.02, MAT.cromado, 1.6, 0.96, 0.8);
    tampa.rotation.x = -0.25;
    g.add(caixa(0.5, 0.02, 0.34, MAT.cromado, 1.6, 0.81, 1.0), tampa);
    g.add(caixa(0.3, 0.01, 0.4, MAT.branco, 3.4, 0.81, 1.0));
    g.add(cilindro(0.08, 0.06, 0.2, MAT.ouro, 4.6, 0.9, 1.0));
    [[4.55, 1.06, 0.95], [4.66, 1.1, 1.05], [4.6, 1.14, 0.98]].forEach(([x, y, z]) => {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 1), MAT.rosa); r.position.set(x, y, z); g.add(r);
    });
    return g;
  },

  cadeiraReuniao(o) {
    const g = grupo(o);
    const z = o.dir === 'baixo' ? 0.25 : 0.75; // encosto do lado oposto à mesa
    g.add(caixa(0.55, 0.1, 0.5, MAT.couroCreme, 0.5, 0.45, 0.5, 0.04));
    g.add(caixa(0.55, 0.5, 0.1, MAT.couroCreme, 0.5, 0.72, z, 0.04));
    g.add(cilindro(0.03, 0.03, 0.4, MAT.ouro, 0.5, 0.2, 0.5, 8));
    return g;
  },

  impressora(o) {
    // Pedestal com escultura dourada
    const g = grupo(o);
    g.add(caixa(0.5, 0.9, 0.5, MAT.preto, 0.5, 0.45, 0.5));
    g.add(caixa(0.52, 0.02, 0.52, MAT.ouro, 0.5, 0.91, 0.5));
    const esc = new THREE.Mesh(new THREE.TorusKnotGeometry(0.16, 0.05, 80, 10), MAT.ouro);
    esc.position.set(0.5, 1.2, 0.5); esc.castShadow = true;
    g.add(esc);
    g.userData.girar = esc;
    return g;
  },

  sofa(o) {
    // Chesterfield de veludo azul, de frente para cima (-z): encosto em +z
    const g = grupo(o);
    const W = o.w;
    g.add(caixa(W - 0.1, 0.36, 0.8, MAT.veludoAzul, W / 2, 0.22, 0.5, 0.06));
    g.add(caixa(W - 0.1, 0.5, 0.2, MAT.veludoAzul, W / 2, 0.6, 0.88, 0.06));
    g.add(caixa(0.2, 0.55, 0.8, MAT.veludoAzul, 0.15, 0.4, 0.5, 0.06), caixa(0.2, 0.55, 0.8, MAT.veludoAzul, W - 0.15, 0.4, 0.5, 0.06));
    for (let i = 0; i < W - 1; i++) g.add(caixa(0.9, 0.12, 0.62, std('#2b4396', { roughness: 0.95 }), 0.75 + i, 0.46, 0.46, 0.05));
    g.add(caixa(0.32, 0.3, 0.1, MAT.ouro, 0.7, 0.66, 0.74, 0.04), caixa(0.32, 0.3, 0.1, std('#e8dcc4'), W - 0.7, 0.66, 0.74, 0.04));
    return g;
  },

  mesinha(o) {
    const g = grupo(o);
    const W = o.w;
    g.add(caixa(W - 0.3, 0.03, 0.6, MAT.vidro, W / 2, 0.42, 0.5));
    g.add(caixa(W - 0.26, 0.02, 0.64, MAT.ouro, W / 2, 0.4, 0.5));
    [[0.2, 0.25], [W - 0.2, 0.25], [0.2, 0.75], [W - 0.2, 0.75]].forEach(([x, z]) => g.add(cilindro(0.02, 0.02, 0.4, MAT.ouro, x, 0.2, z, 6)));
    g.add(caixa(0.3, 0.04, 0.22, std('#7a1f2b'), 0.55, 0.45, 0.5));
    return g;
  },

  luminaria(o) {
    const g = grupo(o);
    g.add(cilindro(0.16, 0.18, 0.04, MAT.ouro, 0.5, 0.02, 0.5));
    g.add(cilindro(0.02, 0.02, 1.6, MAT.ouro, 0.5, 0.8, 0.5, 8));
    const cupula = cilindro(0.16, 0.24, 0.3, new THREE.MeshStandardMaterial({ color: '#f1e3c0', emissive: '#ffcf80', emissiveIntensity: 0.4 }), 0.5, 1.65, 0.5);
    g.add(cupula);
    g.userData.cupula = cupula;
    return g;
  },

  aparador(o) {
    const g = grupo(o);
    const W = o.w;
    g.add(caixa(W - 0.1, 0.62, 0.5, MAT.nogueiraEscura, W / 2, 0.31, 0.55));
    g.add(caixa(W - 0.08, 0.03, 0.52, MAT.nogueira, W / 2, 0.635, 0.55));
    for (let i = 0; i < W; i++) g.add(caixa(0.12, 0.02, 0.02, MAT.ouro, 0.5 + i, 0.4, 0.81));
    // Livros, vaso com rosa e troféu
    ['#1f3a8a', '#7a1f2b', OURO].forEach((c, i) => g.add(caixa(0.07, 0.26, 0.2, std(c), 0.3 + i * 0.09, 0.78, 0.55)));
    g.add(cilindro(0.06, 0.05, 0.22, MAT.preto, 1.5, 0.76, 0.55));
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), MAT.rosa); r.position.set(1.5, 0.92, 0.55); g.add(r);
    g.add(cilindro(0.08, 0.03, 0.18, MAT.ouro, 2.5, 0.78, 0.55), cilindro(0.06, 0.06, 0.04, MAT.ouro, 2.5, 0.67, 0.55));
    return g;
  },
};
