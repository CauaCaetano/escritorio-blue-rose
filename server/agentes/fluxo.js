// =============================================================
// Fluxo de trabalho de cada negócio (14 agentes, 4 departamentos)
// -------------------------------------------------------------
//  Diretoria  : Henrique (CEO) recebe e distribui
//  Vendas     : Vitória (Head) → Rafael (SDR) analisa
//  Marketing  : Sofia (Head) → Nina (identidade) → Júlia (conteúdo) → Caio (anúncio)
//  Vendas     : Lívia (Closer) escreve proposta e mensagem
//  Tecnologia : André (CTO) → Rita (SEO) → Diego (prévia) → Lucas (automação)
//               → Marta (QA; pode devolver para o Diego)
//  Vendas     : Bianca (Customer Success) prepara as respostas
//  Diretoria  : Henrique confere tudo → aguardando SUA aprovação
//
// "Pedir ajuste" volta para a Lívia com o seu comentário e segue
// pela Tecnologia de novo.
//
// Cada tratador recebe (agente, tarefa), faz o trabalho e devolve
// { entregar: { para, tarefas, descricao } } para passar o bastão.
//
// REGRA FIXA: nenhum agente envia nada para pessoas reais.
// =============================================================
import fs from 'node:fs';
import path from 'node:path';
import * as db from '../db.js';
import * as conteudo from '../servicos/conteudo.js';
import { config } from '../config.js';

