// Piloto automático: horário, meta diária, uma busca por vez e comportamento sem IA
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ANTHROPIC_API_KEY = '';
process.env.SUPABASE_URL = '';
const db = await import('../server/db.js');
const { Escritorio } = await import('../server/escritorio.js');

db.abrirBanco(':memory:');
const esc = new Escritorio({ velocidade: 1 });
let agora = new Date(2026, 9, 1, 10, 0, 0); // 1º/out, 10h
esc.piloto.agora = () => agora;
const abertas = () => db.tarefasAbertas(['piloto', 'buscar']);

test('desligado e fora do horário não fazem nada', () => {
  assert.equal(esc.piloto.checar(), 'Desligado');
  esc.piloto.salvar({ ativo: true, cidade: 'Franca - SP', porDia: 3, horaInicio: 8, horaFim: 20 });
  // salvar() já fez uma checagem às 10h: deve ter disparado a primeira busca
  assert.equal(abertas(), 1);
  db.banco().prepare("UPDATE tarefas SET status = 'concluida'").run();

  agora = new Date(2026, 9, 1, 22, 0, 0);
  assert.match(esc.piloto.checar(), /Fora do horário/);
  assert.equal(abertas(), 0);
});

test('respeita o intervalo, uma busca por vez e a meta diária', () => {
  agora = new Date(2026, 9, 1, 10, 5, 0);                      // 5 min depois da 1ª busca
  assert.match(esc.piloto.checar(), /intervalo/);

  agora = new Date(2026, 9, 1, 10, 30, 0);
  assert.match(esc.piloto.checar(), /Buscando/);
  const t = db.banco().prepare("SELECT * FROM tarefas WHERE status = 'pendente'").get();
  const dados = JSON.parse(t.dados);
  assert.equal(t.agente, 'gerente');
  assert.equal(dados.cidade, 'Franca - SP');
  assert.ok(dados.nicho && dados.quantidade >= 1 && dados.quantidade <= 2);
  assert.match(esc.piloto.checar(), /Buscando novos clientes/, 'não abre outra busca enquanto há uma');

  // Simula 3 negócios achados hoje pelo piloto: meta cumprida
  db.banco().prepare("UPDATE tarefas SET status = 'concluida'").run();
  for (let i = 0; i < 3; i++) db.criarNegocio({ nome: `Teste ${i}`, fonte: 'piloto' });
  db.banco().prepare("UPDATE negocios SET status = 'aprovado'").run();
  // Data fixa no dia simulado (senão o teste depende do dia em que roda)
  db.banco().prepare('UPDATE negocios SET criado_em = ?').run(new Date(2026, 9, 1, 14, 0, 0).toISOString());
  agora = new Date(2026, 9, 1, 15, 0, 0);
  assert.match(esc.piloto.checar(), /Meta do dia cumprida \(3\/3\)/);

  // No dia seguinte a meta zera
  agora = new Date(2026, 9, 2, 9, 0, 0);
  assert.match(esc.piloto.checar(), /Buscando/);
});

test('sem a IA real, a busca não inventa empresas: avisa no log e segue', async () => {
  db.banco().prepare("UPDATE tarefas SET status = 'concluida'").run();
  const antes = db.listarNegocios().length;
  esc.relogio.definirVelocidade(400);
  esc.iniciar();
  esc.piloto.parar();
  db.inserirTarefa({ agente: 'gerente', tipo: 'piloto', dados: { cidade: 'Franca - SP', nicho: 'barbearia', quantidade: 2 } });
  esc.acordar('gerente');
  const inicio = Date.now();
  while (abertas() && Date.now() - inicio < 15000) await new Promise((r) => setTimeout(r, 25));
  assert.equal(abertas(), 0, 'a busca terminou');
  assert.equal(db.listarNegocios().length, antes, 'nenhuma empresa inventada');
  assert.ok(db.historicoRecente(30).some((l) => /precisa da IA real/.test(l.texto)), 'o motivo aparece no log');
  esc.encerrar();
});
