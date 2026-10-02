// =============================================================
// Escritório: orquestra os agentes, o relógio e os eventos.
// -------------------------------------------------------------
// É o "cérebro" do backend. O front só recebe eventos e desenha.
// Eventos emitidos (tipo → dados):
//   agente     → estado público de um agente
//   negocio    → resumo de um negócio que mudou
//   log        → nova linha no log de atividade
//   contadores → números do painel
//   velocidade → 1, 2 ou 4
// =============================================================
import { Relogio } from './relogio.js';
import * as db from './db.js';
import { TIME } from './agentes/time.js';
import { Agente } from './agentes/Agente.js';
import { Gerente } from './agentes/Gerente.js';
import { criarFluxo } from './agentes/fluxo.js';
import { iaAtiva } from './ia/cliente.js';
import { config } from './config.js';
import { linksWhatsapp } from './whatsapp.js';
import { agendarSincronizacao, estadoSupabase } from './supabase.js';
import { Piloto } from './piloto.js';

export class Escritorio {
  constructor({ velocidade = 1 } = {}) {
    const salva = db.lerAjuste('velocidade', null);
    this.relogio = new Relogio(salva || velocidade);
    this.ouvintes = new Set();
    this.encerrando = false;
    this.fluxo = criarFluxo(this);
    this.piloto = new Piloto(this);
    this.agentes = new Map(
      TIME.map((def) => [def.id, def.id === 'gerente' ? new Gerente(this, def) : new Agente(this, def)]),
    );
  }

  iniciar() {
    for (const a of this.agentes.values()) a.iniciar();
    this.piloto.iniciar();
  }

  encerrar() {
    this.encerrando = true;
    this.piloto.parar();
    this.relogio.parar();
  }

  listaAgentes() {
    return [...this.agentes.values()];
  }

  // ---------------------------------------------------------------
  // Eventos para o front (WebSocket)
  // ---------------------------------------------------------------
  aoEmitir(fn) {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }

  emitir(tipo, dados) {
    for (const fn of this.ouvintes) {
      try { fn({ tipo, dados }); } catch (e) { console.error('Erro ao emitir evento', e); }
    }
  }

  emitirAgente(id) {
    const a = this.agentes.get(id);
    if (a) this.emitir('agente', a.publico());
  }

  emitirNegocio(id) {
    agendarSincronizacao(id, (texto) => this.log({ tipo: 'erro', texto }));
    this.emitir('negocio', resumoNegocio(db.obterNegocio(id)));
    this.emitir('contadores', db.contadores());
    this.agentes.get('gerente').atualizarAlerta();
  }

  log({ agente = null, negocioId = null, tipo = 'info', texto }) {
    const linha = db.registrarHistorico({ agente, negocioId, tipo, texto });
    this.emitir('log', linha);
    return linha;
  }

  acordar(id) {
    this.agentes.get(id)?.acordar();
  }

  /** Tudo o que o front precisa para desenhar a tela ao conectar */
  retrato() {
    return {
      velocidade: this.relogio.velocidade,
      ia: { ativa: iaAtiva(), modelo: config.modeloIA },
      supabase: estadoSupabase(),
      piloto: this.piloto.status(),
      agentes: this.listaAgentes().map((a) => a.publico()),
      aguardando: db.negociosAguardando().map(resumoNegocio),
      negocios: db.listarNegocios().slice(0, 50).map(resumoNegocio),
      log: db.historicoRecente(80),
      contadores: db.contadores(),
    };
  }

  // ---------------------------------------------------------------
  // Ações do usuário (vindas do painel)
  // ---------------------------------------------------------------
  novoPedido(texto, quantidade) {
    const pedido = db.criarPedido(texto, quantidade);
    db.inserirTarefa({ agente: 'gerente', tipo: 'pedido', dados: { pedidoId: pedido.id } });
    this.log({ agente: null, tipo: 'decisao', texto: `Você fez o pedido #${pedido.id}: "${texto}" (${quantidade}).` });
    this.acordar('gerente');
    this.emitirAgente('gerente');
    return pedido;
  }

