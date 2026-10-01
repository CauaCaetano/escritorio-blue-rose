// =============================================================
// Banco de dados SQLite
// -------------------------------------------------------------
// Guarda negócios, propostas, prévias, revisões, respostas do
// Atendente, decisões, histórico e a FILA de tarefas de cada
// agente. Assim nada se perde ao reiniciar o servidor.
//
// Usa o SQLite que já vem no Node (node:sqlite): nada para compilar,
// funciona igual no "npm start" e no aplicativo de desktop.
// =============================================================
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

let db;

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS pedidos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  texto       TEXT NOT NULL,
  quantidade  INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'novo',
  criado_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS negocios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id     INTEGER REFERENCES pedidos(id),
  nome          TEXT NOT NULL,
  tipo          TEXT,
  cidade        TEXT,
  instagram     TEXT,
  observacoes   TEXT,
  analise       TEXT,
  status        TEXT NOT NULL DEFAULT 'em_andamento',
  etapa         TEXT,
  motivo        TEXT,
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS propostas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id  INTEGER NOT NULL REFERENCES negocios(id),
  versao      INTEGER NOT NULL,
  proposta    TEXT NOT NULL,
  mensagem    TEXT NOT NULL,
  origem      TEXT NOT NULL DEFAULT 'simulado',
  criado_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS previas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id  INTEGER NOT NULL REFERENCES negocios(id),
  versao      INTEGER NOT NULL,
  html        TEXT NOT NULL,
  arquivo     TEXT,
  origem      TEXT NOT NULL DEFAULT 'simulado',
  criado_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revisoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id  INTEGER NOT NULL REFERENCES negocios(id),
  previa_id   INTEGER REFERENCES previas(id),
  aprovada    INTEGER NOT NULL,
  notas       TEXT,
  origem      TEXT NOT NULL DEFAULT 'simulado',
  criado_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS respostas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id  INTEGER NOT NULL REFERENCES negocios(id),
  conteudo    TEXT NOT NULL,           -- JSON: [{ pergunta, resposta }]
  origem      TEXT NOT NULL DEFAULT 'simulado',
  criado_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id  INTEGER NOT NULL REFERENCES negocios(id),
  decisao     TEXT NOT NULL,           -- 'aprovado' | 'ajuste'
  comentario  TEXT,
  criado_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS historico (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em   TEXT NOT NULL,
  agente      TEXT,
  negocio_id  INTEGER,
  tipo        TEXT NOT NULL DEFAULT 'info',   -- info | entrega | erro | decisao
  texto       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tarefas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  agente       TEXT NOT NULL,
  tipo         TEXT NOT NULL,
  negocio_id   INTEGER,
  dados        TEXT NOT NULL DEFAULT '{}',
  prioridade   INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pendente',  -- pendente | andamento | concluida
  criado_em    TEXT NOT NULL,
  concluida_em TEXT
);

-- Entregas dos especialistas de marketing e tecnologia
-- tipo: identidade | conteudo | anuncio | seo | automacao
CREATE TABLE IF NOT EXISTS artefatos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id  INTEGER NOT NULL REFERENCES negocios(id),
  tipo        TEXT NOT NULL,
  versao      INTEGER NOT NULL,
  conteudo    TEXT NOT NULL,           -- JSON
  agente      TEXT,
  origem      TEXT NOT NULL DEFAULT 'simulado',
  criado_em   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_artefatos ON artefatos(negocio_id, tipo, versao);

CREATE INDEX IF NOT EXISTS idx_tarefas_fila ON tarefas(agente, status, prioridade, id);
CREATE INDEX IF NOT EXISTS idx_historico_id ON historico(id);

