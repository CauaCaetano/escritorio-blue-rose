// =============================================================
// Classe base de um agente
// -------------------------------------------------------------
// Cada agente:
//  - tem sua própria fila de tarefas (tabela "tarefas" no SQLite);
//  - trabalha UMA tarefa por vez, na ordem da fila;
//  - anda pelo escritório (o backend calcula o caminho e o front
//    só anima), senta na mesa, digita, lê, entrega tarefas e,
//    quando fica ocioso, às vezes vai pegar café.
// =============================================================
import { MESAS, CAFE, acharCaminho, direcao } from '../../shared/layout.js';
import * as db from '../db.js';
import { nomeDoAgente } from './time.js';

const PASSO_MS = 300;                 // tempo simulado para andar 1 tile
const aleatorio = (min, max) => min + Math.random() * (max - min);

let proximoMovimento = 1;

export class Agente {
  constructor(escritorio, def) {
    this.esc = escritorio;
    this.id = def.id;
    this.nome = def.nome;
    this.cargo = def.cargo;
    this.especialidade = def.especialidade;
    this.papel = def.papel;
    this.visual = def.visual;
    this.mesa = MESAS[def.id];

    // Estado visível (vai para o front)
    this.x = this.mesa.assento.x;
    this.y = this.mesa.assento.y;
    this.dir = 'cima';
    this.sentado = true;
    this.estado = 'esperando';      // parado | andando | digitando | lendo | esperando
    this.balao = null;              // digitando | lendo | aprovacao | envelope | cafe | null
    this.status = 'Aguardando tarefas';
    this.movimento = null;          // { id, de, caminho, passoMs, inicio }

    this._acordar = null;
    this._temNovidade = false;
  }

  // ---------------------------------------------------------------
  // Estado público enviado ao navegador
  // ---------------------------------------------------------------
  publico() {
    let movimento = null;
    if (this.movimento) {
      const m = this.movimento;
      movimento = { id: m.id, de: m.de, caminho: m.caminho, passoMs: m.passoMs, decorrido: this.esc.relogio.agora - m.inicio };
    }
    return {
      id: this.id, nome: this.nome, cargo: this.cargo, especialidade: this.especialidade,
      papel: this.papel, visual: this.visual,
      x: this.x, y: this.y, dir: this.dir, sentado: this.sentado,
      estado: this.estado, balao: this.balao, status: this.status,
      fila: db.tamanhoFila(this.id), movimento,
    };
  }

  atualizar(campos = {}) {
    Object.assign(this, campos);
    this.esc.emitir('agente', this.publico());
  }

  log(texto, extra = {}) {
    this.esc.log({ agente: this.id, texto, ...extra });
  }

  // ---------------------------------------------------------------
  // Laço principal: pega a próxima tarefa da fila ou fica ocioso
  // ---------------------------------------------------------------
  async iniciar() {
    while (!this.esc.encerrando) {
      const tarefa = db.pegarProximaTarefa(this.id);
      if (tarefa) {
        await this.executar(tarefa);
      } else {
        await this.ocioso();
      }
    }
  }

  async executar(tarefa) {
    try {
      if (tarefa.tipo === 'entregar') {
        await this.entregar(tarefa);
        return;
      }
      const tratador = this.esc.fluxo[this.id]?.[tarefa.tipo];
      if (!tratador) throw new Error(`Tarefa desconhecida "${tarefa.tipo}" para ${this.nome}`);

      await this.irParaMesa();
      const resultado = await tratador(this, tarefa);

      // Se o trabalho gerou uma entrega, ela entra no topo da fila deste
      // agente na mesma transação em que a tarefa é concluída.
      db.transacao(() => {
        db.concluirTarefa(tarefa.id);
        if (resultado?.entregar) {
          db.inserirTarefa({ agente: this.id, tipo: 'entregar', negocioId: tarefa.negocio_id, dados: resultado.entregar, prioridade: 10 });
        }
      });
    } catch (erro) {
      console.error(`[${this.nome}]`, erro);
      this.log(`Erro ao executar "${tarefa.tipo}": ${erro.message}`, { tipo: 'erro', negocioId: tarefa.negocio_id });
      db.concluirTarefa(tarefa.id);
    }
  }

  // ---------------------------------------------------------------
  // Ações básicas
  // ---------------------------------------------------------------

