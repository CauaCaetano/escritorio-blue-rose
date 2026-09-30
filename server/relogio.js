// =============================================================
// Relógio da simulação
// -------------------------------------------------------------
// Todo "tempo de trabalho" dos agentes passa por aqui. O relógio
// avança em milissegundos simulados; com velocidade 2x ele anda
// duas vezes mais rápido que o tempo real. Mudar a velocidade no
// meio de uma espera tem efeito imediato.
// =============================================================

const INTERVALO_MS = 50;

export class Relogio {
  constructor(velocidade = 1) {
    this.velocidade = velocidade;
    this.agora = 0;          // tempo simulado (ms)
    this.esperas = [];       // [{ ate, resolver }]
    this.timer = setInterval(() => this.tique(), INTERVALO_MS);
  }

  tique() {
    this.agora += INTERVALO_MS * this.velocidade;
    if (!this.esperas.length) return;
    const prontas = this.esperas.filter((e) => e.ate <= this.agora);
    if (!prontas.length) return;
    this.esperas = this.esperas.filter((e) => e.ate > this.agora);
    for (const e of prontas) e.resolver();
  }

  /** Espera `ms` milissegundos de tempo SIMULADO */
  esperar(ms) {
    return new Promise((resolver) => {
      this.esperas.push({ ate: this.agora + ms, resolver });
    });
  }

  definirVelocidade(v) {
    this.velocidade = v;
  }

  parar() {
    clearInterval(this.timer);
  }
}
