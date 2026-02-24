# Estado do Desenvolvimento - PetShop SaaS

Atualizado em: 2026-02-12

## Status geral
- Projeto Next.js + Prisma funcionando localmente.
- Dashboard com métricas dinâmicas do banco.
- Cards do dashboard clicáveis, com expansão e detalhes no próprio card.
- Seed com dados fictícios de demonstração.
- Ações rápidas no topo para cadastro: `Novo agendamento`, `Novo produto`, `Nova campanha`.
- Formulários funcionais nas páginas `Agenda`, `Estoque` e `Promoções` (POST nas APIs).

## Funcionalidades implementadas
- APIs base:
  - `GET/POST /api/customers`
  - `GET/POST /api/pets`
  - `GET/POST /api/appointments`
  - `GET/POST /api/products`
  - `GET/POST /api/campaigns`
  - `GET/POST /api/messages`
  - `GET/POST /api/services` (adicionada)
  - `GET /api/dashboard` (métricas + listas detalhadas)
- Dashboard:
  - Agendamentos hoje
  - Confirmações pendentes
  - SMS enviados (24h)
  - Produtos com estoque baixo
  - Campanhas ativas
  - Clique no card expande e mostra itens reais
- Seed:
  - Clientes, pets, serviços, agendamentos, produtos, campanhas, mensagens
  - Execução idempotente para dados de demo

## Automação de execução (ícone desktop)
- Launcher configurado para abrir sem terminal.
- Arquivos:
  - `scripts/start-petshop.sh`
  - `scripts/auto-stop-petshop.sh`
- Comportamento:
  - sobe servidor em background
  - abre navegador
  - standby automático após 15 minutos sem conexões ativas
  - auto-recuperação quando servidor trava (mata processo preso + limpa `.next` + retry)

## Ajustes técnicos importantes
- `package.json` dev script: `NEXT_DISABLE_WEBPACK_CACHE=1 next dev`
- Corrigido seed que falhava por `upsert` com campo não-único.
- Tipagem de rotas no header ajustada para typed routes.

## Próximos passos sugeridos
1. Autenticação e perfis (`admin`, `atendente`, `tosador`).
2. Melhorias de UX dos formulários (validação, máscaras, mensagens).
3. Scheduler de lembretes automáticos (24h/2h).
4. Integração SMS real (Twilio/Zenvia).
