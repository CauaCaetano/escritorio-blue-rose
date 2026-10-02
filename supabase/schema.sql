-- =============================================================
-- Escritório BLUE ROSE — esquema do banco no Supabase (Postgres)
-- -------------------------------------------------------------
-- O escritório grava primeiro no SQLite local e espelha aqui.
-- Cada instalação (npm start, aplicativo, outro PC) tem um id
-- próprio em "instalacao", então os ids locais nunca colidem.
--
-- Segurança: RLS ligado em todas as tabelas e NENHUMA política
-- pública. Só o servidor do escritório, com a chave service_role
-- (que fica no .env e nunca vai para o navegador), lê e escreve.
--
-- Como aplicar: Supabase → SQL Editor → cole este arquivo → Run.
-- =============================================================

create table if not exists public.negocios (
  instalacao     text        not null,
  id             bigint      not null,
  pedido_id      bigint,
  nome           text        not null,
  tipo           text,
  cidade         text,
  instagram      text,
  whatsapp       text,
  observacoes    text,
  analise        text,
  fonte          text,                  -- cadastro | demo | piloto
  status         text        not null,
  etapa          text,
  motivo         text,
  criado_em      timestamptz not null,
  atualizado_em  timestamptz not null,
  primary key (instalacao, id)
);

create table if not exists public.propostas (
  instalacao  text        not null,
  id          bigint      not null,
  negocio_id  bigint      not null,
  versao      int         not null,
  proposta    text        not null,
  mensagem    text        not null,
  origem      text        not null,
  criado_em   timestamptz not null,
  primary key (instalacao, id),
  foreign key (instalacao, negocio_id) references public.negocios (instalacao, id) on delete cascade
);

create table if not exists public.previas (
  instalacao  text        not null,
  id          bigint      not null,
  negocio_id  bigint      not null,
  versao      int         not null,
  html        text        not null,
  arquivo     text,
  origem      text        not null,
  criado_em   timestamptz not null,
  primary key (instalacao, id),
  foreign key (instalacao, negocio_id) references public.negocios (instalacao, id) on delete cascade
);

create table if not exists public.artefatos (
  instalacao  text        not null,
  id          bigint      not null,
  negocio_id  bigint      not null,
  tipo        text        not null,   -- identidade | conteudo | anuncio | seo | automacao
  versao      int         not null,
  conteudo    jsonb       not null,
  agente      text,
  origem      text        not null,
  criado_em   timestamptz not null,
  primary key (instalacao, id),
  foreign key (instalacao, negocio_id) references public.negocios (instalacao, id) on delete cascade
);

create table if not exists public.revisoes (
  instalacao  text        not null,
  id          bigint      not null,
  negocio_id  bigint      not null,
  previa_id   bigint,
  aprovada    boolean     not null,
  notas       text,
  origem      text        not null,
  criado_em   timestamptz not null,
  primary key (instalacao, id),
  foreign key (instalacao, negocio_id) references public.negocios (instalacao, id) on delete cascade
);

create table if not exists public.respostas (
  instalacao  text        not null,
  id          bigint      not null,
  negocio_id  bigint      not null,
  conteudo    jsonb       not null,
  origem      text        not null,
  criado_em   timestamptz not null,
  primary key (instalacao, id),
  foreign key (instalacao, negocio_id) references public.negocios (instalacao, id) on delete cascade
);

create table if not exists public.decisoes (
  instalacao  text        not null,
  id          bigint      not null,
  negocio_id  bigint      not null,
  decisao     text        not null,   -- aprovado | ajuste
  comentario  text,
  criado_em   timestamptz not null,
  primary key (instalacao, id),
  foreign key (instalacao, negocio_id) references public.negocios (instalacao, id) on delete cascade
);

create table if not exists public.historico (
  instalacao  text        not null,
  id          bigint      not null,
  negocio_id  bigint,
  agente      text,
  tipo        text        not null,
  texto       text        not null,
  criado_em   timestamptz not null,
  primary key (instalacao, id)
);

-- Índices para as consultas mais comuns
create index if not exists negocios_status_idx  on public.negocios (status);
create index if not exists propostas_neg_idx     on public.propostas (instalacao, negocio_id);
create index if not exists previas_neg_idx       on public.previas (instalacao, negocio_id);
create index if not exists artefatos_neg_idx     on public.artefatos (instalacao, negocio_id, tipo);
create index if not exists revisoes_neg_idx      on public.revisoes (instalacao, negocio_id);
create index if not exists respostas_neg_idx     on public.respostas (instalacao, negocio_id);
create index if not exists decisoes_neg_idx      on public.decisoes (instalacao, negocio_id);
create index if not exists historico_neg_idx     on public.historico (instalacao, negocio_id);

-- RLS ligado e sem políticas: nada fica acessível pela chave pública (anon)
alter table public.negocios  enable row level security;
alter table public.propostas enable row level security;
alter table public.previas   enable row level security;
alter table public.artefatos enable row level security;
alter table public.revisoes  enable row level security;
alter table public.respostas enable row level security;
alter table public.decisoes  enable row level security;
alter table public.historico enable row level security;
