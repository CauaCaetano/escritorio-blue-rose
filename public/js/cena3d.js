// =============================================================
// Escritório BLUE ROSE em 3D (Three.js)
// -------------------------------------------------------------
// Mesma ideia da visão 2D: o backend decide tudo (caminhos, estados,
// balões); aqui só desenhamos e interpolamos o movimento.
// Câmera: arraste para girar, botão direito para mover, roda para zoom.
// =============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { COLS, ROWS, MAPA, MESAS, OBJETOS, DEPARTAMENTOS } from '/shared/layout.js';
import * as TX from './3d/texturas.js';
import { MAT, MOVEIS, mesa, cadeira, caixa } from './3d/moveis.js';
import { criarPersonagem, posar } from './3d/personagem3d.js';

const DIRECOES = { '1,0': 'direita', '-1,0': 'esquerda', '0,1': 'baixo', '0,-1': 'cima' };
const ALTURA_PAREDE = 3.2;
const BALOES = {
  digitando: '<span class="pontos"><i></i><i></i><i></i></span>',
  lendo: '?',
  aprovacao: '!',
  envelope: '✉',
  cafe: '☕',
};

export class Cena3D {
  constructor(container, { aoClicarAgente }) {
    this.container = container;
    this.aoClicarAgente = aoClicarAgente;
    this.agentes = new Map();
    this.velocidade = 1;
    this.selecionado = null;
    this.ativo = false;
    this.noite = false;
    this.telas = new Map();     // dono -> material da tela
    this.giratorios = [];
    this.cupulas = [];

    // Renderizadores (WebGL + rótulos HTML por cima)
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.rotulos = new CSS2DRenderer();
    this.rotulos.domElement.className = 'rotulos3d';
    container.append(this.renderer.domElement, this.rotulos.domElement);
    this.renderer.domElement.classList.add('canvas3d');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 200);
    this.controles = new OrbitControls(this.camera, this.renderer.domElement);
    this.controles.enableDamping = true;
    this.controles.dampingFactor = 0.08;
    this.controles.minDistance = 8;
    this.controles.maxDistance = 55;
    this.controles.minPolarAngle = 0.25;
    this.controles.maxPolarAngle = 1.3;
    this.controles.screenSpacePanning = false;
    this.centralizar();

    this.montarLuzes();
    this.montarAmbiente();
    this.definirTema('claro');

