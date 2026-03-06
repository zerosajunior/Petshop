# Backup de conversa e decisões - 06/03/2026

## Contexto
Ajustes de UX/UI na página de agendamento (finalizada anteriormente) e, principalmente, evolução da página de produtos/estoque e da home.

## Decisões principais
- Manter fluxo de produtos com foco em cards compactos.
- Remover paginação visual de produtos e usar lista contínua.
- Excluir produto como soft delete (remove da lista ativa, sem apagar do banco).
- Trocar foco de “arquivados” para “excluídos”.
- Em lista de excluídos:
  - card em vermelho,
  - ação única de restaurar,
  - sem botões de editar/excluir enquanto estiver excluído.
- Ações dos cards em estilo de pontos/círculos coloridos.
- Toolbox de produtos abaixo do bloco de avisos de estoque baixo.
- Lista de produtos limitada visualmente (aprox. 5 cards) com rolagem interna.
- Aplicar estética de cards estilo “categorias de produtos” também na tela inicial.

## Alterações técnicas feitas
- `app/estoque/page.tsx`
  - Ajustes de layout dos painéis.
  - Toggle para mostrar ativos/excluídos.
  - Ações por card para editar/excluir/restaurar.
  - Remoção da paginação anterior.
  - Área rolável da lista de produtos.
- `app/globals.css`
  - Estilos de card excluído (vermelho) e tags.
  - Estilos das ações por pontos.
  - Estilo de grid rolável para os cards de produtos.
- `app/api/products/route.ts`
  - Filtro por `status=active|deleted|all` para listagem.
- `app/page.tsx`
  - Home com blocos no mesmo padrão de cards visuais.
- `scripts/auto-heal-next.sh`
  - Ajuste no detector para evitar falso positivo por 404 genérico em assets estáticos.

## Observações
- O problema de “tela sem CSS” ocorreu por instabilidade/restart em dev com assets `_next/static` inconsistentes.
- Build e lint foram validados durante os ajustes.

## Próximos passos sugeridos
- Opcional: padronizar nomenclatura de API de `archived` para `deleted` (mantendo compatibilidade).
- Opcional: restringir endpoint `DELETE` físico se a política final for apenas soft delete.
