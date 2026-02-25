# Histórico do Chat

Atualizado em: 2026-02-25

## Sessão 2026-02-25
- Separação de fluxos: `Novo cadastro` saiu de `Novo agendamento` e virou tela própria.
- Criação da tela `Serviços` para manter lista predefinida de serviços.
- Ajustes no `Novo agendamento` para escolher serviço por lista clicável.
- Redesenho da home em blocos operacionais (`Cadastros`, `Movimentações`, `Relatórios`).
- Criação de relatórios gerenciais com foco operacional e financeiro:
  - `/relatorios/operacional`
  - `/relatorios/financeiro`
- Conversão de campos de preço da UI para `R$` (com conversão interna para centavos).
- Várias iterações de UX no `Novo produto`:
  - campo de foto + pré-visualização
  - campo de descrição breve
  - reorganização de layout (foto e campos)
  - alinhamento fino de botão `Salvar produto` e campo de foto.
- Configuração de checkpoints automáticos a cada 2 horas via `crontab`.

## Como manter este arquivo
- Registrar novos pedidos/decisões importantes em ordem cronológica.
- Evitar texto longo por entrada; priorizar decisão tomada e resultado.
- Manter junto com `docs/ESTADO_CONVERSA.md` para retomada rápida.