    // Clique em personagem (ignora quando o usuário arrastou a câmera)
    this.raycaster = new THREE.Raycaster();
    let inicio = null;
    this.renderer.domElement.addEventListener('pointerdown', (e) => { inicio = { x: e.clientX, y: e.clientY }; });
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (!inicio || Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 5) return;
      this.clique(e);
    });

    new ResizeObserver(() => this.ajustarTamanho()).observe(container);
    window.addEventListener('resize', () => this.ajustarTamanho());
    this.ajustarTamanho();

    this.relogio = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.quadro());
  }

  // ---------------------------------------------------------------
  // Montagem do cenário
  // ---------------------------------------------------------------
  centralizar() {
    this.controles.target.set(COLS / 2 - 1, 0, ROWS / 2 + 0.5);
    this.camera.position.set(COLS / 2 - 1, 21, ROWS + 11);
    this.controles.update();
  }

  montarLuzes() {
    this.hemi = new THREE.HemisphereLight('#f4f1ff', '#5a4a3a', 1.2);
    this.sol = new THREE.DirectionalLight('#fff3dc', 2.2);
    this.sol.position.set(COLS * 0.2, 30, -8);
    this.sol.target.position.set(COLS / 2, 0, ROWS / 2);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const s = this.sol.shadow.camera;
    s.left = -26; s.right = 26; s.top = 22; s.bottom = -22; s.near = 1; s.far = 80;
    this.sol.shadow.bias = -0.0005;
    this.scene.add(this.hemi, this.sol, this.sol.target);

    // Luzes quentes do teto (fortes à noite)
    this.lampadas = [[4.5, 5], [8.5, 12], [28.5, 12], [10.5, 20], [19.5, 5], [32.5, 5.5], [30, 20]].map(([x, z]) => {
      const l = new THREE.PointLight('#ffd49a', 0, 9, 1.6);
      l.position.set(x, 2.8, z);
      this.scene.add(l);
      return l;
    });
  }

  montarAmbiente() {
    const cena = this.scene;

    // Piso de mármore
    this.texMarmore = { claro: TX.marmore(false), escuro: TX.marmore(true) };
    for (const t of Object.values(this.texMarmore)) t.repeat.set(COLS / 2, (ROWS - 2) / 2);
    this.matPiso = new THREE.MeshStandardMaterial({ map: this.texMarmore.claro, roughness: 0.25, metalness: 0.05 });
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS - 2), this.matPiso);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(COLS / 2, 0, 2 + (ROWS - 2) / 2);
    piso.receiveShadow = true;
    cena.add(piso);

    // Sala do CEO: madeira espinha-de-peixe + tapete azul com borda dourada
    const madeira = TX.espinhaDePeixe();
    madeira.repeat.set(5, 3.5);
    this.plano(10, 7, new THREE.MeshStandardMaterial({ map: madeira, roughness: 0.55 }), 5, 5.5, 0.004);
    this.plano(8, 5, new THREE.MeshStandardMaterial({ map: TX.tapete('#1f3a8a', { damasco: true }), roughness: 0.95 }), 5, 5.5, 0.01);

    // Tapetes dos departamentos e dos lounges
    for (const o of OBJETOS) {
      if (o.tipo === 'tapeteMesa') this.plano(o.w - 0.2, o.h, new THREE.MeshStandardMaterial({ map: TX.tapete(o.cor), roughness: 0.95 }), o.x + o.w / 2, o.y + o.h / 2, 0.008);
      if (o.tipo === 'tapeteLounge') this.plano(o.w - 0.3, o.h - 0.3, new THREE.MeshStandardMaterial({ map: TX.tapete('#223579', { damasco: true }), roughness: 0.95 }), o.x + o.w / 2, o.y + o.h / 2, 0.008);
    }

    // Parede do fundo, com janelas para a cidade
    this.matParede = new THREE.MeshStandardMaterial({ color: '#18213f', roughness: 0.8 });
    cena.add(caixa(COLS, ALTURA_PAREDE, 2, this.matParede, COLS / 2, ALTURA_PAREDE / 2, 1));
    cena.add(caixa(COLS, 0.08, 0.06, MAT.ouro, COLS / 2, 0.55, 2.03));          // rodapé dourado
    cena.add(caixa(COLS, 0.06, 0.06, MAT.ouro, COLS / 2, ALTURA_PAREDE - 0.25, 2.03));
    this.texCidade = { claro: [], escuro: [] };
    this.matJanelas = [];
    for (let x = 0; x < COLS; x++) {
      if (MAPA[0][x] === 'N' && MAPA[0][x - 1] !== 'N') {
        const dia = TX.cidade(false, x + 3), noite = TX.cidade(true, x + 3);
        const m = new THREE.MeshBasicMaterial({ map: dia });
        m.userData = { dia, noite };
        this.matJanelas.push(m);
        const vidro = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.0), m);
        vidro.position.set(x + 1, 1.65, 2.02);
        cena.add(vidro);
        // Moldura dourada e cortinas de veludo
        cena.add(caixa(1.9, 0.05, 0.05, MAT.ouro, x + 1, 2.67, 2.04), caixa(1.9, 0.05, 0.05, MAT.ouro, x + 1, 0.63, 2.04));
        cena.add(caixa(0.04, 2.0, 0.05, MAT.ouro, x + 1, 1.65, 2.04));
        cena.add(caixa(0.18, 2.4, 0.12, MAT.veludoAzul, x - 0.02, 1.55, 2.1), caixa(0.18, 2.4, 0.12, MAT.veludoAzul, x + 2.02, 1.55, 2.1));
      }
    }

    // Paredes laterais baixas (deixam a câmera ver o andar)
    cena.add(caixa(0.2, 1.0, ROWS - 2, this.matParede, -0.1, 0.5, ROWS / 2 + 1));
    cena.add(caixa(0.2, 1.0, ROWS - 2, this.matParede, COLS + 0.1, 0.5, ROWS / 2 + 1));
    cena.add(caixa(COLS + 0.4, 0.35, 0.2, this.matParede, COLS / 2, 0.175, ROWS - 0.9));

    // Divisórias de vidro da sala do CEO (com porta em D)
    for (let y = 2; y <= 9; y++) {
      for (let x = 0; x <= 10; x++) {
        if (MAPA[y][x] !== 'P') continue;
        const vertical = x === 10 && y < 9;
        const w = vertical ? 0.08 : 1, d = vertical ? 1 : 0.08;
        cena.add(caixa(w, 2.3, d, MAT.vidro, x + 0.5, 1.15, y + 0.5));
        cena.add(caixa(vertical ? 0.1 : 1, 0.05, vertical ? 1 : 0.1, MAT.ouro, x + 0.5, 2.32, y + 0.5));
        cena.add(caixa(vertical ? 0.1 : 1, 0.05, vertical ? 1 : 0.1, MAT.ouro, x + 0.5, 0.03, y + 0.5));
      }
    }

    // Decoração da parede
    for (const o of OBJETOS) {
      if (o.tipo === 'placa') this.quadroParede(TX.placaBlueRose(), o.x + o.w / 2, 2.0, o.w - 0.4, 0.9, { emissivo: 0.35 });
      if (o.tipo === 'quadro') this.quadroParede(TX.painelTV(), o.x + o.w / 2, 1.75, o.w - 0.6, 1.2, { emissivo: 0.8, moldura: MAT.preto });
      if (o.tipo === 'arte') this.quadroParede(TX.arteAbstrata(o.cores), o.x + o.w / 2, 1.7, 0.9, 1.1);
      if (o.tipo === 'relogio') {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 28), MAT.ouro);
        r.rotation.x = Math.PI / 2; r.position.set(o.x + 0.5, 2.3, 2.04); cena.add(r);
      }
    }

    // Móveis
    for (const o of OBJETOS) {
      const fn = MOVEIS[o.tipo];
      if (!fn) continue;
      const g = fn(o);
      if (g.userData.girar) this.giratorios.push(g.userData.girar);
      if (g.userData.cupula) this.cupulas.push(g.userData.cupula);
      cena.add(g);
    }

    // Estações de trabalho (mesa + monitor + poltrona) de cada agente
    for (const [dono, m] of Object.entries(MESAS)) {
      const executiva = ['gerente', 'headVendas', 'headMarketing', 'cto'].includes(dono);
      const { grupo, telaMat } = mesa(m, executiva);
      cena.add(grupo, cadeira(m.assento, executiva));
      this.telas.set(dono, telaMat);
    }

    // Placas dos departamentos (flutuando sobre cada área)
    for (const d of DEPARTAMENTOS) {
      const div = document.createElement('div');
      div.className = 'placa-depto';
      div.textContent = d.nome;
      div.style.setProperty('--cor', d.cor);
      const rot = new CSS2DObject(div);
      rot.position.set(d.x + d.w / 2, 2.9, d.y + 0.2);
      cena.add(rot);
    }
    const ceo = document.createElement('div');
    ceo.className = 'placa-depto';
    ceo.textContent = 'DIRETORIA';
    ceo.style.setProperty('--cor', '#1f3a8a');
    const rotCeo = new CSS2DObject(ceo);
    rotCeo.position.set(5, 2.9, 2.6);
    cena.add(rotCeo);

    // Anel dourado que marca o personagem selecionado
    this.anel = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 40), new THREE.MeshBasicMaterial({ color: '#e6c878', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    this.anel.rotation.x = -Math.PI / 2;
    this.anel.visible = false;
    cena.add(this.anel);
  }

  plano(w, h, material, cx, cz, y = 0.005) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, y, cz);
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  quadroParede(textura, cx, cy, w, h, { emissivo = 0, moldura = MAT.ouro } = {}) {
    this.scene.add(caixa(w + 0.12, h + 0.12, 0.05, moldura, cx, cy, 2.03));
    const mat = new THREE.MeshStandardMaterial({ map: textura, emissive: '#ffffff', emissiveMap: emissivo ? textura : null, emissiveIntensity: emissivo, roughness: 0.6 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(cx, cy, 2.06);
    this.scene.add(m);
  }

  // ---------------------------------------------------------------
  // API igual à da cena 2D (usada pelo app.js)
  // ---------------------------------------------------------------
  definirTema(tema) {
    this.noite = tema === 'escuro';
    const n = this.noite;
    this.scene.background = new THREE.Color(n ? '#05070f' : '#dfe6f2');
    this.scene.fog = new THREE.Fog(n ? '#05070f' : '#dfe6f2', 55, 110);
    this.hemi.intensity = n ? 0.35 : 1.2;
    this.sol.intensity = n ? 0.25 : 2.2;
    this.sol.color.set(n ? '#8fa3ff' : '#fff3dc');
    this.renderer.toneMappingExposure = n ? 1.15 : 1.0;
    this.matPiso.map = n ? this.texMarmore.escuro : this.texMarmore.claro;
    this.matPiso.needsUpdate = true;
    for (const m of this.matJanelas) { m.map = n ? m.userData.noite : m.userData.dia; m.needsUpdate = true; }
    for (const l of this.lampadas) l.intensity = n ? 9 : 2.5;
    for (const c of this.cupulas) c.material.emissiveIntensity = n ? 1.6 : 0.4;
  }

  definirVelocidade(v) { this.velocidade = v; }

  ativar(sim) {
    this.ativo = sim;
    this.container.hidden = !sim;
    if (sim) this.ajustarTamanho();
  }

  atualizarAgente(d) {
    let r = this.agentes.get(d.id);
    if (!r) {
      const p = criarPersonagem(d.visual, d.id);
      // Rótulo "Nome · Cargo" e balão
      const etiqueta = document.createElement('div');
      etiqueta.className = 'etiqueta3d';
      etiqueta.innerHTML = `<b></b><i class="sep"> · </i><span></span>`;
      etiqueta.querySelector('b').textContent = d.nome;
      etiqueta.querySelector('span').textContent = d.cargo;
      const rotEtiqueta = new CSS2DObject(etiqueta);
      rotEtiqueta.position.set(0, 1.62, 0);
      const balao = document.createElement('div');
      balao.className = 'balao3d';
      const rotBalao = new CSS2DObject(balao);
      rotBalao.position.set(0, 2.0, 0);
      p.raiz.add(rotEtiqueta, rotBalao);
      this.scene.add(p.raiz);
      r = { p, etiqueta, balao, balaoAtual: undefined, px: d.x + 0.5, pz: d.y + 0.5, dir: d.dir, movId: null, pts: null, prog: 0 };
      this.agentes.set(d.id, r);
    }
    r.dados = d;
    r.etiqueta.classList.toggle('selecionado', this.selecionado === d.id);
    if (d.movimento) {
      const m = d.movimento;
      if (r.movId !== m.id) { r.movId = m.id; r.pts = [m.de, ...m.caminho]; r.passoMs = m.passoMs; }
      r.prog = m.decorrido / m.passoMs;
    } else {
      r.movId = null;
      r.pts = null;
      r.px = d.x + 0.5;
      r.pz = d.y + 0.5;
      r.dir = d.dir;
    }
  }

  selecionar(id) {
    this.selecionado = id;
    for (const [aid, r] of this.agentes) r.etiqueta.classList.toggle('selecionado', aid === id);
    const r = id && this.agentes.get(id);
    if (r) this.focoAlvo = new THREE.Vector3(r.px, 0, r.pz);
  }

  /** Posição na tela (px CSS, relativa ao container) acima da cabeça */
  posicaoNaTela(id) {
    const r = this.agentes.get(id);
    if (!r) return null;
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const v = new THREE.Vector3(r.px, 1.9, r.pz).project(this.camera);
    const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
    return { x, y, abaixo: y + 70 };
  }

  get elemento() { return this.renderer.domElement; }

  ajustarTamanho() {
    if (!this.ativo) return;
    const pai = this.container.parentElement;
    const estilo = getComputedStyle(pai);
    const w = Math.max(320, pai.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight));
    const h = Math.max(320, Math.min(window.innerHeight - 200, w * 0.62));
    this.renderer.setSize(w, h);
    this.rotulos.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  clique(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ponteiro = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ponteiro, this.camera);
    const alvos = [...this.agentes.values()].map((r) => r.p.raiz);
    const hit = this.raycaster.intersectObjects(alvos, true)[0];
    this.aoClicarAgente(hit?.object.userData.agenteId || null);
  }

  // ---------------------------------------------------------------
  // Laço de animação
  // ---------------------------------------------------------------
  quadro() {
    if (!this.ativo || document.hidden) return;
    const dt = Math.min(0.1, this.relogio.getDelta());
    const t = this.relogio.elapsedTime;

    // Câmera desliza até o agente selecionado
    if (this.focoAlvo) {
      this.controles.target.lerp(this.focoAlvo, 0.08);
      if (this.controles.target.distanceTo(this.focoAlvo) < 0.05) this.focoAlvo = null;
    }
    this.controles.update();

    for (const [id, r] of this.agentes) {
      // Movimento ao longo do caminho calculado pelo servidor
      let andando = false;
      if (r.pts) {
        r.prog = Math.min(r.prog + (dt * 1000 * this.velocidade) / r.passoMs, r.pts.length - 1);
        const fim = r.pts.length - 1;
        const seg = Math.min(Math.floor(r.prog), fim - 1);
        const f = r.prog - seg;
        const a = r.pts[seg], b = r.pts[seg + 1];
        r.px = a.x + (b.x - a.x) * f + 0.5;
        r.pz = a.y + (b.y - a.y) * f + 0.5;
        r.dir = DIRECOES[`${b.x - a.x},${b.y - a.y}`] || r.dir;
        andando = r.prog < fim;
      }
      const d = r.dados;
      const sentado = d.sentado && !andando;
      r.p.raiz.position.set(r.px, 0, r.pz);
      posar(r.p, {
        andando, fase: r.prog * 1.0, sentado, t, dir: r.dir || d.dir,
        digitando: sentado && d.estado === 'digitando', lendo: sentado && d.estado === 'lendo',
      });

      // Balão (troca o HTML só quando muda)
      const balao = andando ? null : d.balao;
      if (balao !== r.balaoAtual) {
        r.balaoAtual = balao;
        r.balao.className = `balao3d ${balao || 'vazio'}`;
        r.balao.innerHTML = balao ? BALOES[balao] : '';
      }

      // Tela do monitor acende quando o dono trabalha sentado
      const tela = this.telas.get(id);
      if (tela) {
        const naMesa = sentado && d.x === MESAS[id].assento.x && d.y === MESAS[id].assento.y;
        const modo = naMesa && (d.estado === 'digitando' || d.estado === 'lendo') ? d.estado : null;
        if (modo === 'digitando') { tela.emissive.set('#3d74ff'); tela.emissiveIntensity = 1.1 + Math.sin(t * 6) * 0.15; }
        else if (modo === 'lendo') { tela.emissive.set('#dfe8ff'); tela.emissiveIntensity = 0.9; }
        else { tela.emissive.set('#000000'); tela.emissiveIntensity = 0; }
      }

      if (id === this.selecionado) {
        this.anel.visible = true;
        this.anel.position.set(r.px, 0.02, r.pz);
        this.anel.material.opacity = 0.6 + Math.sin(t * 5) * 0.3;
      }
    }
    if (!this.selecionado || !this.agentes.has(this.selecionado)) this.anel.visible = false;
    for (const g of this.giratorios) g.rotation.y += dt * 0.6;

    this.renderer.render(this.scene, this.camera);
    this.rotulos.render(this.scene, this.camera);
  }
}
