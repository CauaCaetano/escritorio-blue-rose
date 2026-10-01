// =============================================================
// O time da BLUE ROSE: 14 especialistas em 4 departamentos.
//   Diretoria  · CEO
//   Vendas     · Head de Vendas + SDR, Closer e Customer Success
//   Marketing  · Head de Marketing + Designer, Conteúdo e Tráfego
//   Tecnologia · CTO + SEO, Front-end, Automação e QA
// O "id" é interno e não muda; o nome aparece como "Nome · Cargo".
// O "visual" é usado pelo front para desenhar o personagem (2D e 3D).
// =============================================================

export const DEPARTAMENTOS_TIME = ['Diretoria', 'Vendas', 'Marketing', 'Tecnologia'];

export const TIME = [
  // --------------------------- Diretoria ---------------------------
  {
    id: 'gerente', nome: 'Henrique', cargo: 'CEO', departamento: 'Diretoria', chefe: true,
    especialidade: 'Diretor-Geral',
    papel: 'Recebe seus pedidos, distribui para os departamentos, confere o pacote final e traz tudo para sua aprovação.',
    visual: { camisa: '#1f3a8a', cabelo: '#2b1d16', pele: '#e0ac86', calca: '#1b1e2b', cabeloEstilo: 'curto', gravata: '#c9a54a' },
  },

  // ----------------------------- Vendas ----------------------------
  {
    id: 'headVendas', nome: 'Vitória', cargo: 'Head de Vendas', departamento: 'Vendas', chefe: true,
    especialidade: 'Diretora Comercial',
    papel: 'Lidera o time de vendas: define a abordagem e distribui cada negócio para o SDR.',
    visual: { camisa: '#1d5f3d', cabelo: '#3b2314', pele: '#c68a62', calca: '#1f2430', cabeloEstilo: 'coque', gravata: '#c9a54a' },
  },
  {
    id: 'prospector', nome: 'Rafael', cargo: 'SDR', departamento: 'Vendas',
    especialidade: 'Analista de Prospecção Local',
    papel: 'Analisa o negócio cadastrado (sem raspagem de sites) e recomenda o serviço ideal.',
    visual: { camisa: '#2f7d55', cabelo: '#5a2e12', pele: '#f1c7a3', calca: '#2b2f3f', cabeloEstilo: 'bone', bone: '#1d4f36' },
  },
  {
    id: 'redator', nome: 'Lívia', cargo: 'Closer', departamento: 'Vendas',
    especialidade: 'Redatora de Vendas',
    papel: 'Escreve a proposta comercial e a mensagem de primeiro contato no WhatsApp.',
    visual: { camisa: '#3f9a6a', cabelo: '#1b1b22', pele: '#9c6644', calca: '#2a2638', cabeloEstilo: 'longo' },
  },
  {
    id: 'atendente', nome: 'Bianca', cargo: 'Customer Success', departamento: 'Vendas',
    especialidade: 'Especialista em Atendimento',
    papel: 'Prepara respostas prontas para dúvidas comuns: preço, prazo, mensalidade e como funciona.',
    visual: { camisa: '#57b08a', cabelo: '#6b3b1f', pele: '#f0c09a', calca: '#352a40', cabeloEstilo: 'coque', fone: '#e8e2d0' },
  },

  // ---------------------------- Marketing --------------------------
  {
    id: 'headMarketing', nome: 'Sofia', cargo: 'Head de Marketing', departamento: 'Marketing', chefe: true,
    especialidade: 'Diretora de Marketing',
    papel: 'Lidera o marketing: define a mensagem da marca do cliente e coordena identidade, conteúdo e anúncios.',
    visual: { camisa: '#7a2c5e', cabelo: '#c9a24a', pele: '#f2c9a8', calca: '#241c2b', cabeloEstilo: 'longo', gravata: '#c9a54a' },
  },
  {
    id: 'designer', nome: 'Nina', cargo: 'Designer de Marca', departamento: 'Marketing',
    especialidade: 'Designer de Identidade Visual',
    papel: 'Cria a identidade visual da prévia: paleta de cores, tipografia e estilo.',
    visual: { camisa: '#c94f8c', cabelo: '#2a1a3a', pele: '#e8b58f', calca: '#2c2335', cabeloEstilo: 'curto', oculos: true },
  },
  {
    id: 'conteudo', nome: 'Júlia', cargo: 'Estrategista de Conteúdo', departamento: 'Marketing',
    especialidade: 'Social Media',
    papel: 'Escreve a bio do Instagram e ideias de posts para o negócio do cliente.',
    visual: { camisa: '#a8559a', cabelo: '#8a4a22', pele: '#f0c09a', calca: '#2e2638', cabeloEstilo: 'longo' },
  },
  {
    id: 'anuncios', nome: 'Caio', cargo: 'Gestor de Tráfego', departamento: 'Marketing',
    especialidade: 'Anúncios locais (Meta e Google)',
    papel: 'Cria um anúncio local para o negócio: título, texto, público e orçamento sugerido.',
    visual: { camisa: '#8a4fc2', cabelo: '#1b1b22', pele: '#a8714a', calca: '#262a36', cabeloEstilo: 'bone', bone: '#3b2470' },
  },

  // ---------------------------- Tecnologia -------------------------
  {
    id: 'cto', nome: 'André', cargo: 'CTO', departamento: 'Tecnologia', chefe: true,
    especialidade: 'Diretor de Tecnologia',
    papel: 'Lidera os devs: planeja a página e a automação de cada negócio e cuida da qualidade técnica.',
    visual: { camisa: '#7a3f12', cabelo: '#2b1d16', pele: '#c68a62', calca: '#1b1e2b', cabeloEstilo: 'curto', gravata: '#c9a54a', oculos: true },
  },
  {
    id: 'seo', nome: 'Rita', cargo: 'Dev SEO', departamento: 'Tecnologia',
    especialidade: 'SEO e Performance',
    papel: 'Define título, descrição e palavras-chave da página para o negócio aparecer no Google.',
    visual: { camisa: '#c98a2b', cabelo: '#5a3a1c', pele: '#eab897', calca: '#2c3440', cabeloEstilo: 'coque' },
  },
  {
    id: 'dev', nome: 'Diego', cargo: 'Dev Front-end', departamento: 'Tecnologia',
    especialidade: 'Desenvolvedor Front-end',
    papel: 'Gera a prévia da landing page em HTML, com a identidade visual e o SEO definidos pelo time.',
    visual: { camisa: '#d4702a', cabelo: '#4a3222', pele: '#c68a62', calca: '#262d38', cabeloEstilo: 'fone', fone: '#23232b' },
  },
  {
    id: 'automacao', nome: 'Lucas', cargo: 'Dev de Automação', departamento: 'Tecnologia',
    especialidade: 'Automação de WhatsApp',
    papel: 'Monta o roteiro do robô de atendimento no WhatsApp: boas-vindas, menu e respostas.',
    visual: { camisa: '#b85a1a', cabelo: '#d9a066', pele: '#f1c7a3', calca: '#2c2f38', cabeloEstilo: 'curto', fone: '#23232b' },
  },
  {
    id: 'revisor', nome: 'Marta', cargo: 'QA', departamento: 'Tecnologia',
    especialidade: 'Revisora de Qualidade',
    papel: 'Confere texto, links e versão para celular; pode devolver para o Dev corrigir.',
    visual: { camisa: '#b83a4b', cabelo: '#d9d4c7', pele: '#eab897', calca: '#2e2b35', cabeloEstilo: 'curto', oculos: true },
  },
];

/** "Lívia · Closer" */
export const rotuloAgente = (a) => `${a.nome} · ${a.cargo}`;
export const nomeDoAgente = (id) => {
  const a = TIME.find((x) => x.id === id);
  return a ? rotuloAgente(a) : id;
};
