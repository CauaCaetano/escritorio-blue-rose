// Espelho no Supabase: falhas de rede não podem travar o escritório.
// Usa um servidor local fingindo ser o Supabase (nenhuma conta é necessária).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const recebidos = [];
let falhar = true;
const falso = http.createServer((req, res) => {
  let corpo = '';
  req.on('data', (c) => { corpo += c; });
  req.on('end', () => {
    if (falhar) { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"message":"fora do ar"}'); }
    recebidos.push({ tabela: req.url.split('?')[0].replace('/rest/v1/', ''), linhas: JSON.parse(corpo || '[]') });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end('[]');
  });
});
await new Promise((r) => falso.listen(0, '127.0.0.1', r));

process.env.ANTHROPIC_API_KEY = '';
process.env.SUPABASE_URL = `http://127.0.0.1:${falso.address().port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';

const db = await import('../server/db.js');
const sb = await import('../server/supabase.js');

test('falha do Supabase vira um aviso só, sem travar; depois sincroniza o negócio inteiro', async () => {
  db.abrirBanco(':memory:');
  const n = db.criarNegocio({ nome: 'Teste Nuvem', tipo: 'Barbearia', cidade: 'Franca - SP' });
  db.salvarProposta(n.id, { proposta: 'P', mensagem: 'M' });
  db.salvarArtefato(n.id, 'seo', { titulo: 'T' });

  const avisos = [];
  await sb.sincronizarTudo((t) => avisos.push(t));
  await sb.sincronizarTudo((t) => avisos.push(t));
  assert.equal(avisos.length, 1, 'o mesmo erro é avisado uma vez só');
  assert.match(avisos[0], /Supabase indisponível/);
  assert.ok(sb.estadoSupabase().erro);

  falhar = false;
  await sb.sincronizarTudo((t) => avisos.push(t));
  assert.equal(sb.estadoSupabase().erro, null);
  const tabelas = recebidos.map((r) => r.tabela);
  assert.deepEqual(tabelas.slice(0, 3), ['negocios', 'propostas', 'artefatos'], 'negócio vai primeiro');
  const neg = recebidos.find((r) => r.tabela === 'negocios').linhas[0];
  assert.equal(neg.nome, 'Teste Nuvem');
  assert.ok(neg.instalacao, 'cada instalação tem um id próprio');
  const art = recebidos.find((r) => r.tabela === 'artefatos').linhas[0];
  assert.deepEqual(art.conteudo, { titulo: 'T' }, 'JSON vai como objeto (jsonb)');
  falso.close();
});
