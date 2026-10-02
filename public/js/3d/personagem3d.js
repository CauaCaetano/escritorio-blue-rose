// =============================================================
// Personagens 3D em estilo "voxel" (blocos), herdeiros do pixel art.
// Frente do personagem = +z local. Animações: andar, sentar,
// digitar e ler. Usa o mesmo "visual" de cada agente do servidor.
// =============================================================
import * as THREE from 'three';

const mats = new Map();
function mat(cor) {
  if (!mats.has(cor)) mats.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.75 }));
  return mats.get(cor);
}

function bloco(w, h, d, cor, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(cor));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function escurecer(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((n >> s) & 255) * (1 - t)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Membro com pivô no topo (para girar no ombro/quadril) */
function membro(w, h, d, cor, x, yPivo, z) {
  const pivo = new THREE.Group();
  pivo.position.set(x, yPivo, z);
  pivo.add(bloco(w, h, d, cor, 0, -h / 2, 0));
  return pivo;
}

export function criarPersonagem(v, agenteId) {
  const raiz = new THREE.Group();
  const corpo = new THREE.Group();
  raiz.add(corpo);

  const camisaEsc = escurecer(v.camisa, 0.25);
  // Pernas (pivô no quadril) com sapatos
  const pernaE = membro(0.13, 0.4, 0.15, v.calca, -0.09, 0.42, 0);
  const pernaD = membro(0.13, 0.4, 0.15, v.calca, 0.09, 0.42, 0);
  pernaE.add(bloco(0.14, 0.06, 0.2, '#1c1714', 0, -0.4, 0.03));
  pernaD.add(bloco(0.14, 0.06, 0.2, '#1c1714', 0, -0.4, 0.03));
  corpo.add(pernaE, pernaD);

  // Tronco (blazer) com camisa branca em V e gravata
  corpo.add(bloco(0.4, 0.44, 0.25, v.camisa, 0, 0.64, 0));
  corpo.add(bloco(0.12, 0.16, 0.02, '#f4f1ea', 0, 0.77, 0.13));
  if (v.gravata) corpo.add(bloco(0.06, 0.22, 0.02, v.gravata, 0, 0.7, 0.14));

  // Braços (pivô no ombro) com mãos
  const bracoE = membro(0.1, 0.38, 0.12, camisaEsc, -0.26, 0.84, 0);
  const bracoD = membro(0.1, 0.38, 0.12, camisaEsc, 0.26, 0.84, 0);
  bracoE.add(bloco(0.09, 0.08, 0.1, v.pele, 0, -0.42, 0));
  bracoD.add(bloco(0.09, 0.08, 0.1, v.pele, 0, -0.42, 0));
  corpo.add(bracoE, bracoD);

  // Cabeça
  const cabeca = new THREE.Group();
  cabeca.position.set(0, 1.04, 0);
  cabeca.add(bloco(0.34, 0.34, 0.32, v.pele, 0, 0, 0));
  cabeca.add(bloco(0.05, 0.06, 0.02, '#1d1a26', -0.08, 0.02, 0.165), bloco(0.05, 0.06, 0.02, '#1d1a26', 0.08, 0.02, 0.165));
  cabeca.add(bloco(0.1, 0.02, 0.02, escurecer(v.pele, 0.25), 0, -0.09, 0.165));
  if (v.oculos) {
    cabeca.add(bloco(0.3, 0.025, 0.02, '#2a2735', 0, 0.06, 0.17));
    cabeca.add(bloco(0.09, 0.08, 0.01, '#9fc4e8', -0.08, 0.02, 0.172), bloco(0.09, 0.08, 0.01, '#9fc4e8', 0.08, 0.02, 0.172));
  }
  // Cabelo / boné / coque / fone
  const c = v.cabelo;
  if (v.cabeloEstilo === 'bone') {
    cabeca.add(bloco(0.37, 0.12, 0.35, v.bone, 0, 0.19, 0));
    cabeca.add(bloco(0.3, 0.03, 0.16, escurecer(v.bone, 0.2), 0, 0.14, 0.22));
    cabeca.add(bloco(0.36, 0.14, 0.06, c, 0, 0.02, -0.15));
  } else {
    cabeca.add(bloco(0.37, 0.1, 0.35, c, 0, 0.19, 0));
    cabeca.add(bloco(0.37, 0.24, 0.07, c, 0, 0.06, -0.15));
    cabeca.add(bloco(0.04, 0.16, 0.3, c, -0.18, 0.1, -0.01), bloco(0.04, 0.16, 0.3, c, 0.18, 0.1, -0.01));
    if (v.cabeloEstilo === 'longo') cabeca.add(bloco(0.38, 0.42, 0.08, c, 0, -0.12, -0.15));
    if (v.cabeloEstilo === 'coque') cabeca.add(bloco(0.16, 0.14, 0.14, c, 0, 0.24, -0.12));
  }
  if (v.fone || v.cabeloEstilo === 'fone') {
    const f = v.fone || '#23232b';
    cabeca.add(bloco(0.4, 0.04, 0.06, f, 0, 0.25, 0));
    cabeca.add(bloco(0.05, 0.12, 0.12, f, -0.2, 0.02, 0), bloco(0.05, 0.12, 0.12, f, 0.2, 0.02, 0));
  }
  corpo.add(cabeca);

  // Sombra suave no chão
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.005;
  raiz.add(sombra);

  raiz.traverse((o) => { o.userData.agenteId = agenteId; });
  return { raiz, corpo, pernaE, pernaD, bracoE, bracoD, cabeca, sombra };
}

const ROTACAO = { baixo: 0, cima: Math.PI, direita: Math.PI / 2, esquerda: -Math.PI / 2 };

/**
 * Aplica a pose do quadro atual.
 * estado: { andando, fase, sentado, digitando, lendo, dir, t }
 */
export function posar(p, { andando, fase = 0, sentado, digitando, lendo, dir, t }) {
  p.raiz.rotation.y = ROTACAO[dir] ?? 0;
  // Zera
  p.pernaE.rotation.x = p.pernaD.rotation.x = 0;
  p.bracoE.rotation.x = p.bracoD.rotation.x = 0;
  p.cabeca.rotation.x = 0;
  p.corpo.position.set(0, 0, 0);
  p.sombra.visible = !sentado;

  if (andando) {
    const s = Math.sin(fase * Math.PI * 2);
    p.pernaE.rotation.x = s * 0.6;
    p.pernaD.rotation.x = -s * 0.6;
    p.bracoE.rotation.x = -s * 0.5;
    p.bracoD.rotation.x = s * 0.5;
    p.corpo.position.y = Math.abs(Math.cos(fase * Math.PI * 2)) * 0.03;
    return;
  }
  if (sentado) {
    // Sentado na poltrona, pernas para a frente
    p.corpo.position.y = 0.06;
    p.corpo.position.z = 0.16; // um pouco à frente, perto do teclado
    p.pernaE.rotation.x = p.pernaD.rotation.x = -Math.PI / 2.1;
    if (digitando) {
      p.bracoE.rotation.x = -1.15 + Math.sin(t * 18) * 0.08;
      p.bracoD.rotation.x = -1.15 + Math.cos(t * 18) * 0.08;
    } else if (lendo) {
      p.bracoE.rotation.x = p.bracoD.rotation.x = -0.9;
      p.cabeca.rotation.x = 0.12;
    } else {
      p.bracoE.rotation.x = p.bracoD.rotation.x = -0.5;
    }
    return;
  }
  // Parado: respiração leve
  p.corpo.position.y = Math.sin(t * 2) * 0.008;
}