CREATE TABLE IF NOT EXISTS ajustes_config (
  chave TEXT PRIMARY KEY,
  valor TEXT
);
`;

export const agora = () => new Date().toISOString();

export function abrirBanco(caminho) {
  if (caminho !== ':memory:') fs.mkdirSync(path.dirname(caminho), { recursive: true });
  db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(ESQUEMA);
  // Migrações simples: colunas novas em bancos criados por versões antigas
  const colunas = db.prepare('PRAGMA table_info(negocios)').all().map((c) => c.name);
  if (!colunas.includes('whatsapp')) db.exec('ALTER TABLE negocios ADD COLUMN whatsapp TEXT');
  // Tarefas que estavam "em andamento" quando o servidor caiu voltam para a fila
  db.prepare(`UPDATE tarefas SET status = 'pendente' WHERE status = 'andamento'`).run();
  return db;
}

export const banco = () => db;

/** Executa uma função dentro de uma transação (tudo ou nada) */
let profundidade = 0;
export function transacao(fn) {
  // Transação aninhada: já estamos dentro de uma, só executa
  if (profundidade > 0) return fn();
  profundidade++;
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    profundidade--;
  }
}

// ---------------------------------------------------------------
// Configurações persistidas (ex.: velocidade)
// ---------------------------------------------------------------
export function lerAjuste(chave, padrao = null) {
  const r = db.prepare('SELECT valor FROM ajustes_config WHERE chave = ?').get(chave);
  return r ? JSON.parse(r.valor) : padrao;
}
export function salvarAjuste(chave, valor) {
  db.prepare(`INSERT INTO ajustes_config (chave, valor) VALUES (?, ?)
              ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`).run(chave, JSON.stringify(valor));
}

// ---------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------
export function criarPedido(texto, quantidade) {
  const r = db.prepare('INSERT INTO pedidos (texto, quantidade, criado_em) VALUES (?, ?, ?)')
    .run(texto, quantidade, agora());
  return obterPedido(r.lastInsertRowid);
}
export const obterPedido = (id) => db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
export const marcarPedido = (id, status) => db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(status, id);

// ---------------------------------------------------------------
// Negócios
// ---------------------------------------------------------------
export function criarNegocio(n) {
  const t = agora();
  const r = db.prepare(`INSERT INTO negocios
      (pedido_id, nome, tipo, cidade, instagram, whatsapp, observacoes, analise, status, etapa, criado_em, atualizado_em)
      VALUES (@pedido_id, @nome, @tipo, @cidade, @instagram, @whatsapp, @observacoes, @analise, 'em_andamento', @etapa, @t, @t)`)
    .run({
      // Só os campos da tabela (o node:sqlite recusa parâmetros extras e "undefined")
      pedido_id: n.pedido_id ?? null, nome: n.nome, tipo: n.tipo ?? null, cidade: n.cidade ?? null,
      instagram: n.instagram ?? null, whatsapp: n.whatsapp ?? null, observacoes: n.observacoes ?? null,
      analise: n.analise ?? null, etapa: n.etapa ?? 'prospeccao', t,
    });
  return obterNegocio(r.lastInsertRowid);
}
export const obterNegocio = (id) => db.prepare('SELECT * FROM negocios WHERE id = ?').get(id);

export function atualizarNegocio(id, campos) {
  const chaves = Object.keys(campos);
  if (!chaves.length) return obterNegocio(id);
  const sets = chaves.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE negocios SET ${sets}, atualizado_em = @_t WHERE id = @_id`)
    .run({ ...campos, _t: agora(), _id: id });
  return obterNegocio(id);
}

export const negociosDoPedido = (pedidoId) =>
  db.prepare('SELECT * FROM negocios WHERE pedido_id = ? ORDER BY id').all(pedidoId);

export const listarNegocios = () =>
  db.prepare('SELECT * FROM negocios ORDER BY atualizado_em DESC, id DESC').all();

export const negociosAguardando = () =>
  db.prepare(`SELECT * FROM negocios WHERE status = 'aguardando_aprovacao' ORDER BY atualizado_em`).all();

// ---------------------------------------------------------------
// Propostas, prévias, revisões, respostas e decisões
// ---------------------------------------------------------------
function proximaVersao(tabela, negocioId) {
  const r = db.prepare(`SELECT COALESCE(MAX(versao), 0) + 1 AS v FROM ${tabela} WHERE negocio_id = ?`).get(negocioId);
  return r.v;
}

