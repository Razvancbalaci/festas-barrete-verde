-- ============================================================
-- Atualização: bilhetes por dia + Recortadores + tabela negócios
-- Cola tudo no SQL Editor do Supabase e corre (Run)
-- ============================================================

-- Colunas extra nos eventos (se ainda não existirem)
alter table eventos
  add column if not exists subtitulo text,
  add column if not exists descricao text,
  add column if not exists bilhetes_url text;

-- ---------- 7 Agosto — Mano a Mano ----------
update eventos set
  titulo = 'Corrida de Touros — Mano a Mano',
  subtitulo = 'Um Confronto Histórico',
  local = 'Praça de Touros de Alcochete',
  bilhetes_url = 'https://www.ccsbilhetica.pt/events/a21c4db7-5878-437c-8193-c45ec34563b7',
  descricao = 'CAVALEIROS
João Moura Jr.
Francisco Palha

FORCADOS
Amadores de Lisboa — Cap. Pedro Maria Gomes
Amadores de Alcochete — Cap. António José Cardoso

GANADARIA
6 toiros de Joaquim Brito Paes
(Ganadaria vencedora do Troféu de Bravura 2025)

Organização: Toiros & Tauromaquia Lda.
Temporada 2026 · A Feira do Toiro-Toiro'
where dia = '2026-08-07'
  and (titulo ilike '%Corrida de Touros%' or titulo ilike '%Mano a Mano%');

-- ---------- 9 Agosto — Concurso de Ganadarias ----------
update eventos set
  titulo = 'Corrida de Touros — XLIV Concurso de Ganadarias',
  subtitulo = 'António Manuel Cardoso «Nené»',
  local = 'Praça de Touros de Alcochete',
  bilhetes_url = 'https://www.ccsbilhetica.pt/events/a21c613f-e0a2-46e4-85e0-d6cf0bd0e572',
  descricao = 'CAVALEIROS
Rui Fernandes
João R. Telles
L. Rouxinol Jr.

FORCADOS
Amadores de Alcochete — Cap. António José Cardoso

GANADARIAS
Lopes Branco · Branco Núncio · David Ribeiro Telles
Cunhal Patrício · Joaquim Brito Paes · Passanha
(6 toiros)

Prémio de Bravura: Estevão Augusto de Oliveira
Prémio de Apresentação: António José Cardoso

Organização: Toiros & Tauromaquia Lda.
Temporada 2026 · A Feira do Toiro-Toiro'
where dia = '2026-08-09'
  and (titulo ilike '%Corrida de Touros%' or titulo ilike '%Concurso de Ganadarias%');

-- ---------- 11 Agosto — Confronto de Ganadarias ----------
update eventos set
  titulo = 'Corrida de Touros — Confronto de Ganadarias',
  subtitulo = 'Prudêncio × Vale Sorraia',
  local = 'Praça de Touros de Alcochete',
  bilhetes_url = 'https://www.ccsbilhetica.pt/events/a21c6cd0-ad3a-4901-97bb-6cdd91932e58',
  descricao = 'CAVALEIROS
Luís Rouxinol
Manuel Telles Bastos
João Moura Caetano
David Gomes
António Telles Filho
Paco Velásquez

FORCADOS
Ap. Barrete Verde Alcochete — Cap. Simão Loia
Aposento da Moita — Cap. Luís Canto Moniz

GANADARIAS
3 toiros de Prudêncio
3 toiros de Vale Sorraia

Organização: Toiros & Tauromaquia Lda.
Temporada 2026 · A Feira do Toiro-Toiro'
where dia = '2026-08-11'
  and (titulo ilike '%Corrida de Touros%' or titulo ilike '%Confronto%');

-- ---------- 13 Agosto — Concurso Ibérico de Recortadores ----------
update eventos set
  titulo = 'Grande Concurso Ibérico de Recortadores',
  subtitulo = 'Pela primeira vez em Alcochete',
  local = 'Praça de Touros de Alcochete',
  bilhetes_url = 'https://www.ccsbilhetica.pt/events/a21c76c8-9269-44a5-88dd-d832f92ebdcd',
  descricao = 'ESPETÁCULO
Quiebros, saltos e recortes
Emoção sem limites!

TOIROS
4 toiros em pontas
No final: 1 toiro para curiosos

MÚSICA
Banda da Sociedade Imparcial 15 de Janeiro de 1898 de Alcochete

BILHETEIRA
Online: ccsbilhetica.pt
Reservas telefónicas: 913 862 552
(válidas até 24h antes do espetáculo)

INFO
Espetáculo a partir dos 12 anos
Entrada interdita a menores de 3 anos'
where dia = '2026-08-13'
  and (titulo ilike '%Recortadores%' or titulo ilike '%Concurso Ibérico%');

-- ============================================================
-- NEGÓCIOS LOCAIS (promoções com aprovação do admin)
-- ============================================================
create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null,
  descricao text not null,
  morada text not null,
  telefone text not null,
  email text not null,
  website text,
  horario text,
  aprovado boolean not null default false,
  created_at timestamptz default now(),
  aprovado_em timestamptz
);

alter table negocios enable row level security;

drop policy if exists "negocios leitura" on negocios;
drop policy if exists "negocios submeter" on negocios;
drop policy if exists "negocios admin update" on negocios;
drop policy if exists "negocios admin delete" on negocios;

-- Público só vê aprovados; admin vê todos
create policy "negocios leitura" on negocios
  for select using (aprovado = true or auth.role() = 'authenticated');

-- Qualquer pessoa pode candidatar-se (sempre como não aprovado)
create policy "negocios submeter" on negocios
  for insert with check (aprovado = false);

-- Só admin altera / aprova / apaga
create policy "negocios admin update" on negocios
  for update using (auth.role() = 'authenticated');

create policy "negocios admin delete" on negocios
  for delete using (auth.role() = 'authenticated');
