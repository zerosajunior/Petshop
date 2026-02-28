# Estado do Desenvolvimento - PetShop SaaS

Atualizado em: 2026-02-27

## Status geral
- Projeto funcional em Next.js + Prisma.
- Fluxo principal consolidado: `Agenda`, `Cadastro`, `Serviços`, `Produtos`, `Estoque`, `Campanhas`, `Relatórios`.
- Layout da agenda passou por grande refino de UX.
- Seeds para cenários de teste (`small`, `demo`, `large`) disponíveis.

## Destaques técnicos mais recentes
- Agenda:
  - barra de ações (toolbar) com layout fluido e responsivo
  - pesquisa por pet/dono
  - visualização de calendário em modos `Diário`, `Semanal`, `Mensal`
  - serviço no novo agendamento em `dropdown`
  - data, início e fim em `dropdown`
  - fim preenchido automaticamente com base na duração do serviço
  - validação de conflito de horário na API (sobreposição por pet)
  - datas de agendamento limitadas para presente/futuro no formulário
  - ações rápidas por card de agendamento: `Confirmar`, `Concluir`, `Cancelar`
  - status com badge visual (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELED`)
  - formulário de novo agendamento oculto por padrão e acionado por botão `Novo agendamento`
  - endpoint `PATCH /api/appointments/[id]` para atualização de status com regra de transição
- LGPD:
  - base de consentimento/privacidade implementada
  - endpoints de privacidade e trilha de auditoria
  - documentação técnica e passo a passo em `docs/`
- Produtos:
  - múltiplas fotos por produto (preview e navegação)
- Padronização visual:
  - barras de ação (`appActionBar`) aplicadas nas telas principais

## Seeds disponíveis
- `npm run prisma:seed:small` (dataset reduzido)
- `npm run prisma:seed:demo` (5 agendamentos/dia, dias passados e futuros, produtos com 3 fotos)
- `npm run prisma:seed:large` (dataset volumoso)

## Estabilidade de ambiente
- Em alguns contextos, `next dev` apresentou travamento em `Compiling / ...` e corrupção de chunks em `.next`.
- Arquivos adicionados para padronizar runtime:
  - `.nvmrc` (`20`)
  - `engines.node` em `package.json` (`>=20 <23`)
- Hardening aplicado:
  - `npm run dev` agora usa inicialização resiliente
  - `npm run dev:raw` para modo direto sem automação
  - script de auto-heal para reinício automático quando detectar erro de chunks (`MODULE_NOT_FOUND`, `/_next/static ... 500`)

## Próximo passo (amanhã)
1. Validar comportamento da barra de ações em diferentes larguras de tela com dados reais.
2. Monitorar logs do auto-heal por alguns ciclos para confirmar estabilidade operacional.
