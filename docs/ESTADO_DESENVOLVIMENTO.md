# Estado do Desenvolvimento - PetShop SaaS

Atualizado em: 2026-02-24

## Status geral
- Projeto Next.js + Prisma funcionando localmente.
- Dashboard com métricas dinâmicas do banco.
- Home redesenhada em modelo operacional por blocos (`Cadastros`, `Movimentações`, `Relatórios`).
- Seed com dados fictícios de demonstração.
- Ações rápidas no topo reorganizadas em linha única.
- Formulários funcionais nas páginas `Agenda`, `Cadastro`, `Serviços`, `Estoque` e `Promoções`.

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
  - `GET /api/reports` (indicadores operacionais e financeiros)
- Dashboard:
  - Blocos de acesso rápido por domínio
  - Indicadores rápidos consolidados
- Relatórios:
  - Página hub: `/relatorios`
  - Página operacional: `/relatorios/operacional`
  - Página financeira: `/relatorios/financeiro`
- Agenda:
  - `Novo agendamento` separado de `Novo cadastro`
  - Serviço escolhido por lista clicável predefinida
- Cadastro:
  - Tela dedicada para cliente e pet
- Serviços:
  - Tela dedicada para cadastro e listagem de serviços predefinidos
- Estoque (novo produto):
  - Preço em reais (`R$`) com conversão interna para centavos
  - Campo de descrição breve persistido em banco (`Product.description`)
  - Campo de foto com seletor customizado e pré-visualização
  - Layout com foto à esquerda e formulário à direita
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
- Banco local sincronizado com novo campo `description` em `Product` via `prisma db push`.

## Próximos passos sugeridos
1. Persistência real da imagem de produto (upload + URL no banco).
2. Separar módulo de movimentação de estoque (entrada/saída/ajuste) do cadastro de produto.
3. Autenticação e perfis (`admin`, `atendente`, `tosador`).
4. Integração SMS real (Twilio/Zenvia) e automação de lembretes em scheduler.
