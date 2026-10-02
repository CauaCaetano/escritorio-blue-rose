// =============================================================
// Servidor do Escritório BLUE ROSE
// -------------------------------------------------------------
//  - Express serve o front (pasta public/) e a API REST (/api)
//  - WebSocket (/ws) envia os eventos em tempo real
//  - SQLite guarda tudo (pasta data/)
// =============================================================
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { config, RAIZ } from './config.js';
import * as db from './db.js';
import { Escritorio, ErroUsuario, resumoNegocio } from './escritorio.js';
import { normalizarWhatsapp } from './whatsapp.js';
import { supabaseConfigurado, sincronizarTudo } from './supabase.js';

db.abrirBanco(config.caminhoBanco);
const escritorio = new Escritorio({ velocidade: config.velocidadeInicial });

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(RAIZ, 'public')));
app.use('/shared', express.static(path.join(RAIZ, 'shared')));
// Three.js (visão 3D) servido localmente: funciona sem internet e no aplicativo
app.use('/vendor/three', express.static(path.join(RAIZ, 'node_modules', 'three')));

// Transforma erros de async em respostas JSON
const rota = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (e) {
    const status = e instanceof ErroUsuario ? e.status : 500;
    if (status === 500) console.error(e);
    res.status(status).json({ erro: e.message || 'Erro interno' });
  }
};

const textoLimpo = (v, max) => String(v ?? '').trim().slice(0, max);

// ---------------------------------------------------------------
// API
// ---------------------------------------------------------------
app.get('/api/estado', rota(() => escritorio.retrato()));

app.post('/api/pedidos', rota((req) => {
  const texto = textoLimpo(req.body.texto, 300);
  const quantidade = Math.min(Math.max(parseInt(req.body.quantidade, 10) || 1, 1), 5);
  if (!texto) throw new ErroUsuario('Escreva o pedido.');
  return escritorio.novoPedido(texto, quantidade);
}));

// Cadastro de negócio real (etapa 4): você informa os dados, o Prospector analisa.
// Nada é buscado na internet (sem raspagem de sites).
app.post('/api/negocios', rota((req) => {
  const b = req.body || {};
  const nome = textoLimpo(b.nome, 120);
  if (!nome) throw new ErroUsuario('Informe o nome do negócio.');
  let instagram = textoLimpo(b.instagram, 80).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
  if (instagram && !instagram.startsWith('@')) instagram = `@${instagram}`;
  return resumoNegocio(escritorio.cadastrarNegocio({
    nome,
    tipo: textoLimpo(b.tipo, 80) || null,
    cidade: textoLimpo(b.cidade, 80) || null,
    instagram: instagram || null,
    whatsapp: whatsappValido(b.whatsapp),
    observacoes: textoLimpo(b.observacoes, 1000) || null,
  }));
}));

function whatsappValido(v) {
  try { return normalizarWhatsapp(v); } catch (e) { throw new ErroUsuario(e.message); }
}

// Etapa 5: atualizar o WhatsApp do negócio (usado na hora de exportar)
app.patch('/api/negocios/:id/whatsapp', rota((req) => {
  const n = db.obterNegocio(Number(req.params.id));
  if (!n) throw new ErroUsuario('Negócio não encontrado.', 404);
  db.atualizarNegocio(n.id, { whatsapp: whatsappValido(req.body?.whatsapp) });
  escritorio.emitirNegocio(n.id);
  return resumoNegocio(db.obterNegocio(n.id));
}));

// Etapa 5: registra que VOCÊ exportou a mensagem aprovada (copiar ou abrir o WhatsApp).
// O servidor não envia nada; só guarda no histórico e devolve os links.
app.post('/api/negocios/:id/exportar', rota((req) => {
  const via = ['copiar', 'whatsapp_web', 'whatsapp_app'].includes(req.body?.via) ? req.body.via : null;
  if (!via) throw new ErroUsuario('Forma de exportação inválida.');
  return escritorio.registrarExportacao(Number(req.params.id), via, textoLimpo(req.body?.mensagem, 4000));
}));

