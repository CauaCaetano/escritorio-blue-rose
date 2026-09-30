// =============================================================
// Gerente: igual aos outros agentes, mas quando está ocioso mostra
// um "!" amarelo se houver negócios aguardando a sua aprovação.
// =============================================================
import { Agente } from './Agente.js';
import * as db from '../db.js';

export class Gerente extends Agente {
  balaoOcioso() {
    const n = db.contadores().aguardando;
    if (n > 0) {
      return { balao: 'aprovacao', status: `Aguardando sua aprovação (${n} ${n === 1 ? 'negócio' : 'negócios'})` };
    }
    return { balao: null, status: 'Aguardando pedidos' };
  }

  /** Recalcula o "!" quando a fila de aprovação muda e ele está ocioso */
  atualizarAlerta() {
    if (this.estado === 'esperando') this.atualizar(this.balaoOcioso());
  }
}
