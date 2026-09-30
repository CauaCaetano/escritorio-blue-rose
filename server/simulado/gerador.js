// =============================================================
// Gerador de conteúdo SIMULADO
// -------------------------------------------------------------
// Usado na Etapa 1 (tudo simulado) e, nas próximas etapas, como
// plano B quando a API falhar ou não houver chave configurada.
// Todos os dados aqui são INVENTADOS.
// =============================================================

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
const embaralhar = (lista) => [...lista].sort(() => Math.random() - 0.5);

// Tipos de negócio com nomes, serviços e cor da prévia
export const TIPOS = [
  { tipo: 'Padaria', nomes: ['Pão Dourado', 'Trigo Bom', 'Forno da Vila', 'Sabor da Manhã'], servicos: ['Pães artesanais', 'Bolos por encomenda', 'Café da manhã', 'Salgados para festa'], cor: '#c9822b' },
  { tipo: 'Barbearia', nomes: ['Navalha de Ouro', 'Dom Bigode', 'Corte Fino', 'Barba Negra'], servicos: ['Corte masculino', 'Barba na toalha quente', 'Pigmentação', 'Dia do noivo'], cor: '#2f2f38' },
  { tipo: 'Pet shop', nomes: ['Patinhas Felizes', 'Au Au & Miau', 'Pet Amigo', 'Bicho Chique'], servicos: ['Banho e tosa', 'Ração e acessórios', 'Leva e traz', 'Hotelzinho'], cor: '#2e9c8a' },
  { tipo: 'Salão de beleza', nomes: ['Studio Bella', 'Espaço Charme', 'Salão Divas', 'Beleza Pura'], servicos: ['Corte e escova', 'Coloração', 'Manicure e pedicure', 'Design de sobrancelhas'], cor: '#c2477a' },
  { tipo: 'Oficina mecânica', nomes: ['Auto Center Silva', 'Mecânica Confiança', 'Oficina do Zé', 'Motor Forte'], servicos: ['Revisão completa', 'Troca de óleo', 'Freios e suspensão', 'Diagnóstico eletrônico'], cor: '#3a5a8c' },
  { tipo: 'Pizzaria', nomes: ['Bella Napoli', 'Forno a Lenha', 'Pizza da Nona', 'Massa & Molho'], servicos: ['Pizzas tradicionais', 'Pizzas doces', 'Delivery rápido', 'Rodízio aos sábados'], cor: '#c0392b' },
  { tipo: 'Academia', nomes: ['Corpo em Forma', 'Força Total', 'Movimento Fit', 'Energia Academia'], servicos: ['Musculação', 'Aulas de funcional', 'Personal trainer', 'Avaliação física'], cor: '#e67e22' },
  { tipo: 'Clínica odontológica', nomes: ['Sorriso Leve', 'OdontoVida', 'Dente Feliz', 'Clínica Sorrir'], servicos: ['Limpeza', 'Clareamento', 'Aparelho ortodôntico', 'Implantes'], cor: '#2980b9' },
  { tipo: 'Floricultura', nomes: ['Jardim Secreto', 'Flor de Lis', 'Pétalas & Cia', 'Rosa Azul Flores'], servicos: ['Buquês', 'Arranjos para eventos', 'Entrega no mesmo dia', 'Plantas para casa'], cor: '#8e44ad' },
  { tipo: 'Açaiteria', nomes: ['Açaí da Praça', 'Tropical Açaí', 'Roxinho', 'Açaí Point'], servicos: ['Açaí no copo', 'Monte o seu', 'Cremes e sorvetes', 'Delivery'], cor: '#6c2a8c' },
  { tipo: 'Hamburgueria', nomes: ['Brasa Burger', 'Smash House', 'Burguer do Bairro', 'Chapa Quente'], servicos: ['Smash burgers', 'Combos', 'Batata rústica', 'Delivery'], cor: '#d35400' },
  { tipo: 'Lava-rápido', nomes: ['Brilho Total', 'Lava Jato Express', 'Carro Limpo', 'Espuma & Cera'], servicos: ['Lavagem simples', 'Lavagem completa', 'Polimento', 'Higienização interna'], cor: '#16a085' },
];

export const CIDADES = [
  'Campinas - SP', 'Ribeirão Preto - SP', 'Sorocaba - SP', 'Londrina - PR', 'Maringá - PR',
  'Joinville - SC', 'Uberlândia - MG', 'Juiz de Fora - MG', 'Feira de Santana - BA',
  'Caxias do Sul - RS', 'Petrolina - PE', 'Anápolis - GO',
];

