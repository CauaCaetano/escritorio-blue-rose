// =============================================================
// Serviços de conteúdo usados pelos agentes.
// -------------------------------------------------------------
// Cada função tenta a IA real (API da Anthropic) primeiro. Se não
// houver chave ou a API falhar, usa o gerador SIMULADO e devolve o
// motivo em "erroIA" para o agente mostrar no log.
// Toda função retorna também "origem" ('api' ou 'simulado').
// =============================================================
import * as sim from '../simulado/gerador.js';
import { pedirJSON, iaAtiva } from '../ia/cliente.js';
import * as P from '../ia/prompts.js';

/** Tenta a IA; em caso de erro devolve o resultado simulado */
async function comPlanoB(chamarIA, simulado) {
  if (!iaAtiva()) return { ...simulado(), origem: 'simulado', erroIA: 'Sem chave da API — usando modo simulado' };
  try {
    const r = await chamarIA();
    return { ...r.resultado, origem: 'api', uso: r.uso, modelo: r.modelo };
  } catch (e) {
    return { ...simulado(), origem: 'simulado', erroIA: `${e.message} — usando modo simulado` };
  }
}

const chamar = async (agente, mensagem, maxTokens, transformar = (d) => d) => {
  const r = await pedirJSON({ sistema: agente.sistema, schema: agente.schema, mensagem, maxTokens });
  return { resultado: transformar(r.dados), uso: r.uso, modelo: r.modelo };
};

// ---------------------------------------------------------------
// Demonstração: inventa negócios FICTÍCIOS (sempre simulado; os
// negócios reais você cadastra pelo formulário)
export async function prospectar(pedido) {
  return { negocios: sim.inventarNegocios(pedido.texto, pedido.quantidade), origem: 'simulado' };
}

export function analisarNegocio(negocio) {
  return comPlanoB(
    () => chamar(P.PROSPECTOR, `Analise este negócio local:\n${P.fichaNegocio(negocio)}`, 4000),
    () => sim.analisarNegocio(negocio),
  );
}

export function redigirProposta(negocio, comentario) {
  const mensagem = [
    `Escreva a proposta e a mensagem de primeiro contato para:\n${P.fichaNegocio(negocio)}`,
    comentario ? `\nPEDIDO DE AJUSTE DO CAUÃ (prioridade): ${comentario}` : '',
  ].join('');
  return comPlanoB(
    () => chamar(P.REDATOR, mensagem, 6000),
    () => sim.redigirProposta(negocio, comentario),
  );
}

// ---------------------------------------------------------------
// Marketing e tecnologia
// ---------------------------------------------------------------
const pedirSobre = (agente, pedido, negocio, simulado, maxTokens = 4000) => comPlanoB(
  () => chamar(agente, `${pedido}\n${P.fichaNegocio(negocio)}`, maxTokens),
  () => simulado(negocio),
);

export const identidadeVisual = (n) => pedirSobre(P.DESIGNER, 'Crie a identidade visual da prévia para:', n, sim.identidadeVisual);
export const conteudoSocial = (n) => pedirSobre(P.CONTEUDO, 'Crie a bio e as ideias de posts para:', n, sim.conteudoSocial);
export const anuncioLocal = (n) => pedirSobre(P.ANUNCIOS, 'Crie o anúncio local para:', n, sim.anuncioLocal);
export const planoSeo = (n) => pedirSobre(P.SEO, 'Defina o SEO da página de:', n, sim.planoSeo);
export const roteiroAutomacao = (n) => pedirSobre(P.AUTOMACAO, 'Monte o roteiro do robô de WhatsApp de:', n, sim.roteiroAutomacao);

export function gerarPrevia(negocio, { correcao, proposta, previaAnterior, identidade, seo } = {}) {
  const mensagem = [
    `Crie a prévia da página para:\n${P.fichaNegocio(negocio)}`,
    identidade ? `\n\nIDENTIDADE VISUAL (da designer Nina):\n${JSON.stringify(identidade)}` : '',
    seo ? `\n\nSEO (da Rita): título "${seo.titulo}" · descrição "${seo.descricao}"` : '',
    proposta ? `\n\nProposta aprovada pelo time (use como base do conteúdo):\n${proposta.proposta}` : '',
    correcao ? `\n\nCORREÇÃO PEDIDA: ${correcao}` : '',
    correcao && previaAnterior ? `\n\nHTML anterior (corrija a partir dele):\n${previaAnterior.html}` : '',
  ].join('');
  return comPlanoB(
    () => chamar(P.DEV, mensagem, 24000),
    () => ({ html: sim.gerarPreviaHtml(negocio, { correcao, identidade, seo }), resumo: correcao ? 'Correção aplicada.' : 'Prévia criada.' }),
  );
}

/** Verificações automáticas que não dependem da IA */
export function checagensAutomaticas(html = '') {
  const problemas = [];
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) problemas.push('Falta a meta tag viewport (a página pode quebrar no celular).');
  if (!/whatsapp/i.test(html)) problemas.push('Não encontrei o botão de WhatsApp.');
  if (/<script/i.test(html)) problemas.push('A prévia não deve ter JavaScript.');
  if (html.length < 800) problemas.push('A página parece incompleta.');
  return problemas;
}

export function revisarPrevia(negocio, previa, proposta, { podeReprovar }) {
  const auto = checagensAutomaticas(previa?.html);
  const mensagem = [
    `Revise o pacote de:\n${P.fichaNegocio(negocio)}`,
    proposta ? `\n\nPROPOSTA:\n${proposta.proposta}\n\nMENSAGEM DE WHATSAPP:\n${proposta.mensagem}` : '',
    auto.length ? `\n\nAs verificações automáticas encontraram: ${auto.join(' ')}` : '\n\nAs verificações automáticas não encontraram problemas.',
    `\n\nHTML DA PRÉVIA:\n${previa?.html || '(vazio)'}`,
  ].join('');
  return comPlanoB(
    async () => {
      const r = await chamar(P.REVISOR, mensagem, 4000);
      const problemas = [...new Set([...auto, ...r.resultado.problemas])];
      const aprovada = r.resultado.aprovada && auto.length === 0;
      return { ...r, resultado: { aprovada: aprovada || !podeReprovar, notas: r.resultado.notas, problemas } };
    },
    () => {
      if (auto.length && podeReprovar) return { aprovada: false, notas: auto.join(' '), problemas: auto };
      return { ...sim.revisar({ podeReprovar }), problemas: auto };
    },
  );
}

export function prepararRespostas(negocio) {
  return comPlanoB(
    () => chamar(P.ATENDENTE, `Prepare as respostas prontas para as dúvidas deste cliente:\n${P.fichaNegocio(negocio)}`, 4000,
      (d) => ({ lista: d.respostas })),
    () => ({ lista: sim.respostasFrequentes(negocio) }),
  );
}

export function resumoGerente(negocio, proposta, revisoes) {
  const ultima = revisoes[revisoes.length - 1];
  const mensagem = [
    `Monte o resumo para o Cauã aprovar:\n${P.fichaNegocio(negocio)}`,
    proposta ? `\n\nPROPOSTA:\n${proposta.proposta}\n\nMENSAGEM:\n${proposta.mensagem}` : '',
    ultima ? `\n\nÚLTIMA REVISÃO: ${ultima.notas}` : '',
  ].join('');
  return comPlanoB(
    () => chamar(P.GERENTE, mensagem, 3000),
    () => sim.resumoGerente(negocio),
  );
}
