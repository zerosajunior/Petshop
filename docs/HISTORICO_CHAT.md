# Histórico do Chat

Atualizado em: 2026-02-27

## Sessão 2026-02-25 (noite)
- Continuidade do refino visual em todo o sistema, com foco principal em `Agendamentos`.
- Blocos e botões da agenda reorganizados múltiplas vezes conforme feedback visual.
- Implementado calendário com modos `Diário`, `Semanal`, `Mensal`.
- Pesquisa por pet/dono adicionada no topo da agenda.
- Novo agendamento evoluiu para seleção guiada:
  - serviço em dropdown
  - data e horários em seleção controlada
  - fim automático pela duração do serviço, com edição manual permitida
- API de agendamentos recebeu validação de conflito de horários por pet.
- Seed demo criado e executado para cenário realista:
  - 5 agendamentos por dia em dias passados/presente/futuros
  - produtos com múltiplas fotos
- Solicitado e registrado checkpoint de estado para retomada amanhã.

## Sessão 2026-02-27 (retomada)
- Retomada a partir do último checkpoint de projeto.
- Implementadas ações rápidas no calendário de agendamentos:
  - `Confirmar`, `Concluir`, `Cancelar`
  - badges visuais de status (`Agendado`, `Confirmado`, `Concluído`, `Cancelado`)
- Criado endpoint de atualização de status de agendamento com validações de transição e auditoria.
- Formulário de novo agendamento passou a ficar oculto por padrão:
  - exibição somente ao clicar em `Novo agendamento` na barra superior.
- Ajustado layout da barra de ações para evitar extrapolação horizontal de botões.
- Investigado e corrigido cenário de `Internal Server Error` no `dev`:
  - erro recorrente de chunks ausentes em `.next` (`Cannot find module './638.js'` etc.).
- Implementado mecanismo de auto-recuperação de ambiente:
  - `scripts/auto-heal-next.sh`
  - `npm run dev` tornou-se modo resiliente
  - `npm run dev:raw` mantido como modo direto.

## Como manter este arquivo
- Registrar decisões e mudanças de forma cronológica.
- Sempre incluir pendências explícitas ao encerrar o dia.