  /** Negócio real cadastrado por você: vai para o Gerente e segue o fluxo */
  cadastrarNegocio(dados) {
    const n = db.criarNegocio({ ...dados, etapa: 'prospeccao' });
    db.inserirTarefa({ agente: 'gerente', tipo: 'negocio', negocioId: n.id });
    this.log({ negocioId: n.id, tipo: 'decisao', texto: `Você cadastrou ${n.nome} para análise.` });
    this.emitirNegocio(n.id);
    this.acordar('gerente');
    this.emitirAgente('gerente');
    return n;
  }

  aprovar(negocioId) {
    const n = db.obterNegocio(negocioId);
    if (!n) throw new ErroUsuario('Negócio não encontrado.', 404);
    if (n.status !== 'aguardando_aprovacao') throw new ErroUsuario('Este negócio não está aguardando aprovação.');
    db.salvarDecisao(n.id, 'aprovado');
    db.atualizarNegocio(n.id, { status: 'aprovado', etapa: 'aprovado', motivo: 'Aprovado por você. O envio é feito manualmente por você.' });
    this.log({ negocioId: n.id, tipo: 'decisao', texto: `Você aprovou ${n.nome}. Nada foi enviado: o envio é com você.` });
    this.emitirNegocio(n.id);
    return db.obterNegocio(n.id);
  }

  pedirAjuste(negocioId, comentario) {
    const n = db.obterNegocio(negocioId);
    if (!n) throw new ErroUsuario('Negócio não encontrado.', 404);
    if (n.status !== 'aguardando_aprovacao') throw new ErroUsuario('Este negócio não está aguardando aprovação.');
    db.transacao(() => {
      db.salvarDecisao(n.id, 'ajuste', comentario);
      db.atualizarNegocio(n.id, { status: 'em_ajuste', etapa: 'ajuste', motivo: `Ajuste pedido: ${comentario}` });
      db.inserirTarefa({ agente: 'gerente', tipo: 'ajuste', negocioId: n.id, dados: { comentario }, prioridade: 5 });
    });
    this.log({ negocioId: n.id, tipo: 'decisao', texto: `Você pediu ajuste em ${n.nome}: "${comentario}"` });
    this.emitirNegocio(n.id);
    this.acordar('gerente');
    return db.obterNegocio(n.id);
  }

  /**
   * Você exportou a mensagem aprovada. Só funciona para negócios aprovados.
   * Nada é enviado daqui: devolvemos os links e registramos no histórico.
   */
  registrarExportacao(negocioId, via, mensagemEditada) {
    const n = db.obterNegocio(negocioId);
    if (!n) throw new ErroUsuario('Negócio não encontrado.', 404);
    if (n.status !== 'aprovado') throw new ErroUsuario('Só dá para exportar mensagens de negócios aprovados.');
    const mensagem = mensagemEditada || db.ultimaProposta(n.id)?.mensagem || '';
    const comoFoi = { copiar: 'copiou a mensagem', whatsapp_web: 'abriu o WhatsApp Web com a mensagem', whatsapp_app: 'abriu o WhatsApp com a mensagem' }[via];
    this.log({ negocioId: n.id, tipo: 'decisao', texto: `Você ${comoFoi} de ${n.nome}. O envio é feito por você.` });
    return { ok: true, mensagem, links: linksWhatsapp(n.whatsapp, mensagem) };
  }

  definirVelocidade(v) {
    this.relogio.definirVelocidade(v);
    db.salvarAjuste('velocidade', v);
    this.emitir('velocidade', v);
    // Reenvia agentes andando para o front recalcular a animação
    for (const a of this.agentes.values()) if (a.movimento) this.emitir('agente', a.publico());
  }
}

/** Erro "esperado" causado por uma ação do usuário (vira resposta 4xx) */
export class ErroUsuario extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

/** Resumo de um negócio para o painel */
export function resumoNegocio(n) {
  if (!n) return null;
  const proposta = db.ultimaProposta(n.id);
  const previa = db.ultimaPrevia(n.id);
  return {
    id: n.id, nome: n.nome, tipo: n.tipo, cidade: n.cidade, instagram: n.instagram, whatsapp: n.whatsapp,
    status: n.status, etapa: n.etapa, motivo: n.motivo, atualizado_em: n.atualizado_em,
    mensagem: proposta?.mensagem || null,
    versaoProposta: proposta?.versao || 0,
    versaoPrevia: previa?.versao || 0,
    origem: proposta?.origem || null,
  };
}
