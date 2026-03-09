# Deploy na Vercel com PostgreSQL

Este guia publica o Petshop na web usando:
- Frontend/API: Vercel
- Banco: PostgreSQL (ex.: Neon, Supabase, Railway)

## 1) Preparar banco PostgreSQL

1. Crie um banco PostgreSQL gerenciado.
2. Copie a URL de conexão no formato:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
```

## 2) Ajustar variáveis na Vercel

No projeto da Vercel, configure:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
SMS_PROVIDER=mock
WHATSAPP_PROVIDER=mock
REMINDER_WINDOW_MINUTES=15
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
AUTH_USERS_JSON=[{"username":"admin","password":"troque-esta-senha","role":"ADMIN"}]
```

Se for usar WhatsApp real, preencha as variáveis do provedor depois.

## 3) Criar estrutura do banco (primeira publicação)

Este projeto ainda está sem pasta de migrations Prisma.
Para primeira publicação, rode `db push` apontando para o banco de produção:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require" npx prisma db push
```

Opcionalmente, rode seed:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require" npm run prisma:seed:small
```

## 4) Publicar na Vercel

1. Suba o repositório no GitHub.
2. Na Vercel, clique em `New Project` e importe o repositório.
3. Framework detectado: `Next.js`.
4. Confirme deploy.

O script de build já está preparado para gerar Prisma Client:
- `npm run build` => `prisma generate && next build`

## 5) Checklist pós-deploy

- Acessar URL do projeto e validar prompt de autenticação.
- Testar login (`AUTH_USERS_JSON`).
- Abrir `/agenda` e criar agendamento.
- Validar `/api/dashboard` sem erro 500.

## 6) Próxima evolução recomendada

Depois de estabilizar em produção:
1. Criar migrations (`prisma migrate dev`) e usar `prisma migrate deploy`.
2. Remover `db push` do fluxo operacional.
3. Implementar autenticação com sessão (em vez de Basic Auth).
