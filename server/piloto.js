// =============================================================
// Piloto automático de prospecção
// -------------------------------------------------------------
// De tempos em tempos manda o time procurar negócios REAIS (na web,
// só dados públicos de empresas) e preparar o pacote completo de
// cada um. Tudo para em "aguardando sua aprovação": o envio ao
// cliente continua sendo feito por você.
//
// Limites para não gastar demais nem sobrecarregar o time:
//  - só no horário escolhido;  - no máximo `porDia` negócios por dia;
//  - uma busca de cada vez;     - espera se já houver muitos em andamento;
//  - intervalo mínimo entre buscas.
// =============================================================
import * as db from './db.js';

export const PADRAO = {
  ativo: false,
  cidade: 'Ribeirão Preto - SP',
  nichos: ['clínica de estética', 'consultório odontológico', 'fisioterapia', 'salão de beleza', 'barbearia', 'personal trainer'],
  porDia: 4,
  horaInicio: 8,
  horaFim: 20,
  maxEmAndamento: 4,
  intervaloMin: 20,
};

const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();

export class Piloto {
  constructor(esc, agoraFn = () => new Date()) {
    this.esc = esc;
    this.agora = agoraFn;
    this.motivo = 'Desligado';
    this.timer = null;
  }

  config() {
    return { ...PADRAO, ...(db.lerAjuste('piloto', {}) || {}) };
  }

  /** Valida e salva as configurações vindas do painel */
  salvar(novo) {
    const atual = this.config();
    const num = (v, min, max, padrao) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : padrao;
    };
    const cfg = {
      ativo: typeof novo.ativo === 'boolean' ? novo.ativo : atual.ativo,
      cidade: String(novo.cidade ?? atual.cidade).trim().slice(0, 80) || PADRAO.cidade,
      nichos: (Array.isArray(novo.nichos) ? novo.nichos : atual.nichos)
        .map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 12),
      porDia: num(novo.porDia ?? atual.porDia, 1, 20, PADRAO.porDia),
      horaInicio: num(novo.horaInicio ?? atual.horaInicio, 0, 23, PADRAO.horaInicio),
      horaFim: num(novo.horaFim ?? atual.horaFim, 1, 24, PADRAO.horaFim),
      maxEmAndamento: atual.maxEmAndamento,
      intervaloMin: atual.intervaloMin,
    };
    if (!cfg.nichos.length) cfg.nichos = PADRAO.nichos;
    db.salvarAjuste('piloto', cfg);
    this.esc.log({ tipo: 'decisao', texto: cfg.ativo
      ? `Você ligou o piloto automático: até ${cfg.porDia} negócios por dia em ${cfg.cidade}, das ${cfg.horaInicio}h às ${cfg.horaFim}h.`
      : 'Você desligou o piloto automático.' });
    this.checar();
    return this.status();
  }

  status() {
    const cfg = this.config();
    return { ...cfg, hoje: db.contarPiloto(inicioDoDia(this.agora())), motivo: this.motivo };
  }

  iniciar() {
    this.checar();
    this.timer = setInterval(() => this.checar(), 60 * 1000);
    this.timer.unref?.();
  }

  parar() { clearInterval(this.timer); }

  /** Decide se é hora de mandar o time prospectar. Devolve o motivo (para o painel e os testes). */
  checar() {
    const cfg = this.config();
    const agora = this.agora();
    const hoje = db.contarPiloto(inicioDoDia(agora));
    const definir = (m) => {
      if (m !== this.motivo) { this.motivo = m; this.esc.emitir('piloto', this.status()); }
      return m;
    };

    if (!cfg.ativo) return definir('Desligado');
    const hora = agora.getHours();
    if (hora < cfg.horaInicio || hora >= cfg.horaFim) return definir(`Fora do horário (${cfg.horaInicio}h–${cfg.horaFim}h)`);
    if (hoje >= cfg.porDia) return definir(`Meta do dia cumprida (${hoje}/${cfg.porDia})`);
    if (db.tarefasAbertas(['piloto', 'buscar'])) return definir('Buscando novos clientes…');
    if (db.contadores().emAndamento >= cfg.maxEmAndamento) return definir('Esperando o time terminar os negócios em andamento');
    const ultima = db.lerAjuste('piloto_ultima', null);
    if (ultima && agora - new Date(ultima) < cfg.intervaloMin * 60 * 1000) return definir('Aguardando o intervalo entre buscas');

    // Hora de prospectar: próximo nicho da lista (rodízio)
    const idx = (db.lerAjuste('piloto_idx', 0) || 0) % cfg.nichos.length;
    const nicho = cfg.nichos[idx];
    const quantidade = Math.min(2, cfg.porDia - hoje);
    db.salvarAjuste('piloto_idx', idx + 1);
    db.salvarAjuste('piloto_ultima', agora.toISOString());
    db.inserirTarefa({ agente: 'gerente', tipo: 'piloto', dados: { cidade: cfg.cidade, nicho, quantidade } });
    this.esc.log({ agente: 'gerente', texto: `Piloto automático: mandando Vendas procurar ${quantidade} ${nicho} em ${cfg.cidade}.` });
    this.esc.acordar('gerente');
    this.esc.emitirAgente('gerente');
    return definir(`Buscando ${nicho} em ${cfg.cidade}…`);
  }
}
