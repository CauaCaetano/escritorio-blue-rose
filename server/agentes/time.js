// =============================================================
// O time da BLUE ROSE: cada agente especialista tem nome, cargo,
// especialidade e visual (usado pelo front para pintar o personagem).
// O "id" é interno e não muda; o nome aparece como "Nome · Cargo".
// =============================================================

export const TIME = [
  {
    id: 'gerente', nome: 'Henrique', cargo: 'Gerente',
    especialidade: 'Gerente de Operações',
    papel: 'Recebe seus pedidos, divide as tarefas, confere o pacote final e traz tudo para sua aprovação.',
    visual: { camisa: '#1f3a8a', cabelo: '#2b1d16', pele: '#e0ac86', calca: '#1b1e2b', cabeloEstilo: 'curto', gravata: '#c9a54a' },
  },
  {
    id: 'prospector', nome: 'Rafael', cargo: 'Prospector',
    especialidade: 'Analista de Prospecção Local',
    papel: 'Analisa negócios locais sem site ou com presença fraca na internet e recomenda o serviço ideal.',
    visual: { camisa: '#2f7d55', cabelo: '#5a2e12', pele: '#f1c7a3', calca: '#2b2f3f', cabeloEstilo: 'bone', bone: '#1d4f36' },
  },
  {
    id: 'redator', nome: 'Lívia', cargo: 'Redatora',
    especialidade: 'Redatora de Vendas',
    papel: 'Escreve a proposta comercial e a mensagem de primeiro contato no WhatsApp.',
    visual: { camisa: '#7a4fc2', cabelo: '#1b1b22', pele: '#9c6644', calca: '#2a2638', cabeloEstilo: 'longo' },
  },
  {
    id: 'dev', nome: 'Diego', cargo: 'Dev',
    especialidade: 'Desenvolvedor Front-end',
    papel: 'Gera a prévia da landing page em HTML, pensada primeiro para o celular.',
    visual: { camisa: '#d4702a', cabelo: '#4a3222', pele: '#c68a62', calca: '#262d38', cabeloEstilo: 'fone', fone: '#23232b' },
  },
  {
    id: 'revisor', nome: 'Marta', cargo: 'Revisora',
    especialidade: 'Revisora de Qualidade',
    papel: 'Confere texto, links e se a página funciona no celular; pode devolver para o Dev corrigir.',
    visual: { camisa: '#b83a4b', cabelo: '#d9d4c7', pele: '#eab897', calca: '#2e2b35', cabeloEstilo: 'curto', oculos: true },
  },
  {
    id: 'atendente', nome: 'Bianca', cargo: 'Atendente',
    especialidade: 'Especialista em Atendimento',
    papel: 'Prepara respostas prontas para dúvidas comuns: preço, prazo, mensalidade e como funciona.',
    visual: { camisa: '#c94f8c', cabelo: '#6b3b1f', pele: '#f0c09a', calca: '#352a40', cabeloEstilo: 'coque', fone: '#e8e2d0' },
  },
];

/** "Lívia · Redatora" */
export const rotuloAgente = (a) => `${a.nome} · ${a.cargo}`;
export const nomeDoAgente = (id) => {
  const a = TIME.find((x) => x.id === id);
  return a ? rotuloAgente(a) : id;
};