app.get('/api/negocios', rota(() => db.listarNegocios().map(resumoNegocio)));

app.get('/api/negocios/:id', rota((req) => {
  const id = Number(req.params.id);
  const n = db.obterNegocio(id);
  if (!n) throw new ErroUsuario('Negócio não encontrado.', 404);
  const previa = db.ultimaPrevia(id);
  return {
    negocio: n,
    proposta: db.ultimaProposta(id) || null,
    previa: previa ? { id: previa.id, versao: previa.versao, origem: previa.origem, arquivo: previa.arquivo, criado_em: previa.criado_em } : null,
    revisoes: db.revisoesDoNegocio(id),
    respostas: db.ultimasRespostas(id),
    artefatos: db.artefatosDoNegocio(id),
    decisoes: db.decisoesDoNegocio(id),
    historico: db.historicoDoNegocio(id),
  };
}));

// A prévia é servida isolada (sandbox): sem scripts, sem acesso ao painel
app.get('/api/negocios/:id/previa', (req, res) => {
  const previa = db.ultimaPrevia(Number(req.params.id));
  if (!previa) return res.status(404).type('text').send('Prévia ainda não existe.');
  res.set('Content-Security-Policy',
    "sandbox allow-popups; default-src 'none'; img-src data: https:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com");
  res.type('html').send(previa.html);
});

app.post('/api/negocios/:id/aprovar', rota((req) => resumoNegocio(escritorio.aprovar(Number(req.params.id)))));

app.post('/api/negocios/:id/ajuste', rota((req) => {
  const comentario = textoLimpo(req.body.comentario, 500);
  if (!comentario) throw new ErroUsuario('Escreva o que precisa ser ajustado.');
  return resumoNegocio(escritorio.pedirAjuste(Number(req.params.id), comentario));
}));

// Piloto automático de prospecção (liga/desliga e configura)
app.get('/api/piloto', rota(() => escritorio.piloto.status()));
app.put('/api/piloto', rota((req) => escritorio.piloto.salvar(req.body || {})));

app.post('/api/velocidade', rota((req) => {
  const v = Number(req.body.valor);
  if (![1, 2, 4].includes(v)) throw new ErroUsuario('Velocidade deve ser 1, 2 ou 4.');
  escritorio.definirVelocidade(v);
  return { velocidade: v };
}));

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// ---------------------------------------------------------------
// WebSocket: manda o retrato inicial e depois cada evento
// ---------------------------------------------------------------
const servidor = http.createServer(app);
const wss = new WebSocketServer({ server: servidor, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ tipo: 'retrato', dados: escritorio.retrato() }));
});

escritorio.aoEmitir((evento) => {
  const msg = JSON.stringify(evento);
  for (const cliente of wss.clients) {
    if (cliente.readyState === 1) cliente.send(msg);
  }
});

servidor.listen(config.porta, config.host, () => {
  const endereco = config.host === '0.0.0.0' ? 'localhost' : config.host;
  console.log(`\n  🌹 Escritório BLUE ROSE rodando em http://${endereco}:${config.porta}\n`);
  console.log(`  Banco: ${config.caminhoBanco}`);
  console.log(config.anthropicApiKey
    ? `  IA real: LIGADA (modelo ${config.modeloIA}, esforço ${config.esforcoIA})\n`
    : '  IA real: desligada — modo simulado (coloque ANTHROPIC_API_KEY no .env)\n');
  escritorio.iniciar();
  if (supabaseConfigurado()) {
    console.log('  Supabase: LIGADO (espelhando os dados na nuvem)\n');
    sincronizarTudo((texto) => escritorio.log({ tipo: 'erro', texto }))
      .then((n) => console.log(`  Supabase: ${n} negócios sincronizados.`));
  }
});

// Encerramento limpo (Ctrl+C)
function encerrar() {
  console.log('\n  Encerrando o escritório...');
  escritorio.encerrar();
  wss.close();
  servidor.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
