// =============================================================
// Espelho no Supabase (opcional)
// -------------------------------------------------------------
// O escritório grava primeiro no SQLite local (rápido e offline) e,
// se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estiverem no .env,
// copia cada negócio (e tudo ligado a ele) para o Supabase.
//
// A chave service_role fica SÓ no servidor; nunca vai ao navegador.
// Se a nuvem falhar, o erro vai para o log e nada trava.
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import * as db from './db.js';

let cliente = null;
let instalacao = null;
const pendentes = new Set();
let timer = null;
const estado = { ativo: false, ultimaSync: null, erro: null };

export const supabaseConfigurado = () => Boolean(config.supabaseUrl && config.supabaseChave);
export const estadoSupabase = () => ({ ...estado, ativo: supabaseConfigurado() });

/** Id desta instalação (gerado uma vez e guardado no SQLite) */
function idInstalacao() {
  if (!instalacao) {
    instalacao = db.lerAjuste('instalacao', null);
    if (!instalacao) { instalacao = randomUUID(); db.salvarAjuste('instalacao', instalacao); }
  }
  return instalacao;
}

function obterCliente() {
  if (!cliente) {
    cliente = createClient(config.supabaseUrl, config.supabaseChave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

/** Linhas locais de um negócio, já no formato das tabelas do Supabase */
function linhasDoNegocio(negocioId) {
  const b = db.banco();
  const inst = idInstalacao();
  const com = (linhas, ajuste = (r) => r) => linhas.map((r) => ({ instalacao: inst, ...ajuste(r) }));
  const todas = (tabela) => b.prepare(`SELECT * FROM ${tabela} WHERE negocio_id = ?`).all(negocioId);
  const negocio = db.obterNegocio(negocioId);
  if (!negocio) return null;
  return {
    negocios: com([negocio]),
    propostas: com(todas('propostas')),
    previas: com(todas('previas')),
    artefatos: com(todas('artefatos'), (r) => ({ ...r, conteudo: JSON.parse(r.conteudo) })),
    revisoes: com(todas('revisoes'), (r) => ({ ...r, aprovada: Boolean(r.aprovada) })),
    respostas: com(todas('respostas'), (r) => ({ ...r, conteudo: JSON.parse(r.conteudo) })),
    decisoes: com(todas('decisoes')),
    historico: com(todas('historico')),
  };
}

async function enviarNegocio(negocioId) {
  const linhas = linhasDoNegocio(negocioId);
  if (!linhas) return;
  const sb = obterCliente();
  // O negócio primeiro (as outras tabelas apontam para ele)
  for (const [tabela, dados] of Object.entries(linhas)) {
    if (!dados.length) continue;
    const { error } = await sb.from(tabela).upsert(dados, { onConflict: 'instalacao,id' });
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}

/** Agenda o envio de um negócio (agrupa mudanças seguidas em um envio só) */
export function agendarSincronizacao(negocioId, aoErro) {
  if (!supabaseConfigurado() || !negocioId) return;
  pendentes.add(negocioId);
  clearTimeout(timer);
  timer = setTimeout(() => descarregar(aoErro), 2000);
}

async function descarregar(aoErro) {
  const ids = [...pendentes];
  pendentes.clear();
  for (const id of ids) {
    try {
      await enviarNegocio(id);
      estado.ultimaSync = new Date().toISOString();
      estado.erro = null;
    } catch (e) {
      const primeiraVez = estado.erro !== e.message;
      estado.erro = e.message;
      if (primeiraVez) aoErro?.(`Supabase indisponível: ${e.message}. Os dados continuam salvos no computador.`);
    }
  }
}

/** Envia todos os negócios (usado ao iniciar, para alcançar o que ficou para trás) */
export async function sincronizarTudo(aoErro) {
  if (!supabaseConfigurado()) return 0;
  const ids = db.listarNegocios().map((n) => n.id);
  for (const id of ids) pendentes.add(id);
  await descarregar(aoErro);
  return ids.length;
}
