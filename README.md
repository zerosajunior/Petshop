# PetShop SaaS (MVP)

Base inicial de um sistema SaaS para pet shop com foco em:

- Agenda de servicos
- Avisos por SMS e WhatsApp (adapter mock pronto para Twilio/Zenvia)
- Promocoes por segmento
- Estoque e produtos
- Controle basico de autenticacao e perfis

## Stack

- Next.js 15 + TypeScript
- Prisma ORM
- PostgreSQL (desenvolvimento e producao)

## Pre-requisitos

- Node.js `20.x` (faixa suportada: `>=20 <23`)
- npm
- PostgreSQL 15+

Arquivos de versao ja incluidos no projeto:

- `.nvmrc` com `20`
- `.node-version` com `20`

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Suba um PostgreSQL local (opcao rapida com Docker):

```bash
docker run --name petshop-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=petshop -p 5432:5432 -d postgres:16
```

3. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Defina variaveis minimas no `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/petshop?schema=public"
DEFAULT_COMPANY_SLUG="default"
AUTH_SESSION_SECRET="troque-esta-chave-com-32-caracteres-ou-mais"
SYSTEM_ADMIN_EMAIL="admin@petshop.local"
SYSTEM_ADMIN_PASSWORD="troque-esta-senha"
```

5. Gere o client Prisma e aplique o schema:

```bash
npx prisma generate
npx prisma db push
```

6. Inicialize os usuarios de acesso:

```bash
npm run auth:bootstrap
```

7. (Opcional) Popule dados de exemplo:

```bash
npm run prisma:seed
```

8. Inicie o app:

```bash
npm run dev
```

Modo direto (sem wrapper resiliente):

```bash
npm run dev:raw
```

App: `http://localhost:3000`

## Qualidade e seguranca

Comandos principais de verificacao:

```bash
npm run lint
npm run test
npm run build
```

Mitigacao temporaria de vulnerabilidade transitiva (`prisma` -> `@prisma/config` -> `effect`):

- O projeto usa override em `package.json`:

```json
"overrides": {
  "effect": "3.21.0"
}
```

- Motivo: eliminar alertas de seguranca enquanto o upstream do Prisma nao incorpora a versao corrigida de forma nativa.
- Estado atual validado: `npm audit --omit=dev` sem vulnerabilidades.
- Criterio para remover: quando uma versao estavel do Prisma resolver isso sem `overrides`.

## Autenticacao e perfis

- Login por sessao (cookie HTTP-only) em `/login`
- Perfis disponiveis: `ADMIN`, `ATTENDANT`, `PROFESSIONAL`

Regras atuais:

- `ADMIN`: acesso total
- `ATTENDANT`: sem acesso as rotas de privacidade (`/api/privacy`, `/privacidade`) e sem `DELETE` nas APIs
- `PROFESSIONAL`: foco operacional de agenda, sem acesso administrativo

## Scripts uteis

- `npm run dev`: inicia em modo resiliente (compativel com Windows e macOS)
- `npm run dev:raw`: inicia com `next dev` sem wrapper
- `npm run lint`: roda ESLint
- `npm run test`: roda suite de testes (Vitest)
- `npm run build`: gera client Prisma e build de producao
- `npm run prisma:generate`: gera o client Prisma
- `npm run prisma:migrate`: executa migracao de desenvolvimento Prisma
- `npm run prisma:seed`: popula dados base
- `npm run reminders:run`: processa lembretes automaticos (24h e 2h)
- `npm run lgpd:retention`: processa rotinas de retencao LGPD
- `npm run auth:bootstrap`: cria/atualiza usuarios e vinculo inicial de acesso

## Endpoints principais (MVP)

Cadastro e operacao:

- `GET/POST /api/customers`
- `GET/POST /api/pets`
- `GET/POST /api/appointments`
- `GET/POST /api/products`
- `GET/POST /api/campaigns`
- `GET/POST /api/messages`
- `GET/POST /api/services`
- `GET/POST /api/stock-movements`

Autenticacao:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/companies`
- `POST /api/auth/switch-company`
- `POST /api/auth/change-password`

Administracao e sistema:

- `GET/POST /api/system/companies`
- `PUT/DELETE /api/system/companies/[id]`
- `GET/POST /api/system/users`
- `PUT/DELETE /api/system/users/[id]`
- `GET/POST /api/system/subscriptions`
- `GET/POST /api/system/plans`
- `GET/POST /api/system/memberships`

Privacidade e consentimento:

- `GET/POST /api/privacy/customers/[id]`
- `POST /api/privacy/marketing-consent/request`
- `GET /api/privacy/marketing-consent/confirm`
- `POST /api/customers/[id]/consent`

Painel e relatorios:

- `GET /api/dashboard`
- `GET /api/reports`
- `GET/PUT /api/company-settings`

## Avisos por canal

`POST /api/messages` aceita:

- `channel`: `SMS` ou `WHATSAPP` (opcional, padrao `SMS`)
- `toPhone`
- `body`

Cada cliente tambem possui `preferredChannel`, utilizado pelo job `reminders:run`.
