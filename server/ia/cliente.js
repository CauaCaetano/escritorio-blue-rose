// =============================================================
// Cliente da API da Anthropic (Claude)
// -------------------------------------------------------------
// Todos os agentes "reais" passam por aqui. As respostas vêm em
// JSON validado por um schema (structured outputs), então o código
// sempre sabe o formato do que recebeu.
//
// Se não houver chave, ou se a API falhar, a função lança um erro
// e quem chamou volta para o modo simulado (ver servicos/conteudo.js).
// =============================================================
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

let cliente = null;

export const iaAtiva = () => Boolean(config.anthropicApiKey);

function obterCliente() {
  if (!iaAtiva()) throw new ErroIA('Sem chave da API (ANTHROPIC_API_KEY vazia no .env)');
  if (!cliente) cliente = new Anthropic({ apiKey: config.anthropicApiKey, timeout: 5 * 60 * 1000, maxRetries: 2 });
  return cliente;
}

export class ErroIA extends Error {}

/** Mensagem curta e amigável para o log, a partir de um erro do SDK */
function descreverErro(e) {
  if (e instanceof ErroIA) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'Chave da API inválida (verifique o .env)';
  if (e instanceof Anthropic.PermissionDeniedError) return 'A chave não tem permissão para este modelo';
  if (e instanceof Anthropic.RateLimitError) return 'Limite de uso da API atingido; tente mais tarde';
  if (e instanceof Anthropic.BadRequestError) {
    if (/credit|balance/i.test(e.message)) return 'Sem créditos na conta da Anthropic';
    return `Pedido recusado pela API: ${e.message}`;
  }
  if (e instanceof Anthropic.APIConnectionError) return 'Sem conexão com a API (internet?)';
  if (e instanceof Anthropic.APIError) return `Erro da API (${e.status}): ${e.message}`;
  return e.message || String(e);
}

/**
 * Pede ao Claude uma resposta em JSON que obedece `schema`.
 * Retorna { dados, uso: { entrada, saida }, modelo }.
 */
export async function pedirJSON({ sistema, mensagem, schema, maxTokens = 16000 }) {
  const c = obterCliente();
  const haiku = config.modeloIA.includes('haiku');
  const params = {
    model: config.modeloIA,
    max_tokens: maxTokens,
    system: sistema,
    messages: [{ role: 'user', content: mensagem }],
    output_config: {
      format: { type: 'json_schema', schema },
      // O Haiku 4.5 não aceita "effort"
      ...(haiku ? {} : { effort: config.esforcoIA }),
    },
  };

  let resposta;
  try {
    try {
      // Com "fallbacks": se o modelo recusar por segurança, a própria API
      // tenta de novo com o modelo reserva recomendado.
      resposta = await c.beta.messages
        .stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        .finalMessage();
    } catch (e) {
      // Modelos/contas sem suporte a fallbacks: repete sem ele
      if (!(e instanceof Anthropic.BadRequestError) || !/fallback/i.test(e.message)) throw e;
      resposta = await c.messages.stream(params).finalMessage();
    }
  } catch (e) {
    throw new ErroIA(descreverErro(e));
  }

  return interpretar(resposta);
}

/** Lê o JSON da resposta (aceita também JSON dentro de ```bloco```) */
function interpretar(resposta) {
  if (resposta.stop_reason === 'refusal') throw new ErroIA('O modelo recusou o pedido');
  if (resposta.stop_reason === 'max_tokens') throw new ErroIA('Resposta cortada (limite de tokens)');
  // Com busca na web a resposta pode ter vários blocos de texto; o JSON é o último
  const textos = resposta.content.filter((b) => b.type === 'text').map((b) => b.text);
  const candidatos = [textos.join(''), textos[textos.length - 1] || ''];
  for (const c of candidatos) {
    const limpo = c.replace(/^[\s\S]*?```(?:json)?\s*([\s\S]*?)```[\s\S]*$/, '$1').trim();
    for (const tentativa of [c.trim(), limpo, limpo.slice(limpo.indexOf('{'), limpo.lastIndexOf('}') + 1)]) {
      try {
        return {
          dados: JSON.parse(tentativa),
          modelo: resposta.model,
          uso: { entrada: resposta.usage.input_tokens, saida: resposta.usage.output_tokens },
        };
      } catch { /* tenta o próximo formato */ }
    }
  }
  throw new ErroIA('A IA respondeu em um formato inesperado');
}

/**
 * Como pedirJSON, mas o modelo pode pesquisar na web (busca da própria Anthropic).
 * Usado pela prospecção automática para achar negócios REAIS e públicos.
 * Trata "pause_turn" (busca longa que precisa ser retomada).
 */
export async function pedirJSONComBusca({ sistema, mensagem, schema, maxBuscas = 6, maxTokens = 16000 }) {
  const c = obterCliente();
  const base = {
    model: config.modeloIA,
    max_tokens: maxTokens,
    system: sistema,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxBuscas, user_location: { type: 'approximate', country: 'BR' } }],
    output_config: { format: { type: 'json_schema', schema }, ...(config.modeloIA.includes('haiku') ? {} : { effort: config.esforcoIA }) },
  };
  const mensagens = [{ role: 'user', content: mensagem }];
  let resposta;
  try {
    for (let rodada = 0; rodada < 5; rodada++) {
      resposta = await c.messages.stream({ ...base, messages: mensagens }).finalMessage();
      if (resposta.stop_reason !== 'pause_turn') break;
      // Busca longa: devolve o que já foi feito e pede para continuar
      mensagens.push({ role: 'assistant', content: resposta.content });
    }
  } catch (e) {
    throw new ErroIA(descreverErro(e));
  }
  if (resposta.stop_reason === 'pause_turn') throw new ErroIA('A busca demorou demais e foi interrompida');
  return interpretar(resposta);
}