const PROBLEMAS = [
  'não tem site próprio',
  'o link da bio do Instagram leva para uma página quebrada',
  'responde clientes só por ligação',
  'o WhatsApp demora horas para responder',
  'não aparece bem posicionado no Google Maps',
  'o cardápio/catálogo está só em fotos no Instagram',
  'não tem horário de funcionamento atualizado na internet',
  'tem poucas avaliações respondidas no Google',
];

// Tenta aproveitar o texto do pedido (ex.: "3 padarias em Campinas")
const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function interpretarPedido(texto = '') {
  const t = normalizar(texto);
  const palavras = t.split(/[^a-z0-9]+/);
  // Compara o começo das palavras (ex.: "padarias" casa com "Padaria")
  const tipo = TIPOS.find((x) => {
    const chave = normalizar(x.tipo).split(/[^a-z]+/)[0].slice(0, 5);
    return palavras.some((p) => (chave.length >= 5 ? p.startsWith(chave) : p === chave))
      || (x.tipo === 'Açaiteria' && palavras.includes('acai'));
  });
  const cidade = CIDADES.find((c) => t.includes(normalizar(c.split(' - ')[0])));
  return { tipo, cidade };
}

/** Inventa `quantidade` negócios locais com uma análise de presença digital */
export function inventarNegocios(textoPedido, quantidade) {
  const { tipo: tipoPedido, cidade: cidadePedido } = interpretarPedido(textoPedido);
  const usados = new Set();
  const lista = [];
  for (let i = 0; i < quantidade; i++) {
    const t = tipoPedido || sortear(TIPOS);
    let nome;
    let tentativas = 0;
    do {
      nome = `${t.tipo === 'Açaiteria' || t.tipo === 'Lava-rápido' ? '' : t.tipo + ' '}${sortear(t.nomes)}`.trim();
      tentativas++;
    } while (usados.has(nome) && tentativas < 10);
    usados.add(nome);
    const cidade = cidadePedido || sortear(CIDADES);
    const problemas = embaralhar(PROBLEMAS).slice(0, 2);
    const seguidores = (Math.random() * 4 + 0.3).toFixed(1).replace('.', ',');
    lista.push({
      nome,
      tipo: t.tipo,
      cidade,
      instagram: '@' + nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''),
      observacoes: 'Negócio fictício gerado no modo simulado.',
      analise: `Presença fraca na internet: ${problemas[0]} e ${problemas[1]}. Instagram com cerca de ${seguidores} mil seguidores.`,
    });
  }
  return lista;
}

export const dadosDoTipo = (tipo) => TIPOS.find((t) => t.tipo === tipo) || TIPOS[0];

/** Proposta comercial + mensagem de primeiro contato (texto simulado) */
export function redigirProposta(negocio, comentario) {
  const primeiroNome = negocio.nome;
  const servicos = dadosDoTipo(negocio.tipo).servicos;
  const ajuste = comentario ? `\n\nObservação desta versão: ajustado conforme o pedido "${comentario}".` : '';
  const proposta =
`Proposta BLUE ROSE para ${primeiroNome} (${negocio.cidade})

Diagnóstico
${negocio.analise || 'Presença digital com espaço para crescer.'}

O que vamos entregar
1. Página profissional, rápida e pensada para celular, destacando: ${servicos.slice(0, 3).join(', ')}.
2. Botão de WhatsApp em destaque, horários e localização.
3. Automação de atendimento no WhatsApp, usando o número que vocês já têm.

Investimento (pagamento único, sem mensalidade)
- Site + Automação: de R$ 500 a R$ 700
- 50% para começar e 50% na entrega, com 1 rodada de ajustes incluída

Prazo
De 4 a 6 dias úteis após a aprovação do conteúdo.${ajuste}`;

  const mensagem =
`Oi! Tudo bem? Aqui é da BLUE ROSE 🌹
Vi o perfil da ${primeiroNome} e montei uma prévia gratuita de como poderia ficar uma página para vocês, com botão direto para o WhatsApp.
Posso te mandar o link para dar uma olhada? Sem compromisso!`;

  return { proposta, mensagem };
}

const escaparHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Prévia de landing page em HTML (modelo simulado) */
export function gerarPreviaHtml(negocio, { correcao } = {}) {
  const d = dadosDoTipo(negocio.tipo);
  const nome = escaparHtml(negocio.nome);
  const cidade = escaparHtml(negocio.cidade);
  const servicos = d.servicos.map((s) => `<li>${escaparHtml(s)}</li>`).join('');
  const rodapeExtra = correcao ? `<p class="nota">Versão corrigida: ${escaparHtml(correcao)}</p>` : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nome} — ${cidade}</title>
