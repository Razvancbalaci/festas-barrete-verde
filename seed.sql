-- ============================================================
-- Festas do Barrete Verde e das Salinas 2026
-- 1) Corre primeiro o SCHEMA (criar tabela + políticas)
-- 2) Depois corre o SEED (dados do programa)
-- ============================================================

-- ---------- SCHEMA ----------
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  dia date not null,
  hora text not null,
  titulo text not null,
  local text,
  categoria text not null,
  ordem int default 0,
  subtitulo text,
  descricao text,
  bilhetes_url text,
  created_at timestamptz default now()
);

alter table eventos enable row level security;

-- Evita erro se as políticas já existirem
drop policy if exists "leitura publica" on eventos;
drop policy if exists "escrita admin" on eventos;
drop policy if exists "editar admin" on eventos;
drop policy if exists "apagar admin" on eventos;

create policy "leitura publica" on eventos for select using (true);
create policy "escrita admin" on eventos for insert with check (auth.role() = 'authenticated');
create policy "editar admin" on eventos for update using (auth.role() = 'authenticated');
create policy "apagar admin" on eventos for delete using (auth.role() = 'authenticated');

-- ---------- SEED (apaga dados antigos e carrega o programa) ----------
truncate table eventos;

insert into eventos (dia, hora, titulo, local, categoria, ordem) values
-- 7 Agosto
('2026-08-07', '16:00', 'Receção aos Convidados', 'Sede do Aposento do Barrete Verde', 'Institucional', 0),
('2026-08-07', '17:00', 'Hastear das bandeiras', 'Avenida D. Manuel I', 'Institucional', 0),
('2026-08-07', '18:00', '1ª Entrada de Touros na Vila', 'Av. D. Manuel I, Rua da Quebrada, Rua José André dos Santos, Rua João de Deus, Largo da Revolução 1910, Largo de S. João, Av. 5 de Outubro e Nacional 119', 'Toiros', 0),
('2026-08-07', '18:30', '1ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-07', '19:15', 'Recolha de Touros por campinos e cavaleiros amadores', null, 'Toiros', 0),
('2026-08-07', '21:00', 'Cortejo Equestre organizado pela Ass. Equestre de Alcochete', null, 'Equestre', 0),
('2026-08-07', '22:00', 'Corrida de Touros — Mano a Mano', 'Praça de Touros de Alcochete', 'Toiros', 0),
('2026-08-07', '22:00', 'Homenagem ao Forcado, ao Campino e ao Salineiro', null, 'Institucional', 1),
('2026-08-07', '22:30', 'Folclore: Rancho Folclórico Danças e Cantares do Passil, Rancho Folclórico Danças e Cantares da Fonte da Senhora, Rancho Folclórico "Os Camponeses de S. Francisco"', 'Palco S. João', 'Folclore', 0),
('2026-08-07', '22:30', 'Animação musical com Nuno Rupio', 'Palco Salineiro', 'Música', 1),
('2026-08-07', '22:30', 'Animação musical com Fábio', 'Palco Forcado', 'Música', 2),
('2026-08-07', '23:30', 'Animação musical com Dj Tommy', 'Palco Coreto', 'Música', 0),
('2026-08-07', '23:30', 'Espetáculo com Black BoxSquad ShowCase', 'Palco S. João', 'Música', 1),
('2026-08-07', '01:00', '2ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-07', '02:00', 'Recolha de Touros por campinos e cavaleiros amadores, seguida vacada na praça de touros', null, 'Toiros', 0),