  /** Anda até um tile. O backend calcula o caminho; o front anima. */
  async andarAte(destino, status) {
    const caminho = acharCaminho({ x: this.x, y: this.y }, destino);
    if (!caminho.length) return;
    this.movimento = {
      id: proximoMovimento++, de: { x: this.x, y: this.y }, caminho,
      passoMs: PASSO_MS, inicio: this.esc.relogio.agora,
    };
    this.atualizar({ sentado: false, estado: 'andando', balao: null, status: status || this.status });
    await this.esc.relogio.esperar(caminho.length * PASSO_MS);
    const ultimo = caminho[caminho.length - 1];
    const penultimo = caminho.length > 1 ? caminho[caminho.length - 2] : this.movimento.de;
    this.movimento = null;
    this.atualizar({ x: ultimo.x, y: ultimo.y, dir: direcao(penultimo, ultimo), estado: 'parado' });
  }

  /** Volta para a própria cadeira e senta */
  async irParaMesa() {
    const a = this.mesa.assento;
    if (this.x !== a.x || this.y !== a.y) await this.andarAte(a, 'Voltando para a mesa');
    if (!this.sentado || this.dir !== 'cima') this.atualizar({ sentado: true, dir: 'cima' });
  }

  /** Trabalha sentado na mesa por um tempo (digitando ou lendo) */
  async trabalhar(estado, ms, status, negocioId) {
    await this.irParaMesa();
    this.atualizar({ estado, balao: estado, status });
    if (negocioId !== undefined && status) this.log(status, { negocioId });
    await this.esc.relogio.esperar(ms * aleatorio(0.8, 1.2));
  }

  /**
   * Trabalha enquanto uma promessa (ex.: chamada à IA) não termina.
   * O personagem fica digitando no mínimo `ms` de tempo simulado e
   * continua digitando até a IA responder.
   */
  async trabalharCom(estado, ms, status, promessa, negocioId) {
    const [, resultado] = await Promise.all([this.trabalhar(estado, ms, status, negocioId), promessa]);
    return resultado;
  }

  /** Entrega tarefas na mesa de outro agente: anda, mostra o envelope e volta */
  async entregar(tarefa) {
    const { para, tarefas, descricao } = tarefa.dados;
    const destino = MESAS[para];
    const nomePara = nomeDoAgente(para);
    await this.andarAte(destino.visita, `Levando ${descricao} para ${nomePara}`);
    this.atualizar({
      dir: direcao(destino.visita, destino.assento), estado: 'parado', balao: 'envelope',
      status: `Entregando ${descricao} para ${nomePara}`,
    });
    await this.esc.relogio.esperar(1400);

    // Passa as tarefas para a fila do outro agente (tudo ou nada)
    db.transacao(() => {
      for (const t of tarefas) db.inserirTarefa({ agente: para, ...t });
      db.concluirTarefa(tarefa.id);
    });
    this.log(`Entregou ${descricao} para ${nomePara}.`, { tipo: 'entrega', negocioId: tarefa.negocio_id });
    this.esc.acordar(para);
    this.esc.emitirAgente(para);

    this.atualizar({ balao: null });
    await this.irParaMesa();
  }

  /** Quando não há nada na fila: espera; de vez em quando vai pegar café */
  async ocioso() {
    this.atualizar({ estado: 'esperando', ...this.balaoOcioso() });
    const chegouTarefa = await Promise.race([
      this.esperarNovidade(),
      this.esc.relogio.esperar(aleatorio(18000, 40000)).then(() => false),
    ]);
    this._acordar = null;
    if (!chegouTarefa && Math.random() < 0.45) await this.pegarCafe();
  }

  /** Balão e status quando está ocioso (o Gerente sobrescreve) */
  balaoOcioso() {
    return { balao: null, status: 'Aguardando tarefas' };
  }

  async pegarCafe() {
    // Escolhe um lugar livre na frente da cafeteira
    const ocupados = new Set(this.esc.listaAgentes()
      .filter((a) => a !== this && a.alvoCafe).map((a) => `${a.alvoCafe.x},${a.alvoCafe.y}`));
    const livre = CAFE.find((c) => !ocupados.has(`${c.x},${c.y}`));
    if (!livre) return;
    this.alvoCafe = livre;
    await this.andarAte(livre, 'Indo pegar café');
    this.atualizar({ dir: 'cima', estado: 'parado', balao: 'cafe', status: 'Pegando café ☕' });
    await this.esc.relogio.esperar(aleatorio(3500, 6000));
    this.alvoCafe = null;
    this.atualizar({ balao: null });
    await this.irParaMesa();
  }

  esperarNovidade() {
    if (this._temNovidade) {
      this._temNovidade = false;
      return Promise.resolve(true);
    }
    return new Promise((resolver) => { this._acordar = resolver; });
  }

  /** Chamado quando chega tarefa nova para este agente */
  acordar() {
    if (this._acordar) {
      const r = this._acordar;
      this._acordar = null;
      r(true);
    } else {
      this._temNovidade = true;
    }
  }
}
