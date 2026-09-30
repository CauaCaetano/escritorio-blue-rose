// =============================================================
// Fluxo de trabalho de cada negócio
// -------------------------------------------------------------
// Gerente → Prospector → Redator → Dev → Revisor (→ Dev, se achar
// erro) → Atendente → Gerente → aguardando SUA aprovação.
// "Pedir ajuste" volta para o Redator com o seu comentário.
//
// Cada tratador recebe (agente, tarefa), faz o trabalho e devolve
// { entregar: { para, tarefas, descricao } } quando precisa passar
// o bastão para outro agente.
//
// Com a chave da API configurada, o conteúdo é escrito pela IA real;
// sem chave ou se a API falhar, o erro vai para o log e o agente usa
// o modo simulado, sem travar o escritório.
//
// REGRA FIXA: nenhum agente envia nada para pessoas reais.
// Tudo para em "aguardando aprovação"; o envio é sempre seu.
// =============================================================
import fs from 'node:fs';
import path from 'node:path';
import * as db from '../db.js';
import * as conteudo from '../servicos/conteudo.js';
import { config } from '../config.js';

const entregar = (para, tarefas, descricao) => ({ entregar: { para, tarefas, descricao } });

/** Nome de arquivo seguro: "12-padaria-pao-dourado-v2.html" */
function nomeArquivo(negocio, versao) {
  const slug = negocio.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${negocio.id}-${slug || 'negocio'}-v${versao}.html`;
}

export function criarFluxo(esc) {
  /** Atualiza o negócio e avisa o painel */
  const mover = (negocioId, campos) => {
    db.atualizarNegocio(negocioId, campos);
    esc.emitirNegocio(negocioId);
  };

  /** Mostra no log se usou a IA real ou se caiu no modo simulado */
  const registrarOrigem = (ag, r, negocioId) => {
    if (r.erroIA) ag.log(`IA indisponível: ${r.erroIA}.`, { negocioId, tipo: 'erro' });
    else if (r.origem === 'api') {
      const tokens = (r.uso?.entrada || 0) + (r.uso?.saida || 0);
      ag.log(`Trabalho feito com IA real (${r.modelo}, ${tokens.toLocaleString('pt-BR')} tokens).`, { negocioId, tipo: 'ia' });
    }
  };

  return {
    // -----------------------------------------------------------
    gerente: {
      /** Pedido de demonstração (negócios fictícios) */
      async pedido(ag, t) {
        const pedido = db.obterPedido(t.dados.pedidoId);
        await ag.trabalhar('lendo', 2500, `Lendo seu pedido #${pedido.id}: "${pedido.texto}"`, null);
        await ag.trabalhar('digitando', 2500, 'Dividindo as tarefas do pedido');
        db.marcarPedido(pedido.id, 'em_andamento');
        return entregar('prospector', [{ tipo: 'prospectar', dados: { pedidoId: pedido.id } }], `o pedido #${pedido.id}`);
      },

      /** Negócio real cadastrado por você no formulário */
      async negocio(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        await ag.trabalhar('lendo', 2000, `Lendo o cadastro de ${n.nome}`, n.id);
        return entregar('prospector', [{ tipo: 'analisar', negocioId: n.id }], `o cadastro de ${n.nome}`);
      },

      async consolidar(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const r = await ag.trabalharCom('lendo', 3000, `Conferindo o pacote de ${n.nome}`,
          conteudo.resumoGerente(n, db.ultimaProposta(n.id), db.revisoesDoNegocio(n.id)), n.id);
        registrarOrigem(ag, r, n.id);
        await ag.trabalhar('digitando', 1500, 'Preparando para sua aprovação');
        const pontos = r.pontos_de_atencao?.length ? ` Atenção: ${r.pontos_de_atencao.join(' ')}` : '';
        mover(n.id, { status: 'aguardando_aprovacao', etapa: 'aprovacao', motivo: `${r.resumo}${pontos}` });
        esc.log({ agente: 'gerente', negocioId: n.id, tipo: 'decisao', texto: `${n.nome} está aguardando sua aprovação.` });
        return null;
      },

      async ajuste(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        await ag.trabalhar('lendo', 2000, `Lendo seu comentário sobre ${n.nome}`, n.id);
        return entregar('redator', [{ tipo: 'redigir', negocioId: n.id, dados: { comentario: t.dados.comentario } }],
          `o ajuste de ${n.nome}`);
      },
    },

    // -----------------------------------------------------------
    prospector: {
      /** Demonstração: inventa negócios fictícios a partir do pedido */
      async prospectar(ag, t) {
        const pedido = db.obterPedido(t.dados.pedidoId);
        await ag.trabalhar('lendo', 2000, `Estudando o pedido #${pedido.id}`);
        await ag.trabalhar('digitando', 5000, 'Montando negócios fictícios de demonstração');

        // Se o servidor reiniciou no meio, reaproveita o que já foi criado
        let negocios = db.negociosDoPedido(pedido.id);
        if (!negocios.length) {
          const r = await conteudo.prospectar(pedido);
          negocios = r.negocios.map((n) => db.criarNegocio({ ...n, pedido_id: pedido.id, etapa: 'redacao' }));
        }
        for (const n of negocios) {
          ag.log(`Criou o exemplo fictício ${n.nome} (${n.tipo}, ${n.cidade}).`, { negocioId: n.id });
          esc.emitirNegocio(n.id);
        }
        const qtd = negocios.length;
        return entregar('redator',
          negocios.map((n) => ({ tipo: 'redigir', negocioId: n.id })),
          qtd === 1 ? `o negócio ${negocios[0].nome}` : `${qtd} negócios`);
      },

      /** Negócio real: analisa só com os dados que você cadastrou (sem raspagem) */
      async analisar(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        mover(n.id, { etapa: 'prospeccao' });
        const r = await ag.trabalharCom('digitando', 4000, `Analisando a presença digital de ${n.nome}`,
          conteudo.analisarNegocio(n), n.id);
        registrarOrigem(ag, r, n.id);
        const analise = `${r.analise} Recomendação: ${r.servico_recomendado} (prioridade ${r.prioridade}).`
          + (r.oportunidades?.length ? ` Oportunidades: ${r.oportunidades.join('; ')}.` : '');
        mover(n.id, { analise, etapa: 'redacao' });
        ag.log(`Análise de ${n.nome} pronta: ${r.servico_recomendado}, prioridade ${r.prioridade}.`, { negocioId: n.id });
        return entregar('redator', [{ tipo: 'redigir', negocioId: n.id }], `a análise de ${n.nome}`);
      },
    },

    // -----------------------------------------------------------
    redator: {
      async redigir(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const comentario = t.dados.comentario;
        mover(n.id, { etapa: 'redacao' });
        await ag.trabalhar('lendo', 2000, comentario ? `Lendo seu ajuste para ${n.nome}` : `Estudando ${n.nome}`, n.id);
        const r = await ag.trabalharCom('digitando', 6000, `Escrevendo proposta e mensagem para ${n.nome}`,
          conteudo.redigirProposta(n, comentario));
        registrarOrigem(ag, r, n.id);
        const p = db.salvarProposta(n.id, r);
        ag.log(`Proposta v${p.versao} de ${n.nome} pronta.`, { negocioId: n.id });
        mover(n.id, { etapa: 'previa' });
        return entregar('dev', [{ tipo: 'previa', negocioId: n.id, dados: { comentario } }], `a proposta de ${n.nome}`);
      },
    },

    // -----------------------------------------------------------
    dev: {
      async previa(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const { correcao, comentario, tentativa = 0 } = t.dados;
        const pedidoCorrecao = [correcao, comentario && `Ajuste do Cauã: ${comentario}`].filter(Boolean).join(' ');
        mover(n.id, { etapa: 'previa' });
        await ag.trabalhar('lendo', 1500, correcao ? `Lendo a correção pedida: "${correcao}"` : `Lendo a proposta de ${n.nome}`, n.id);
        const r = await ag.trabalharCom('digitando', 7000,
          correcao ? `Corrigindo a prévia de ${n.nome}` : `Montando a prévia da página de ${n.nome}`,
          conteudo.gerarPrevia(n, {
            correcao: pedidoCorrecao || undefined,
            proposta: db.ultimaProposta(n.id),
            previaAnterior: correcao ? db.ultimaPrevia(n.id) : null,
          }));
        registrarOrigem(ag, r, n.id);

        // Salva no banco e também como arquivo na pasta de prévias
        const pv = db.salvarPrevia(n.id, { html: r.html, origem: r.origem });
        try {
          fs.mkdirSync(config.pastaPrevias, { recursive: true });
          const arquivo = nomeArquivo(n, pv.versao);
          fs.writeFileSync(path.join(config.pastaPrevias, arquivo), r.html, 'utf8');
          db.definirArquivoPrevia(pv.id, arquivo);
        } catch (e) {
          ag.log(`Não consegui salvar o arquivo da prévia: ${e.message}`, { negocioId: n.id, tipo: 'erro' });
        }
        ag.log(`Prévia v${pv.versao} de ${n.nome} pronta. ${r.resumo || ''}`.trim(), { negocioId: n.id });
        mover(n.id, { etapa: 'revisao' });
        return entregar('revisor', [{ tipo: 'revisar', negocioId: n.id, dados: { tentativa } }], `a prévia de ${n.nome}`);
      },
    },

    // -----------------------------------------------------------
    revisor: {
      async revisar(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const tentativa = t.dados.tentativa || 0;
        const previa = db.ultimaPrevia(n.id);
        // Devolve para o Dev no máximo 2 vezes por rodada, para não virar loop infinito
        const podeReprovar = tentativa < 2;
        const r = await ag.trabalharCom('lendo', 5000, `Revisando texto, links e versão para celular de ${n.nome}`,
          conteudo.revisarPrevia(n, previa, db.ultimaProposta(n.id), { podeReprovar }), n.id);
        registrarOrigem(ag, r, n.id);
        let notas = r.notas;
        if (r.aprovada && !podeReprovar && r.problemas?.length) notas = `Aprovada com ressalvas após 2 correções: ${r.problemas.join(' ')}`;
        db.salvarRevisao(n.id, { previaId: previa?.id, aprovada: r.aprovada, notas, origem: r.origem });

        if (!r.aprovada) {
          ag.log(`Achou problema na prévia de ${n.nome}: ${notas} Devolvendo para o Dev.`, { negocioId: n.id, tipo: 'erro' });
          return entregar('dev', [{ tipo: 'previa', negocioId: n.id, dados: { correcao: notas, tentativa: tentativa + 1 } }],
            `a correção de ${n.nome}`);
        }
        ag.log(`Prévia de ${n.nome} aprovada na revisão.`, { negocioId: n.id });
        mover(n.id, { etapa: 'atendimento' });
        return entregar('atendente', [{ tipo: 'respostas', negocioId: n.id }], `o pacote de ${n.nome}`);
      },
    },

    // -----------------------------------------------------------
    atendente: {
      async respostas(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        await ag.trabalhar('lendo', 1500, `Lendo a proposta de ${n.nome}`, n.id);
        const r = await ag.trabalharCom('digitando', 5000, `Preparando respostas sobre preço, prazo e funcionamento para ${n.nome}`,
          conteudo.prepararRespostas(n));
        registrarOrigem(ag, r, n.id);
        db.salvarRespostas(n.id, r.lista, r.origem);
        mover(n.id, { etapa: 'consolidacao' });
        return entregar('gerente', [{ tipo: 'consolidar', negocioId: n.id }], `o pacote completo de ${n.nome}`);
      },
    },
  };
}
