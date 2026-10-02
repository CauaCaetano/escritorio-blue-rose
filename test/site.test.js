// O site como ferramenta do time: links com origem e contatos do formulário virando negócios.
// Usa um servidor local fingindo ser o Supabase (nenhuma conta é necessária).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const marcados = [];
let leads = [];
const falso = http.createServer((req, res) => {
  let corpo = '';
  req.on('data', (c) => { corpo += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.endsWith('/leads_site')) { res.writeHead(201); return res.end('[]'); }
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(leads.filter((l) => !l.importado_em)));
    }
    if (req.method === 'PATCH') {
      const id = url.searchParams.get('id').replace('eq.', '');
      const dados = JSON.parse(corpo);
      marcados.push({ id, ...dados });
      const lead = leads.find((l) => l.id === id);
      if (lead) Object.assign(lead, dados);
      res.writeHead(204); return res.end();
    }
    res.writeHead(405); res.end();
  });
});
await new Promise((r) => falso.listen(0, '127.0.0.1', r));

process.env.ANTHROPIC_API_KEY = '';
process.env.SUPABASE_URL = `http://127.0.0.1:${falso.address().port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SITE_URL = 'https://cauacaetano.github.io/blue-rose-automacao-express/';

const db = await import('../server/db.js');
const site = await import('../server/site.js');
const sim = await import('../server/simulado/gerador.js');
const { Escritorio } = await import('../server/escritorio.js');

test('cada nicho recebe o site de exemplo certo, com a marca de origem', () => {
  assert.equal(site.exemploDoNicho('Clínica odontológica'), 'demo-odonto-index.html');
  assert.equal(site.exemploDoNicho('Barbearia'), 'demo-salao-index.html');
  assert.equal(site.exemploDoNicho('Studio de Pilates'), 'demo-fisio-index.html');
  assert.equal(site.exemploDoNicho('Clínica de estética'), 'demo-estetica-index.html');
  assert.equal(site.exemploDoNicho('Pizzaria'), 'demo-restaurante.html');
  assert.equal(site.exemploDoNicho('Pet shop'), 'exemplos.html', 'sem exemplo próprio: lista de exemplos');
  assert.equal(site.linkSite('#contato', 'redator-n7'), 'https://cauacaetano.github.io/blue-rose-automacao-express/?origem=redator-n7#contato');
  assert.equal(site.marcaOrigem('Lívia Closer!', 3), 'livia-closer-n3');
});

test('a mensagem do redator leva o exemplo do nicho; para quem veio do site, é resposta e não abordagem fria', () => {
  const fria = sim.redigirProposta({ id: 4, nome: 'Sorriso Leve', tipo: 'Clínica odontológica', cidade: 'Franca - SP' });
  assert.match(fria.mensagem, /demo-odonto-index\.html\?origem=redator-n4/);
  const resposta = sim.redigirProposta({ id: 5, nome: 'Espaço Lumi', tipo: 'Salão', cidade: 'Franca - SP', fonte: 'site' });
  assert.match(resposta.mensagem, /Obrigado por chamar pelo site/);
  assert.match(resposta.mensagem, /demo-salao-index\.html\?origem=redator-n5/);
});

test('contato do formulário vira negócio do time, uma vez só, e fica marcado no Supabase', async () => {
  db.abrirBanco(':memory:');
  const esc = new Escritorio({ velocidade: 1 });
  leads = [{
    id: '11111111-1111-1111-1111-111111111111', criado_em: new Date().toISOString(),
    nome: 'Ana Ribeiro', negocio: 'Clínica Bella Face', whatsapp: '(16) 98765-4321',
    interesses: ['Agendamento'], mensagem: 'Respondo preço e horário o dia todo.', origem: 'redator-n12',
    pagina: '/blue-rose-automacao-express/', idioma: 'pt-BR', importado_em: null, negocio_id: null,
  }];

  assert.equal(await esc.leadsSite.checar(), 1);
  const n = db.listarNegocios().find((x) => x.fonte === 'site');
  assert.ok(n, 'negócio criado com fonte "site"');
  assert.equal(n.nome, 'Clínica Bella Face');
  assert.equal(n.whatsapp, '5516987654321');
  assert.match(n.observacoes, /Respondo preço e horário/);
  assert.match(n.observacoes, /redator-n12/);
  assert.equal(db.tarefasAbertas(['negocio']), 1, 'o CEO recebeu o negócio para distribuir');
  assert.equal(marcados[0].negocio_id, n.id, 'pedido marcado como importado no Supabase');

  // Mesmo que o Supabase devolva o pedido de novo, ele não é duplicado
  leads[0].importado_em = null;
  assert.equal(await esc.leadsSite.checar(), 0);
  assert.equal(db.listarNegocios().filter((x) => x.fonte === 'site').length, 1);
  esc.encerrar();
  falso.close();
});