export function salvarProposta(negocioId, { proposta, mensagem, origem = 'simulado' }) {
  const versao = proximaVersao('propostas', negocioId);
  db.prepare(`INSERT INTO propostas (negocio_id, versao, proposta, mensagem, origem, criado_em)
              VALUES (?, ?, ?, ?, ?, ?)`).run(negocioId, versao, proposta, mensagem, origem, agora());
  return ultimaProposta(negocioId);
}
export const ultimaProposta = (negocioId) =>
  db.prepare('SELECT * FROM propostas WHERE negocio_id = ? ORDER BY versao DESC LIMIT 1').get(negocioId);

export function salvarPrevia(negocioId, { html, arquivo = null, origem = 'simulado' }) {
  const versao = proximaVersao('previas', negocioId);
  db.prepare(`INSERT INTO previas (negocio_id, versao, html, arquivo, origem, criado_em)
              VALUES (?, ?, ?, ?, ?, ?)`).run(negocioId, versao, html, arquivo, origem, agora());
  return ultimaPrevia(negocioId);
}
export const definirArquivoPrevia = (previaId, arquivo) =>
  db.prepare('UPDATE previas SET arquivo = ? WHERE id = ?').run(arquivo, previaId);

export const ultimaPrevia = (negocioId) =>
  db.prepare('SELECT * FROM previas WHERE negocio_id = ? ORDER BY versao DESC LIMIT 1').get(negocioId);

export function salvarRevisao(negocioId, { previaId, aprovada, notas, origem = 'simulado' }) {
  db.prepare(`INSERT INTO revisoes (negocio_id, previa_id, aprovada, notas, origem, criado_em)
              VALUES (?, ?, ?, ?, ?, ?)`).run(negocioId, previaId, aprovada ? 1 : 0, notas, origem, agora());
}
export const revisoesDoNegocio = (negocioId) =>
  db.prepare('SELECT * FROM revisoes WHERE negocio_id = ? ORDER BY id').all(negocioId);

export function salvarRespostas(negocioId, lista, origem = 'simulado') {
  db.prepare('INSERT INTO respostas (negocio_id, conteudo, origem, criado_em) VALUES (?, ?, ?, ?)')
    .run(negocioId, JSON.stringify(lista), origem, agora());
}
export function ultimasRespostas(negocioId) {
  const r = db.prepare('SELECT * FROM respostas WHERE negocio_id = ? ORDER BY id DESC LIMIT 1').get(negocioId);
  return r ? { ...r, conteudo: JSON.parse(r.conteudo) } : null;
}

export function salvarArtefato(negocioId, tipo, conteudo, { agente = null, origem = 'simulado' } = {}) {
  const versao = db.prepare('SELECT COALESCE(MAX(versao), 0) + 1 AS v FROM artefatos WHERE negocio_id = ? AND tipo = ?')
    .get(negocioId, tipo).v;
  db.prepare(`INSERT INTO artefatos (negocio_id, tipo, versao, conteudo, agente, origem, criado_em)
              VALUES (?, ?, ?, ?, ?, ?, ?)`).run(negocioId, tipo, versao, JSON.stringify(conteudo), agente, origem, agora());
  return ultimoArtefato(negocioId, tipo);
}
export function ultimoArtefato(negocioId, tipo) {
  const r = db.prepare('SELECT * FROM artefatos WHERE negocio_id = ? AND tipo = ? ORDER BY versao DESC LIMIT 1').get(negocioId, tipo);
  return r ? { ...r, conteudo: JSON.parse(r.conteudo) } : null;
}
/** Última versão de cada tipo: { identidade: {...}, seo: {...}, ... } */
export function artefatosDoNegocio(negocioId) {
  const linhas = db.prepare(`SELECT a.* FROM artefatos a
      JOIN (SELECT tipo, MAX(versao) v FROM artefatos WHERE negocio_id = ? GROUP BY tipo) u
        ON a.tipo = u.tipo AND a.versao = u.v
      WHERE a.negocio_id = ?`).all(negocioId, negocioId);
  return Object.fromEntries(linhas.map((r) => [r.tipo, { ...r, conteudo: JSON.parse(r.conteudo) }]));
}

