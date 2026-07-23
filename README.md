# Festas do Barrete Verde e das Salinas 2026

Aplicação web do programa das festas de Alcochete (7 a 13 de agosto de 2026), com:

- **Área pública** (`/`) — qualquer pessoa vê o programa (PT / EN / FR)
- **Back-office** (`/admin`) — só o administrador entra (login) e gere os eventos sem mexer no código

Tecnologias: React, Vite, Tailwind CSS, Supabase.

---

## O que precisas

1. Conta gratuita em [supabase.com](https://supabase.com)
2. Conta gratuita em [vercel.com](https://vercel.com) **ou** [netlify.com](https://netlify.com) (para publicar na Internet)
3. Este projeto no teu computador (com [Node.js](https://nodejs.org) instalado)

---

## Passo 1 — Criar o projeto no Supabase

1. Vai a [https://supabase.com](https://supabase.com) e cria uma conta (podes usar Google/GitHub).
2. Clica em **New project**.
3. Escolhe um nome (ex.: `barrete-verde`), uma palavra-passe forte para a base de dados e a região mais próxima (ex.: Frankfurt).
4. Espera até o projeto ficar pronto (1–2 minutos).

---

## Passo 2 — Copiar URL e chave para o ficheiro `.env`

1. No menu do projeto Supabase, abre **Project Settings** (ícone de engrenagem) → **API**.
2. Copia:
   - **Project URL**
   - **anon public** key (chave pública)
3. Neste projeto, copia o ficheiro `.env.example` e renomeia a cópia para `.env`.
4. Abre o `.env` e cola assim:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Guarda o ficheiro. **Não partilhes** o `.env` em público (já está no `.gitignore`).

---

## Passo 3 — Criar a tabela e carregar o programa

1. No Supabase, abre **SQL Editor** → **New query**.
2. Abre o ficheiro `seed.sql` deste projeto, copia **todo** o conteúdo e cola no editor.
3. Clica em **Run**.
4. Se correr bem, a tabela `eventos` fica criada com o programa completo das festas.

> Se preferires só criar a tabela vazia, usa `schema.sql` em vez do `seed.sql`. Depois podes adicionar eventos no back-office (`/admin`).

---

## Passo 4 — Criar o utilizador administrador

1. No Supabase, abre **Authentication** → **Users**.
2. Clica em **Add user** → **Create new user**.
3. Introduz o teu **email** e uma **palavra-passe**.
4. Confirma a criação.

É com este email e palavra-passe que entras em `/admin`.

---

## Passo 5 — Correr a app no computador

No terminal, dentro da pasta do projeto:

```bash
npm install
npm run dev
```

Abre o endereço que aparece (normalmente `http://localhost:5173`).

- Programa público: `http://localhost:5173/`
- Administração: `http://localhost:5173/admin` (ou o link **Admin** no rodapé)

---

## Passo 6 — Publicar na Internet (Vercel ou Netlify)

### Opção A — Vercel

1. Faz upload do projeto para o GitHub (ou liga a pasta local ao Vercel).
2. Em [vercel.com](https://vercel.com) → **Add New Project** → escolhe o repositório.
3. Em **Environment Variables**, adiciona as mesmas variáveis do `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (se fores usar notificações)
4. Faz **Deploy**. Quando terminar, tens um link público (ex.: `https://festas-barrete-verde.vercel.app`).

### Opção B — Netlify

1. Em [netlify.com](https://netlify.com) → **Add new site** → importa o repositório.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Em **Site settings → Environment variables**, adiciona `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e (opcional) `VITE_VAPID_PUBLIC_KEY`.
5. Faz o deploy.

**Importante:** depois de alterar variáveis de ambiente, volta a fazer um deploy para elas entrarem em vigor.

---

## Feedback do público

No rodapé do site há **Problema ou sugestão**. As mensagens ficam no admin → separador **Feedback**.

1. Corre o SQL `feedback.sql` no Supabase.
2. Faz deploy (ou espera o Vercel).

---

## Como gerir o programa (sem código)

1. Abre a app → no rodapé clica **Admin**.
2. Entra com o email e palavra-passe criados no Supabase.
3. Podes **Adicionar**, **Editar** ou **Apagar** eventos.
4. As alterações aparecem de imediato na área pública para toda a gente.

Campos de cada evento:

| Campo | Exemplo |
|--------|---------|
| Dia | 2026-08-10 |
| Hora | 22:30 |
| Título | Animação Musical com TOY |
| Local | Uma morada, ou várias ruas separadas por vírgulas (o site abre cada rua no mapa) |
| Categoria | Música, Toiros, Folclore, … |
| Ordem | 0, 1, 2… (quando há vários à mesma hora) |

---

## Notificações push (opcional)

Permite avisar quem instalou / autorizou notificações (Android Chrome; iPhone só com a app no Ecrã Principal, iOS 16.4+).

1. Corre o SQL `push-subscriptions.sql` no Supabase.
2. Gera chaves VAPID:
   ```bash
   npx web-push generate-vapid-keys
   ```
3. Coloca a **chave pública** em `.env` como `VITE_VAPID_PUBLIC_KEY` (e no Vercel/Netlify).
4. Instala a [Supabase CLI](https://supabase.com/docs/guides/cli), liga o projeto e faz deploy da função:
   ```bash
   supabase functions deploy send-push
   supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:teu@email.com"
   ```
5. No admin → separador **Avisos**, escreve título + mensagem e envia.

---

## Estrutura do projeto (resumo)

```
src/
  components/     # Cabeçalho, tabs, cartões, filtros, admin…
  context/        # Idioma (PT/EN/FR)
  data/           # Traduções, categorias, dias
  lib/supabase.js # Ligação à base de dados
  pages/          # Página pública e /admin
seed.sql          # Tabela + programa completo
schema.sql        # Só a tabela (sem dados)
.env.example      # Modelo das variáveis
```

---

## Problemas frequentes

**A página pública está vazia**  
Confirma que correste o `seed.sql` e que o `.env` tem o URL e a chave certos. Reinicia o `npm run dev` depois de alterar o `.env`.

**Não consigo entrar no admin**  
Verifica o utilizador em Authentication → Users. Confirma email e palavra-passe.

**Erro ao guardar no admin**  
Confirma que as políticas RLS do `seed.sql` / `schema.sql` foram criadas (leitura pública, escrita só para autenticados).

**Deploy não mostra dados**  
As variáveis `VITE_…` têm de estar definidas no Vercel/Netlify e o site tem de ser reconstruído depois de as adicionar.

---

Boas festas! 🎪
