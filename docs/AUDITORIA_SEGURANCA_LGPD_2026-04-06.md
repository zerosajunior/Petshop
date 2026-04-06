# Auditoria Segurança + LGPD (2026-04-06)

## Correções aplicadas nesta rodada
- Anti-CSRF em rotas mutáveis de API por validação de `Origin/Referer` no `middleware`.
- Verificação de assinatura de sessão com `crypto.subtle.verify` (evita comparação de string de assinatura).
- Rate limit para:
  - login (`/api/auth/login`);
  - troca de senha (`/api/auth/change-password`);
  - solicitação/confirmação de consentimento (`/api/privacy/marketing-consent/*`).
- `GET /api/auth/logout` desativado (`405`), mantendo logout apenas via `POST`.

## Estado atual (alto nível)
- Isolamento multiempresa por `companyId`: presente na maior parte dos endpoints.
- Funções LGPD existentes:
  - exportação de dados do titular;
  - anonimização de titular e vínculos diretos;
  - trilha de auditoria para ações de privacidade.

## Riscos residuais (pendentes)
1. Rate limit em memória (`Map`) não é distribuído entre instâncias.
2. Sessão é stateless sem revogação global imediata (ex.: derrubar sessões antigas após troca de senha).
3. Falta um checklist formal de operação LGPD para produção:
   - base legal por dado;
   - política de retenção por tabela;
   - procedimento de incidente e notificação.

## Próximas ações recomendadas
1. Migrar rate limit para Redis (distribuído).
2. Implementar versão de sessão por usuário (`sessionVersion`) e invalidar tokens antigos em troca de senha.
3. Criar rotina agendada de retenção/expurgo com evidência de execução.
4. Formalizar e publicar Política de Privacidade/Termos com fluxo de atendimento ao titular.