export function salvarDecisao(negocioId, decisao, comentario = null) {
  db.prepare('INSERT INTO decisoes (negocio_id, decisao, comentario, criado_em) VALUES (?, ?, ?, ?)')
    .run(negocioId, decisao, comentario, agora());
}
export const decisoesDoNegocio = (negocioId) =>
  db.prepare('SELECT * FROM decisoes WHERE negocio_id = ? ORDER BY id').all(negocioId);

// ---------------------------------------------------------------
// Histórico (log de atividade)
// ---------------------------------------------------------------
export function registrarHistorico({ agente = null, negocioId = null, tipo = 'info', texto }) {
  const criado_em = agora();
  const r = db.prepare('INSERT INTO historico (criado_em, agente, negocio_id, tipo, texto) VALUES (?, ?, ?, ?, ?)')
    .run(criado_em, agente, negocioId, tipo, texto);
  return { id: Number(r.lastInsertRowid), criado_em, agente, negocio_id: negocioId, tipo, texto };
}
export const historicoRecente = (limite = 80) =>
  db.prepare('SELECT * FROM historico ORDER BY id DESC LIMIT ?').all(limite).reverse();
export const historicoDoNegocio = (negocioId) =>
  db.prepare('SELECT * FROM historico WHERE negocio_id = ? ORDER BY id').all(negocioId);

// ---------------------------------------------------------------
// Fila de tarefas (uma fila por agente)
// ---------------------------------------------------------------
export function inserirTarefa({ agente, tipo, negocioId = null, dados = {}, prioridade = 0 }) {
  const r = db.prepare(`INSERT INTO tarefas (agente, tipo, negocio_id, dados, prioridade, criado_em)
                        VALUES (?, ?, ?, ?, ?, ?)`)
    .run(agente, tipo, negocioId, JSON.stringify(dados), prioridade, agora());
  return Number(r.lastInsertRowid);
}

/** Pega a próxima tarefa pendente do agente e marca como "andamento" */
export function pegarProximaTarefa(agente) {
  const t = db.prepare(`SELECT * FROM tarefas WHERE agente = ? AND status = 'pendente'
                        ORDER BY prioridade DESC, id ASC LIMIT 1`).get(agente);
  if (!t) return null;
  db.prepare(`UPDATE tarefas SET status = 'andamento' WHERE id = ?`).run(t.id);
  return { ...t, dados: JSON.parse(t.dados) };
}

export function concluirTarefa(id) {
  db.prepare(`UPDATE tarefas SET status = 'concluida', concluida_em = ? WHERE id = ?`).run(agora(), id);
}

export const tamanhoFila = (agente) =>
  db.prepare(`SELECT COUNT(*) AS n FROM tarefas WHERE agente = ? AND status IN ('pendente','andamento')`).get(agente).n;

// ---------------------------------------------------------------
// Contadores do painel
// ---------------------------------------------------------------
export function contadores() {
  const um = (sql) => db.prepare(sql).get().n;
  return {
    negocios: um('SELECT COUNT(*) AS n FROM negocios'),
    emAndamento: um(`SELECT COUNT(*) AS n FROM negocios WHERE status IN ('em_andamento','em_ajuste')`),
    aguardando: um(`SELECT COUNT(*) AS n FROM negocios WHERE status = 'aguardando_aprovacao'`),
    aprovados: um(`SELECT COUNT(*) AS n FROM negocios WHERE status = 'aprovado'`),
    propostas: um('SELECT COUNT(*) AS n FROM propostas'),
    previas: um('SELECT COUNT(*) AS n FROM previas'),
    ajustes: um(`SELECT COUNT(*) AS n FROM decisoes WHERE decisao = 'ajuste'`),
  };
}
