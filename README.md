# PetShop SaaS (MVP)

Base inicial de sistema para petshop com:

- Agenda de serviços
- Avisos por SMS e WhatsApp (adapter mock pronto para Twilio/Zenvia)
- Promoções por segmento
- Estoque e produtos

## Stack

- Next.js 15 + TypeScript
- Prisma ORM
- SQLite (dev local) com caminho para evoluir para PostgreSQL

## Rodando local

1. Instale dependências:

```bash
npm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Defina autenticação no `.env`:

```bash
DEFAULT_COMPANY_SLUG="default"
AUTH_SESSION_SECRET="troque-esta-chave-com-32-caracteres-ou-mais"
SYSTEM_ADMIN_EMAIL="admin@petshop.local"
SYSTEM_ADMIN_PASSWORD="troque-esta-senha"
```

3. Gere o client e banco:

```bash
npx prisma generate
npx prisma db push
```

4. (Opcional) Popular dados:

```bash
npm run prisma:seed
```

5. Inicializar usuários de acesso no banco:

```bash
npm run auth:bootstrap
```

6. (Opcional) Processar lembretes automáticos (24h e 2h):

```bash
npm run reminders:run
```

7. Suba o app (modo resiliente padrão):

```bash
npm run dev
```

Ou modo direto:

```bash
npm run dev:raw
```

App: `http://localhost:3000`

## Acesso e perfis

- O sistema usa autenticação por sessão (cookie HTTP-only) via `/login`.
- Perfis disponíveis: `ADMIN`, `ATTENDANT`, `PROFESSIONAL`.
- Regras atuais:
  - `ADMIN`: acesso total.
  - `ATTENDANT`: sem acesso a rotas de privacidade (`/api/privacy`, `/privacidade`) e sem `DELETE` nas APIs.
  - `PROFESSIONAL`: foco em agenda (dashboard + agendamentos), sem acesso administrativo.

## Endpoints iniciais

- `GET/POST /api/customers`
- `GET/POST /api/pets`
- `GET/POST /api/appointments`
- `GET/POST /api/products`
- `GET/POST /api/campaigns`
- `GET/POST /api/messages`

## Próximos passos

- Autenticação e perfis (admin, atendente, tosador)
- Job scheduler para lembretes automáticos (24h/2h)
- Integração real com Twilio ou Zenvia
- Migração de SQLite para PostgreSQL em produção

## Avisos por canal

`POST /api/messages` aceita:
- `channel`: `SMS` ou `WHATSAPP` (opcional, padrão `SMS`)
- `toPhone`
- `body`

Cada cliente também possui `preferredChannel`, usado pelo job `reminders:run`.
