# Estado do Desenvolvimento - PetShop SaaS

Atualizado em: 2026-02-25

## Status geral
- Projeto funcional em Next.js + Prisma.
- Fluxo principal consolidado: `Agenda`, `Cadastro`, `Serviços`, `Produtos`, `Estoque`, `Campanhas`, `Relatórios`.
- Layout da agenda passou por grande refino de UX.
- Seeds para cenários de teste (`small`, `demo`, `large`) disponíveis.

## Destaques técnicos mais recentes
- Agenda:
  - barra de ações com layout alinhado e responsivo
  - pesquisa por pet/dono
  - visualização de calendário em modos `Diário`, `Semanal`, `Mensal`
  - serviço no novo agendamento em `dropdown`
  - data, início e fim em `dropdown`
  - fim preenchido automaticamente com base na duração do serviço
  - validação de conflito de horário na API (sobreposição por pet)
  - datas de agendamento limitadas para presente/futuro no formulário
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
- Em alguns contextos, `next dev` apresentou travamento em `Compiling / ...`.
- Arquivos adicionados para padronizar runtime:
  - `.nvmrc` (`20`)
  - `engines.node` em `package.json` (`>=20 <23`)

## Próximo passo (amanhã)
1. Continuar refinando UX da agenda conforme feedback visual em tempo real.
2. Implementar ações rápidas no calendário (`Confirmar`, `Concluir`, `Cancelar`) se aprovado.
