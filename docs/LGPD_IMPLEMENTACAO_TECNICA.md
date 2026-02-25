# LGPD - Implementacao Tecnica no Projeto

## O que foi implementado

1. Consentimento de marketing por cliente:
- `Customer.marketingConsent`
- `Customer.marketingConsentAt`
- `Customer.privacyPolicyAcceptedAt`
- `MarketingConsentRequest` (duplo opt-in por codigo com expiracao)

2. Finalidade da mensagem:
- `MessageLog.purpose` (`TRANSACTIONAL` ou `MARKETING`)

3. Trilha de auditoria:
- Modelo `AuditLog`
- Registro automatico para criacao de cliente, pet, agendamento, envio/bloqueio de marketing e direitos do titular.

4. Direitos do titular:
- `GET /api/privacy/customers/[id]` exporta os dados vinculados.
- `DELETE /api/privacy/customers/[id]` anonimiza dados pessoais.
- `PATCH /api/customers/[id]/consent` atualiza opt-in/opt-out de marketing.
- `POST /api/privacy/marketing-consent/request` envia codigo de confirmacao ao cliente.
- `POST /api/privacy/marketing-consent/confirm` confirma opt-in por codigo informado pelo titular.

5. Transparencia:
- Tela `Privacidade` em `/privacidade`.
- Aceite de politica de privacidade no cadastro de clientes.

6. Retencao:
- Script `npm run lgpd:retention` para anonimizar mensagens antigas e limpar logs de auditoria antigos.

## Regras ativas

1. Mensagens de marketing so podem ser enviadas quando:
- `purpose = MARKETING`
- `customerId` informado
- `marketingConsent = true`
- Opt-in inicial exige confirmacao ativa do titular via codigo temporario.

2. Tentativas sem consentimento retornam HTTP `403`.

## Operacao recomendada

1. Executar retencao diariamente:
- Exemplo cron: `0 3 * * * cd /Users/josejunior/Projetos/Petshop && npm run lgpd:retention`

2. Revisar pedidos de titular:
- Exportar via `GET /api/privacy/customers/[id]`
- Anonimizar via `DELETE /api/privacy/customers/[id]`

3. Monitorar auditoria:
- Consultar tabela `AuditLog` para rastrear acoes sensiveis.

## Pontos juridicos que exigem validacao com advogado

1. Prazos exatos de retencao por tipo documental.
2. Texto final da politica de privacidade e base legal por operacao.
3. Clausulas contratuais controlador-operador e suboperadores.