-- 8 Agosto
('2026-08-08', '08:00', 'Alvorada com salva de 21 morteiros', null, 'Institucional', 0),
('2026-08-08', '09:00', 'III Prova da Milha', null, 'Desporto', 0),
('2026-08-08', '10:00', 'Bênção dos Cabrestos', 'junto à Igreja Matriz', 'Religioso', 0),
('2026-08-08', '10:00', 'Chegada dos Barcos Tradicionais', null, 'Institucional', 1),
('2026-08-08', '10:00', 'Passeio nos Barcos Tradicionais (reservas no posto de Turismo de Alcochete, no Núcleo de Arte Sacra)', null, 'Institucional', 2),
('2026-08-08', '10:30', 'Prova do Boi da Guia seguida da Arte de Campinagem', 'Av. D. Manuel I, Rua da Quebrada, Rua José André dos Santos, Rua João de Deus, Largo da Revolução 1910, Largo de S. João, Av. 5 de Outubro e Nacional 119', 'Toiros', 0),
('2026-08-08', '14:00', 'Entrega dos Troféus da Prova do Boi da Guia e da Arte de Campinar', null, 'Institucional', 0),
('2026-08-08', '15:00', 'Entrega das Sardinhas e Fogareiros (até às 17:00)', 'Antigo Armazém das Filmagens', 'Gastronomia', 0),
('2026-08-08', '17:00', 'Espetáculo com 4xcap', 'Palco S. João', 'Música', 0),
('2026-08-08', '18:00', '2ª Entrada de Touros na Vila', 'Av. D. Manuel I, Rua da Quebrada, Rua José André dos Santos, Rua João de Deus, Largo da Revolução 1910, Largo de S. João, Av. 5 de Outubro e Nacional 119', 'Toiros', 0),
('2026-08-08', '21:00', 'Sevilhanas do Ap. Barrete Verde de Alcochete', 'Palco S. João', 'Folclore', 0),
('2026-08-08', '22:00', '3ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-08', '23:00', 'Recolha de Touros por campinos e cavaleiros amadores', null, 'Toiros', 0),
('2026-08-08', '23:00', 'Animação Musical com Fábio', 'Palco Salineiro', 'Música', 1),
('2026-08-08', '23:00', 'Animação Musical com Sérgio Pastor', 'Palco Forcado', 'Música', 2),
('2026-08-08', '23:00', 'Animação Musical com Bibe', 'Palco Coreto', 'Música', 3),
('2026-08-08', '00:00', 'Noite da Sardinha Assada', null, 'Gastronomia', 0),
('2026-08-08', '01:00', 'Arruada com a Charanga de Alcochete pelas ruas da Vila', null, 'Música', 0),
('2026-08-08', '03:00', '4ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-08', '04:00', 'Recolha de Touros por campinos e cavaleiros amadores, seguida vacada na praça de touros', null, 'Toiros', 0),