<style>
  :root { --cor: ${d.cor}; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1d1d24; background: #faf8f5; }
  header { background: var(--cor); color: #fff; padding: 56px 20px 64px; text-align: center; }
  header h1 { margin: 0 0 8px; font-size: clamp(28px, 7vw, 44px); line-height: 1.1; }
  header p { margin: 0 auto 24px; max-width: 520px; opacity: .92; }
  .botao { display: inline-block; background: #25d366; color: #fff; text-decoration: none; font-weight: 700;
           padding: 14px 26px; border-radius: 999px; box-shadow: 0 6px 18px rgba(0,0,0,.2); }
  main { max-width: 760px; margin: -32px auto 0; padding: 0 16px 40px; }
  .card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
  .card h2 { margin-top: 0; color: var(--cor); }
  ul { padding-left: 20px; line-height: 1.8; }
  footer { text-align: center; font-size: 13px; color: #777; padding: 24px 16px 40px; }
  .nota { font-size: 12px; color: #999; }
</style>
</head>
<body>
  <header>
    <h1>${nome}</h1>
    <p>${escaparHtml(negocio.tipo)} em ${cidade}. Atendimento rápido e de qualidade, do jeito que você merece.</p>
    <a class="botao" href="#" aria-label="Falar no WhatsApp">Falar no WhatsApp</a>
  </header>
  <main>
    <section class="card">
      <h2>O que oferecemos</h2>
      <ul>${servicos}</ul>
    </section>
    <section class="card">
      <h2>Onde estamos</h2>
      <p>${cidade} — endereço completo e mapa entram aqui após a aprovação.</p>
      <p>Horário: segunda a sábado, das 8h às 19h.</p>
    </section>
  </main>
  <footer>
    Prévia criada pela BLUE ROSE 🌹 — conteúdo de exemplo.
    ${rodapeExtra}
  </footer>
</body>
</html>`;
}

const NOTAS_REVISAO = [
  'O botão do WhatsApp está sem o link de teste.',
  'O título está quebrando feio na tela do celular.',
  'Faltou o horário de funcionamento no rodapé.',
  'O contraste do botão principal está baixo.',
  'Há um erro de digitação no texto de apresentação.',
];

/** Revisão simulada: às vezes encontra um problema e devolve para o Dev */
export function revisar({ podeReprovar }) {
  if (podeReprovar && Math.random() < 0.35) {
    return { aprovada: false, notas: sortear(NOTAS_REVISAO) };
  }
  return { aprovada: true, notas: 'Texto, links e versão para celular conferidos. Tudo certo.' };
}

/** Respostas prontas do Atendente para dúvidas comuns */
export function respostasFrequentes(negocio) {
  return [
    { pergunta: 'Quanto custa?', resposta: `Para a ${negocio.nome}: site simples de R$ 450 a R$ 650, automação de WhatsApp de R$ 300 a R$ 450, ou os dois juntos de R$ 500 a R$ 700. Pagamento único.` },
    { pergunta: 'Tem mensalidade?', resposta: 'Não! Você paga uma vez só: 50% para começar e 50% na entrega.' },
    { pergunta: 'Qual o prazo?', resposta: 'Site simples em 3 a 4 dias úteis; site + automação em 4 a 6 dias úteis.' },
    { pergunta: 'Como funciona?', resposta: 'Você aprova a prévia, a gente ajusta os textos, publica a página e configura as respostas automáticas no WhatsApp que você já usa.' },
    { pergunta: 'E depois da entrega?', resposta: 'Uma rodada de ajustes já está incluída no preço.' },
  ];
}

/** Análise simulada do Prospector para um negócio cadastrado por você */
export function analisarNegocio(n) {
  const semInsta = !n.instagram;
  return {
    analise: `${n.nome} (${n.tipo || 'negócio local'}) em ${n.cidade || 'cidade não informada'}. `
      + (semInsta ? 'Sem Instagram informado: provavelmente depende de indicação e ligação. ' : `Tem Instagram (${n.instagram}), mas vale conferir se há link na bio e agendamento fácil. `)
      + 'Um site simples com botão de WhatsApp e respostas automáticas deve reduzir a demora no atendimento.',
    oportunidades: ['Página única com serviços e horários', 'Botão de WhatsApp em destaque', 'Respostas automáticas para preço e agendamento'],
    servico_recomendado: 'Site + Automação',
    prioridade: semInsta ? 'alta' : 'média',
  };
}

/** Resumo simulado do Gerente para a sua aprovação */
export function resumoGerente(n) {
  return {
    resumo: `Pacote de ${n.nome} pronto: proposta, mensagem, prévia revisada e respostas do atendimento.`,
    pontos_de_atencao: ['Conferir os marcadores entre colchetes antes de enviar.'],
  };
}
