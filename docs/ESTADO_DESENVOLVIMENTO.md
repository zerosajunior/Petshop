# Estado do Desenvolvimento - PetShop SaaS

Atualizado em: 2026-03-21

## Status geral
- Projeto funcional em Next.js + Prisma.
- Fluxo principal consolidado: `Agenda`, `Cadastro`, `ServiÃ§os`, `Produtos`, `Estoque`, `Campanhas`, `RelatÃ³rios`.
- Layout da agenda passou por grande refino de UX.
- Seeds para cenÃ¡rios de teste (`small`, `demo`, `large`) disponÃ­veis.

## Destaques tÃ©cnicos mais recentes
- Agenda:
  - barra de aÃ§Ãµes (toolbar) com layout fluido e responsivo
  - pesquisa por pet/dono
  - visualizaÃ§Ã£o de calendÃ¡rio em modos `DiÃ¡rio`, `Semanal`, `Mensal`
  - serviÃ§o no novo agendamento em `dropdown`
  - data, inÃ­cio e fim em `dropdown`
  - fim preenchido automaticamente com base na duraÃ§Ã£o do serviÃ§o
  - validaÃ§Ã£o de conflito de horÃ¡rio na API (sobreposiÃ§Ã£o por pet)
  - datas de agendamento limitadas para presente/futuro no formulÃ¡rio
  - aÃ§Ãµes rÃ¡pidas por card de agendamento: `Confirmar`, `Concluir`, `Cancelar`
  - status com badge visual (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELED`)
  - formulÃ¡rio de novo agendamento oculto por padrÃ£o e acionado por botÃ£o `Novo agendamento`
  - endpoint `PATCH /api/appointments/[id]` para atualizaÃ§Ã£o de status com regra de transiÃ§Ã£o
- LGPD:
  - base de consentimento/privacidade implementada
  - endpoints de privacidade e trilha de auditoria
  - documentaÃ§Ã£o tÃ©cnica e passo a passo em `docs/`
- Produtos:
  - mÃºltiplas fotos por produto (preview e navegaÃ§Ã£o)
- PadronizaÃ§Ã£o visual:
  - barras de aÃ§Ã£o (`appActionBar`) aplicadas nas telas principais

## Seeds disponÃ­veis
- `npm run prisma:seed:small` (dataset reduzido)
- `npm run prisma:seed:demo` (5 agendamentos/dia, dias passados e futuros, produtos com 3 fotos)
- `npm run prisma:seed:large` (dataset volumoso)

## Estabilidade de ambiente
- Em alguns contextos, `next dev` apresentou travamento em `Compiling / ...` e corrupÃ§Ã£o de chunks em `.next`.
- Arquivos adicionados para padronizar runtime:
  - `.nvmrc` (`20`)
  - `engines.node` em `package.json` (`>=20 <23`)
- Hardening aplicado:
  - `npm run dev` agora usa inicializaÃ§Ã£o resiliente multiplataforma
  - `npm run dev:raw` para modo direto sem automaÃ§Ã£o, tambÃ©m multiplataforma
  - scripts de inicializaÃ§Ã£o e auto-heal migrados para Node.js, removendo dependÃªncia de `zsh`, `lsof` e caminhos fixos de macOS
  - script de auto-heal para reinÃ­cio automÃ¡tico quando detectar erro de chunks (`MODULE_NOT_FOUND`, `/_next/static ... 500`)

## PrÃ³ximos passos
1. Validar `npm run dev`, `npm run lint` e `npm run build` no Windows com Node.js `20.x` disponÃ­vel no `PATH`.
2. Validar comportamento da barra de aÃ§Ãµes em diferentes larguras de tela com dados reais.
3. Monitorar logs do auto-heal por alguns ciclos para confirmar estabilidade operacional em sessÃ£o local persistente.

## Mitigacao temporaria de seguranca (Prisma)
- Data: 2026-03-21
- Contexto: `npm audit --omit=dev` sinalizava vulnerabilidade transitiva em `effect` via `prisma`/`@prisma/config`.
- Acao aplicada: override no `package.json` para `"effect": "3.21.0"`.
- Validacao: `npm audit --omit=dev` retornando 0 vulnerabilidades, com `npm run test` e `npm run build` aprovados.
- Saida planejada: remover override quando versao estavel do Prisma incorporar a correcao sem workaround.
