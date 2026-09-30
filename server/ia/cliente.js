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

  if (resposta.stop_reason === 'refusal') throw new ErroIA('O modelo recusou o pedido');
  if (resposta.stop_reason === 'max_tokens') throw new ErroIA('Resposta cortada (limite de tokens)');
  const texto = resposta.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new ErroIA('A IA respondeu em um formato inesperado');
  }
  return {
    dados,
    modelo: resposta.model,
    uso: { entrada: resposta.usage.input_tokens, saida: resposta.usage.output_tokens },
  };
}