const entregar = (para, tarefas, descricao) => ({ entregar: { para, tarefas, descricao } });
const uma = (para, tipo, negocioId, descricao, dados = {}) => entregar(para, [{ tipo, negocioId, dados }], descricao);

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

  /** Especialista que produz um artefato com a IA e passa adiante */
  const especialista = ({ tipo, status, gerar, resumo, proximo }) => async (ag, t) => {
    const n = db.obterNegocio(t.negocio_id);
    mover(n.id, { etapa: tipo });
    await ag.trabalhar('lendo', 1500, `Estudando ${n.nome}`, n.id);
    const r = await ag.trabalharCom('digitando', 5000, status(n), gerar(n));
    registrarOrigem(ag, r, n.id);
    const { origem, erroIA, uso, modelo, ...dados } = r;
    db.salvarArtefato(n.id, tipo, dados, { agente: ag.id, origem });
    ag.log(resumo(n, dados), { negocioId: n.id });
    return proximo(n, t);
  };

  /** Chefe: lê, dá a direção e repassa para alguém do time */
  const chefe = (texto, para, tipo, descricao) => async (ag, t) => {
    const n = t.negocio_id ? db.obterNegocio(t.negocio_id) : null;
    await ag.trabalhar('lendo', 2000, texto(n, t), n?.id ?? null);
    await ag.trabalhar('digitando', 1200, 'Passando as orientações para o time');
    return uma(para, tipo, n?.id ?? null, descricao(n, t), t.dados);
  };

  return {
    // ===================== Diretoria =====================
    gerente: {
      /** Pedido de demonstração (negócios fictícios) */
      async pedido(ag, t) {
        const pedido = db.obterPedido(t.dados.pedidoId);
        await ag.trabalhar('lendo', 2500, `Lendo seu pedido #${pedido.id}: "${pedido.texto}"`, null);
        await ag.trabalhar('digitando', 1500, 'Distribuindo o pedido para Vendas');
        db.marcarPedido(pedido.id, 'em_andamento');
        return uma('headVendas', 'pedido', null, `o pedido #${pedido.id}`, { pedidoId: pedido.id });
      },

      /** Negócio real cadastrado por você no formulário */
      async negocio(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        await ag.trabalhar('lendo', 2000, `Lendo o cadastro de ${n.nome}`, n.id);
        return uma('headVendas', 'negocio', n.id, `o cadastro de ${n.nome}`);
      },

      async consolidar(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const r = await ag.trabalharCom('lendo', 3000, `Conferindo o pacote completo de ${n.nome}`,
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
        return uma('redator', 'redigir', n.id, `o ajuste de ${n.nome}`, { comentario: t.dados.comentario });
      },
    },

    // ======================= Vendas ======================
    headVendas: {
      pedido: chefe((n, t) => `Planejando a prospecção do pedido #${t.dados.pedidoId}`, 'prospector', 'prospectar',
        (n, t) => `o pedido #${t.dados.pedidoId}`),
      negocio: chefe((n) => `Definindo a abordagem comercial para ${n.nome}`, 'prospector', 'analisar',
        (n) => `o cadastro de ${n.nome}`),
    },

    prospector: {
      /** Demonstração: inventa negócios fictícios a partir do pedido */
      async prospectar(ag, t) {
        const pedido = db.obterPedido(t.dados.pedidoId);
        await ag.trabalhar('lendo', 2000, `Estudando o pedido #${pedido.id}`);
        await ag.trabalhar('digitando', 4000, 'Montando negócios fictícios de demonstração');
        // Se o servidor reiniciou no meio, reaproveita o que já foi criado
        let negocios = db.negociosDoPedido(pedido.id);
        if (!negocios.length) {
          const r = await conteudo.prospectar(pedido);
          negocios = r.negocios.map((n) => db.criarNegocio({ ...n, pedido_id: pedido.id, etapa: 'marketing' }));
        }
        for (const n of negocios) {
          ag.log(`Criou o exemplo fictício ${n.nome} (${n.tipo}, ${n.cidade}).`, { negocioId: n.id });
          esc.emitirNegocio(n.id);
        }
        return entregar('headMarketing', negocios.map((n) => ({ tipo: 'briefing', negocioId: n.id })),
          negocios.length === 1 ? `o negócio ${negocios[0].nome}` : `${negocios.length} negócios`);
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
        mover(n.id, { analise, etapa: 'marketing' });
        ag.log(`Análise de ${n.nome} pronta: ${r.servico_recomendado}, prioridade ${r.prioridade}.`, { negocioId: n.id });
        return uma('headMarketing', 'briefing', n.id, `a análise de ${n.nome}`);
      },
    },

    redator: {
      async redigir(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const comentario = t.dados.comentario;
        mover(n.id, { etapa: 'redacao' });
        await ag.trabalhar('lendo', 2000, comentario ? `Lendo seu ajuste para ${n.nome}` : `Estudando ${n.nome} e o material do marketing`, n.id);
        const r = await ag.trabalharCom('digitando', 6000, `Escrevendo proposta e mensagem para ${n.nome}`,
          conteudo.redigirProposta(n, comentario));
        registrarOrigem(ag, r, n.id);
        const p = db.salvarProposta(n.id, r);
        ag.log(`Proposta v${p.versao} de ${n.nome} pronta.`, { negocioId: n.id });
        mover(n.id, { etapa: 'tecnologia' });
        return uma('cto', 'planejar', n.id, `a proposta de ${n.nome}`, { comentario });
      },
    },

    atendente: {
      async respostas(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        await ag.trabalhar('lendo', 1500, `Lendo a proposta de ${n.nome}`, n.id);
        const r = await ag.trabalharCom('digitando', 5000, `Preparando respostas sobre preço, prazo e funcionamento para ${n.nome}`,
          conteudo.prepararRespostas(n));
        registrarOrigem(ag, r, n.id);
        db.salvarRespostas(n.id, r.lista, r.origem);
        mover(n.id, { etapa: 'consolidacao' });
        return uma('gerente', 'consolidar', n.id, `o pacote completo de ${n.nome}`);
      },
    },

    // ===================== Marketing =====================
    headMarketing: {
      briefing: chefe((n) => `Definindo a mensagem da marca de ${n.nome}`, 'designer', 'identidade',
        (n) => `o briefing de ${n.nome}`),
    },

    designer: {
      identidade: especialista({
        tipo: 'identidade',
        status: (n) => `Criando a identidade visual de ${n.nome}`,
        gerar: (n) => conteudo.identidadeVisual(n),
        resumo: (n, d) => `Identidade visual de ${n.nome}: ${d.paleta?.primaria} + ${d.fonte_titulos}.`,
        proximo: (n) => uma('conteudo', 'conteudo', n.id, `a identidade visual de ${n.nome}`),
      }),
    },

    conteudo: {
      conteudo: especialista({
        tipo: 'conteudo',
        status: (n) => `Escrevendo bio e posts de Instagram para ${n.nome}`,
        gerar: (n) => conteudo.conteudoSocial(n),
        resumo: (n, d) => `Bio e ${d.posts?.length || 0} ideias de posts de ${n.nome} prontas.`,
        proximo: (n) => uma('anuncios', 'anuncio', n.id, `o conteúdo de ${n.nome}`),
      }),
    },

    anuncios: {
      anuncio: especialista({
        tipo: 'anuncio',
        status: (n) => `Montando o anúncio local de ${n.nome}`,
        gerar: (n) => conteudo.anuncioLocal(n),
        resumo: (n, d) => `Anúncio de ${n.nome} pronto (${d.plataforma}, R$ ${d.orcamento_diario}/dia).`,
        proximo: (n) => uma('redator', 'redigir', n.id, `o pacote de marketing de ${n.nome}`),
      }),
    },

    // ===================== Tecnologia ====================
    cto: {
      planejar: chefe((n) => `Planejando a página e a automação de ${n.nome}`, 'seo', 'seo',
        (n) => `o plano técnico de ${n.nome}`),
    },

    seo: {
      seo: especialista({
        tipo: 'seo',
        status: (n) => `Definindo título, descrição e palavras-chave de ${n.nome}`,
        gerar: (n) => conteudo.planoSeo(n),
        resumo: (n, d) => `SEO de ${n.nome}: "${d.titulo}".`,
        proximo: (n, t) => uma('dev', 'previa', n.id, `o SEO de ${n.nome}`, { comentario: t.dados.comentario }),
      }),
    },

    dev: {
      async previa(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const { correcao, comentario, tentativa = 0 } = t.dados;
        const pedidoCorrecao = [correcao, comentario && `Ajuste do Cauã: ${comentario}`].filter(Boolean).join(' ');
        mover(n.id, { etapa: 'previa' });
        await ag.trabalhar('lendo', 1500, correcao ? `Lendo a correção pedida: "${correcao}"` : `Lendo o material de ${n.nome}`, n.id);
        const r = await ag.trabalharCom('digitando', 7000,
          correcao ? `Corrigindo a prévia de ${n.nome}` : `Montando a prévia da página de ${n.nome}`,
          conteudo.gerarPrevia(n, {
            correcao: pedidoCorrecao || undefined,
            proposta: db.ultimaProposta(n.id),
            previaAnterior: correcao ? db.ultimaPrevia(n.id) : null,
            identidade: db.ultimoArtefato(n.id, 'identidade')?.conteudo,
            seo: db.ultimoArtefato(n.id, 'seo')?.conteudo,
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
        // Correção pedida pela QA volta direto para ela; o fluxo normal passa pela automação
        if (correcao) return uma('revisor', 'revisar', n.id, `a correção de ${n.nome}`, { tentativa });
        return uma('automacao', 'automacao', n.id, `a prévia de ${n.nome}`, { tentativa });
      },
    },

    automacao: {
      automacao: especialista({
        tipo: 'automacao',
        status: (n) => `Montando o robô de WhatsApp de ${n.nome}`,
        gerar: (n) => conteudo.roteiroAutomacao(n),
        resumo: (n, d) => `Roteiro do robô de ${n.nome} pronto (${d.menu?.length || 0} opções no menu).`,
        proximo: (n, t) => uma('revisor', 'revisar', n.id, `a página e o robô de ${n.nome}`, { tentativa: t.dados.tentativa || 0 }),
      }),
    },

    revisor: {
      async revisar(ag, t) {
        const n = db.obterNegocio(t.negocio_id);
        const tentativa = t.dados.tentativa || 0;
        const previa = db.ultimaPrevia(n.id);
        mover(n.id, { etapa: 'revisao' });
        // Devolve para o Dev no máximo 2 vezes por rodada, para não virar loop infinito
        const podeReprovar = tentativa < 2;
        const r = await ag.trabalharCom('lendo', 5000, `Revisando texto, links e versão para celular de ${n.nome}`,
          conteudo.revisarPrevia(n, previa, db.ultimaProposta(n.id), { podeReprovar }), n.id);
        registrarOrigem(ag, r, n.id);
        let notas = r.notas;
        if (r.aprovada && !podeReprovar && r.problemas?.length) notas = `Aprovada com ressalvas após 2 correções: ${r.problemas.join(' ')}`;
        db.salvarRevisao(n.id, { previaId: previa?.id, aprovada: r.aprovada, notas, origem: r.origem });

        if (!r.aprovada) {
          ag.log(`Achou problema na prévia de ${n.nome}: ${notas} Devolvendo para o Diego.`, { negocioId: n.id, tipo: 'erro' });
          return uma('dev', 'previa', n.id, `a correção de ${n.nome}`, { correcao: notas, tentativa: tentativa + 1 });
        }
        ag.log(`Prévia de ${n.nome} aprovada na revisão.`, { negocioId: n.id });
        mover(n.id, { etapa: 'atendimento' });
        return uma('atendente', 'respostas', n.id, `o pacote de ${n.nome}`);
      },
    },
  };
}
