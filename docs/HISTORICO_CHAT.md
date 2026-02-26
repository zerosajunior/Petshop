# Histórico do Chat

Atualizado em: 2026-02-25

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

## Como manter este arquivo
- Registrar decisões e mudanças de forma cronológica.
- Sempre incluir pendências explícitas ao encerrar o dia.