-- 9 Agosto
('2026-08-09', '08:00', 'Alvorada com salva de 21 morteiros', null, 'Institucional', 0),
('2026-08-09', '10:00', '5ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-09', '10:45', 'Recolha de Touros por campinos e cavaleiros amadores', 'Rua José André dos Santos, Rua João de Deus, Largo da Revolução 1910, Largo de S. João, Av. 5 de Outubro e Nacional 119', 'Toiros', 0),
('2026-08-09', '12:00', 'Missa em Honra da Nª. Srª. Da Vida e em memória dos sócios já falecidos', null, 'Religioso', 0),
('2026-08-09', '16:00', 'Troféu das Salinas - Jogo de Apresentação aos Sócios dos Seniores do Grupo Desportivo Alcochetense', null, 'Desporto', 0),
('2026-08-09', '16:00', 'Sessão Solene de entrega dos emblemas aos sócios com 25 e 50 anos de associados', null, 'Institucional', 1),
('2026-08-09', '17:00', 'Lembrança de participação às embarcações tradicionais convidadas', null, 'Institucional', 0),
('2026-08-09', '18:00', 'Corrida de Touros — XLIV Concurso de Ganadarias', 'Praça de Touros de Alcochete', 'Toiros', 0),
('2026-08-09', '22:00', 'Procissão por Terra e Mar em Honra da Nª. Srª. Da Vida (com apontamentos de fado no Palco S. João e na sede do Aposento do Barrete Verde)', null, 'Religioso', 0),
('2026-08-09', '23:00', 'Animação Musical com C. Delgadinho', 'Palco Salineiro', 'Música', 0),
('2026-08-09', '23:00', 'Animação Musical com Ricardo Silva', 'Palco Forcado', 'Música', 1),
('2026-08-09', '00:00', 'Apontamentos de fados', 'Palco S. João', 'Música', 0),
('2026-08-09', '01:00', 'Animação Musical com Dj Nani', 'Palco Coreto', 'Música', 0),
('2026-08-09', '01:00', '6ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 1),
('2026-08-09', '02:00', 'Recolha de Touros por campinos e cavaleiros amadores, seguida vacada na praça de touros', null, 'Toiros', 0),

-- 10 Agosto (Dia do Alcochetano)
('2026-08-10', '08:00', 'Alvorada com salva de 21 morteiros', null, 'Institucional', 0),
('2026-08-10', '10:00', 'Demonstração da arte de pegar touros pelos Forcados do Aposento do Barrete Verde de Alcochete', 'Rua José André dos Santos', 'Toiros', 0),
('2026-08-10', '11:30', 'Brincadeira com bezerros para as crianças', 'Rua José André dos Santos', 'Infantil', 0),
('2026-08-10', '12:30', 'Almoço convívio - Alcochete na rua', null, 'Gastronomia', 0),
('2026-08-10', '15:00', 'Atuação da charanga do HUGA HUGA pelas ruas da Vila', null, 'Música', 0),
('2026-08-10', '18:00', 'Largada de vacas pelas ruas da Vila', 'Rua José André dos Santos, Rua João de Deus, Largo da Revolução 1910, Largo de S. João, Av. 5 de Outubro e Nacional 119', 'Toiros', 0),
('2026-08-10', '22:00', 'Animação Musical com Fernando Correia Marques', 'Palco S. João', 'Música', 0),
('2026-08-10', '23:00', 'Animação Musical com Sérgio Pastor', 'Palco Salineiro', 'Música', 0),
('2026-08-10', '23:00', 'Animação Musical com Nuno Rupio', 'Palco Forcado', 'Música', 1),
('2026-08-10', '23:30', 'Animação Musical com Dj Gamix', 'Palco S. João', 'Música', 0),
('2026-08-10', '01:00', 'Animação Musical com André Gomes', 'Palco Coreto', 'Música', 0),
('2026-08-10', '01:00', '7ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 1),
('2026-08-10', '02:00', 'Recolha de Touros por campinos e cavaleiros amadores, seguida vacada na praça de touros', null, 'Toiros', 0),

-- 11 Agosto
('2026-08-11', '08:00', 'Alvorada com salva de 21 morteiros', null, 'Institucional', 0),
('2026-08-11', '10:00', 'Manhã Infantil', 'Jardim do Rossio', 'Infantil', 0),
('2026-08-11', '18:00', '8ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-11', '19:00', 'Recolha de Touros por campinos e cavaleiros amadores', null, 'Toiros', 0),
('2026-08-11', '22:00', 'Corrida de Touros — Confronto de Ganadarias', 'Praça de Touros de Alcochete', 'Toiros', 0),
('2026-08-11', '22:00', 'Animação Musical com Luís Sequeira', 'Palco S. João', 'Música', 1),
('2026-08-11', '22:30', 'Animação Musical com Ricardo Silva', 'Palco Salineiro', 'Música', 0),
('2026-08-11', '22:30', 'Animação Musical com André Gomes', 'Palco Forcado', 'Música', 1),
('2026-08-11', '23:30', 'Animação Musical com C. Delgadinho', 'Palco Coreto', 'Música', 0),
('2026-08-11', '00:30', '9ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-11', '01:30', 'Recolha de Touros por campinos e cavaleiros amadores, seguida vacada na praça de touros', null, 'Toiros', 0),

-- 12 Agosto
('2026-08-12', '08:00', 'Alvorada com salva de 21 morteiros', null, 'Institucional', 0),
('2026-08-12', '10:00', 'Arte do Salineiro', null, 'Institucional', 0),
('2026-08-12', '16:00', 'Aula aberta das Sevilhanas do Aposento do Barrete Verde', 'em frente à sede', 'Folclore', 0),
('2026-08-12', '18:00', 'Mesa da Tortura e demonstração equestre por parte do Picadeiro da Quinta da Horta', 'Praça de Touros', 'Equestre', 0),
('2026-08-12', '19:00', 'Animação pelas ruas da Vila com os Anau a Rufar e Sessão fotográfica com a Mascote Pintassilgo', null, 'Música', 0),
('2026-08-12', '22:30', 'Animação Musical com TOY', 'Palco S. João', 'Música', 0),
('2026-08-12', '23:00', 'Animação Musical com Bibe', 'Palco Salineiro', 'Música', 0),
('2026-08-12', '23:00', 'Animação Musical com C. Delgadinho', 'Palco Forcado', 'Música', 1),
('2026-08-12', '00:00', 'Animação Musical com Sérgio Pastor', 'Palco Coreto', 'Música', 0),
('2026-08-12', '01:00', '10ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-12', '02:00', 'Recolha de Touros por campinos e cavaleiros amadores, seguida vacada na praça de touros', null, 'Toiros', 0),

-- 13 Agosto
('2026-08-13', '08:00', 'Alvorada com salva de 21 morteiros', null, 'Institucional', 0),
('2026-08-13', '10:00', 'Prova de Karting', 'junto ao Pavilhão Municipal de Alcochete', 'Desporto', 0),
('2026-08-13', '17:30', '3ª Entrada de Touros na Vila', 'Av. D. Manuel I, Rua da Quebrada, Rua José André dos Santos, Rua João de Deus, Largo da Revolução 1910, Largo de S. João, Av. 5 de Outubro e Nacional 119', 'Toiros', 0),
('2026-08-13', '18:00', '11ª Largada de Touros', 'Rua José André dos Santos e Av. 5 de Outubro', 'Toiros', 0),
('2026-08-13', '19:00', 'Recolha de Touros por campinos e cavaleiros amadores', null, 'Toiros', 0),
('2026-08-13', '22:00', 'Banda Sociedade 15 de Janeiro de 1898 de Alcochete', 'Palco S. João', 'Música', 0),
('2026-08-13', '22:00', 'Grande Concurso Ibérico de Recortadores', 'Praça de Touros de Alcochete', 'Toiros', 1),
('2026-08-13', '23:00', 'Animação Musical com André Gomes', 'Palco Salineiro', 'Música', 0),
('2026-08-13', '23:00', 'Animação Musical com Bibe', 'Palco Forcado', 'Música', 1),
('2026-08-13', '23:30', 'Animação Musical com Nuno Rupio', 'Palco Coreto', 'Música', 0),
('2026-08-13', '00:00', 'Arrear das Bandeiras', null, 'Institucional', 0),
('2026-08-13', '00:30', 'Espetáculo Piromusical', null, 'Pirotecnia', 0);

-- Detalhes cartazes + bilheteiras CCS (links por dia)
update eventos set
  subtitulo = 'Um Confronto Histórico',
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
where dia = '2026-08-07' and titulo ilike '%Mano a Mano%';

update eventos set
  subtitulo = 'António Manuel Cardoso «Nené»',
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
where dia = '2026-08-09' and titulo ilike '%Concurso de Ganadarias%';

update eventos set
  subtitulo = 'Prudêncio × Vale Sorraia',
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
where dia = '2026-08-11' and titulo ilike '%Confronto de Ganadarias%';

update eventos set
  subtitulo = 'Pela primeira vez em Alcochete',
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
where dia = '2026-08-13' and titulo ilike '%Recortadores%';

