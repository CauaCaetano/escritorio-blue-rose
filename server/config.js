// =============================================================
// Configurações lidas do arquivo .env
// Nenhuma chave fica escrita no código: tudo vem do ambiente.
// =============================================================
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(__dirname, '..');

function numero(valor, padrao) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

const velocidadeInicial = numero(process.env.VELOCIDADE_INICIAL, 1);

export const config = {
  porta: numero(process.env.PORT, 3000),
  host: process.env.HOST || '127.0.0.1',
  caminhoBanco: path.resolve(RAIZ, process.env.DB_PATH || './data/escritorio.db'),
  velocidadeInicial: [1, 2, 4].includes(velocidadeInicial) ? velocidadeInicial : 1,
  // Se estiver vazio, os agentes usam o modo simulado
  anthropicApiKey: (process.env.ANTHROPIC_API_KEY || '').trim(),
  // Modelo e esforço da IA (esforço: low | medium | high)
  modeloIA: (process.env.MODELO_IA || 'claude-opus-5-5').trim(),
  esforcoIA: ['low', 'medium', 'high', 'xhigh', 'max'].includes(process.env.ESFORCO_IA) ? process.env.ESFORCO_IA : 'medium',
  // Site da BLUE ROSE (vai nas propostas e mensagens)
  siteUrl: (process.env.SITE_URL || 'https://cauacaetano.github.io/blue-rose-automacao-express/clinicas.html').trim(),
  // Pasta onde o Dev salva as prévias em HTML
  pastaPrevias: path.resolve(RAIZ, process.env.PASTA_PREVIAS || './previas'),
};
