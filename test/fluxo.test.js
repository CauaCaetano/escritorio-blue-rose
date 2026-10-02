// Testes do fluxo completo com o relógio acelerado (banco em memória).
// Os testes NUNCA chamam a API real: a chave é apagada antes de carregar o servidor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.ANTHROPIC_API_KEY = '';
process.env.PASTA_PREVIAS = fs.mkdtempSync(path.join(os.tmpdir(), 'br-previas-'));

const db = await import('../server/db.js');
const { Escritorio } = await import('../server/escritorio.js');
const { acharCaminho, MESAS, CAFE } = await import('../shared/layout.js');

test('todas as mesas, visitas e a cafeteira são alcançáveis', () => {
  const origem = MESAS.gerente.assento;
  for (const [id, m] of Object.entries(MESAS)) {
    if (id !== 'gerente') assert.ok(acharCaminho(origem, m.assento).length > 0, `assento de ${id}`);
    assert.ok(acharCaminho(origem, m.visita).length > 0, `visita de ${id}`);
  }
  for (const c of CAFE) assert.ok(acharCaminho(MESAS.dev.assento, c).length > 0, 'café');
});

async function esperarAte(cond, limiteMs = 20000) {
  const inicio = Date.now();
  while (!cond()) {
    if (Date.now() - inicio > limiteMs) throw new Error('Tempo esgotado esperando condição');
    await new Promise((r) => setTimeout(r, 25));
  }
}

db.abrirBanco(':memory:');
const esc = new Escritorio({ velocidade: 1 });
esc.relogio.definirVelocidade(400); // bem rápido só para o teste
const eventos = [];
esc.aoEmitir((e) => eventos.push(e));
esc.iniciar();

test('pedido de demonstração percorre o fluxo; ajuste e aprovação funcionam', async () => {
  const pedido = esc.novoPedido('2 padarias em Campinas', 2);
  await esperarAte(() => db.negociosDoPedido(pedido.id).every((n) => n.status === 'aguardando_aprovacao')
    && db.negociosDoPedido(pedido.id).length === 2);

  const [n1, n2] = db.negociosDoPedido(pedido.id);
  assert.equal(n1.tipo, 'Padaria');
  assert.match(n1.cidade, /Campinas/);
  assert.ok(db.ultimaProposta(n1.id), 'tem proposta');
  assert.ok(db.ultimaPrevia(n1.id).html.includes('<!doctype html>'), 'tem prévia');
  assert.ok(db.ultimaPrevia(n1.id).arquivo, 'prévia salva em arquivo');
  assert.ok(fs.existsSync(path.join(process.env.PASTA_PREVIAS, db.ultimaPrevia(n1.id).arquivo)));
  assert.ok(db.ultimasRespostas(n1.id).conteudo.length >= 3, 'tem respostas');

  // Exportar só vale depois de aprovar (etapa 5)
  assert.throws(() => esc.registrarExportacao(n1.id, 'copiar'), /aprovados/);
  esc.aprovar(n1.id);
  assert.equal(db.obterNegocio(n1.id).status, 'aprovado');
  const exp = esc.registrarExportacao(n1.id, 'whatsapp_app');
  assert.match(exp.links.app, /^https:\/\/wa\.me\/\?text=/);
  assert.ok(db.historicoDoNegocio(n1.id).some((l) => /abriu o WhatsApp/.test(l.texto)));

  const versaoAntes = db.ultimaProposta(n2.id).versao;
  esc.pedirAjuste(n2.id, 'Deixar o texto mais curto');
  await esperarAte(() => db.obterNegocio(n2.id).status === 'aguardando_aprovacao');
  assert.equal(db.ultimaProposta(n2.id).versao, versaoAntes + 1);
  assert.match(db.ultimaProposta(n2.id).proposta, /mais curto/);
});

test('negócio cadastrado é analisado; sem chave, o erro vai para o log e o fluxo continua', async () => {
  const n = esc.cadastrarNegocio({ nome: 'Clínica Sorriso Teste', tipo: 'Odontologia', cidade: 'Ribeirão Preto', instagram: '@teste', observacoes: 'Só atende por ligação' });
  await esperarAte(() => db.obterNegocio(n.id).status === 'aguardando_aprovacao');
  const final = db.obterNegocio(n.id);
  assert.match(final.analise, /Recomendação/);
  assert.ok(final.motivo.length > 10, 'Gerente escreveu o resumo');
  const logs = db.historicoDoNegocio(n.id);
  assert.ok(logs.some((l) => l.tipo === 'erro' && /Sem chave/.test(l.texto)), 'erro de IA registrado no log');
  assert.equal(db.ultimaProposta(n.id).origem, 'simulado');

  // Marketing e tecnologia entregaram suas partes
  const artefatos = db.artefatosDoNegocio(n.id);
  for (const tipo of ['identidade', 'conteudo', 'anuncio', 'seo', 'automacao']) assert.ok(artefatos[tipo], `falta ${tipo}`);
  assert.ok(db.ultimaPrevia(n.id).html.includes(artefatos.seo.conteudo.titulo.replace(/&/g, '&amp;')), 'prévia usa o título do SEO');
  // Passou por todos os departamentos (cada agente aparece no histórico)
  const quem = new Set(db.historicoDoNegocio(n.id).map((l) => l.agente).filter(Boolean));
  for (const id of ['gerente', 'headVendas', 'prospector', 'headMarketing', 'designer', 'conteudo', 'anuncios',
    'redator', 'cto', 'seo', 'dev', 'automacao', 'revisor', 'atendente']) assert.ok(quem.has(id), `${id} não trabalhou`);
  esc.encerrar();
});
