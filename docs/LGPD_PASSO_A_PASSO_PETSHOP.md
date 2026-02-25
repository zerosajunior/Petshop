# LGPD no PetShop SaaS: passo a passo detalhado

Este roteiro organiza a adequacao a LGPD no sistema, com foco em dados de clientes, pets, contatos e usuarios internos.

Aviso: este material e operacional/tcnico e nao substitui orientacao juridica formal.

## 1) Definir papeis e escopo (Dia 1)

Objetivo: deixar claro quem decide e quem executa o tratamento.

1. Defina no contrato e no sistema:
- Plataforma PetShop SaaS = `operador` (em regra).
- Pet shop cliente da plataforma = `controlador`.
2. Nomeie um responsavel interno por privacidade (mesmo sem DPO formal).
3. Liste ambientes onde ha dados pessoais:
- Banco de dados principal.
- Backups.
- Logs.
- Uploads (fotos de produto e possiveis anexos futuros).

Entregavel:
- Documento curto `Matriz de papeis (Controlador x Operador)`.

## 2) Inventariar dados e justificar finalidade (Dia 1-2)

Objetivo: coletar apenas o necessario.

1. Mapeie cada campo atual do sistema:
- Cliente: nome, telefone, e-mail, canal preferido.
- Pet: nome, tipo e vinculo com cliente.
- Agendamento: cliente/pet/servico/data.
- Produto: dados de estoque e fotos.
2. Para cada campo, preencha:
- Finalidade.
- Base legal.
- Retencao.
- Quem acessa.
3. Elimine campo sem necessidade clara.

Entregavel:
- Planilha `Inventario de dados pessoais`.

## 3) Base legal por fluxo (Dia 2)

Objetivo: evitar dependencia de consentimento quando nao necessario.

Regra pratica recomendada para o seu caso:
1. Cadastro e agendamento: `execucao de contrato` e `procedimentos preliminares`.
2. Contato de suporte e cobranca: `legitimo interesse` ou `execucao de contrato` (avaliar caso).
3. Marketing (campanhas SMS/WhatsApp/email): `consentimento` com opt-in e opt-out.
4. Obrigacoes fiscais/contabeis: `cumprimento de obrigacao legal`.

Entregavel:
- Tabela `Fluxo x Base legal`.

## 4) Transparencia com o titular (Dia 2-3)

Objetivo: informar com clareza antes do uso dos dados.

1. Criar/atualizar Politica de Privacidade com:
- Quais dados coletamos.
- Para que usamos.
- Com quem compartilhamos.
- Prazo de retencao.
- Direitos do titular e canal de atendimento.
2. Adicionar aviso curto nas telas de cadastro.
3. Incluir checkbox de consentimento apenas onde for marketing.

Entregavel:
- `Politica de Privacidade` publicada.
- Texto de aviso em formulos de cadastro.

## 5) Direitos do titular (Dia 3-4)

Objetivo: conseguir responder requisicoes da LGPD sem improviso.

Implemente um fluxo interno para pedidos de:
1. Confirmacao e acesso.
2. Correcao.
3. Anonimizacao, bloqueio ou eliminacao (quando cabivel).
4. Portabilidade (quando tecnicamente viavel).
5. Revogacao de consentimento (marketing).

Padrao operacional:
- Abrir ticket.
- Validar identidade do solicitante.
- Responder dentro do prazo interno definido.
- Guardar evidencia da resposta.

Entregavel:
- Procedimento `Atendimento ao titular`.

## 6) Retencao e descarte (Dia 4)

Objetivo: nao manter dado pessoal indefinidamente.

1. Defina prazos por tipo de dado:
- Cadastro ativo.
- Cadastro inativo.
- Logs tecnicos.
- Backups.
2. Configure rotina de exclusao/anonimizacao periodica.
3. Documente excecoes por obrigacao legal.

Entregavel:
- `Politica de retencao e descarte`.

## 7) Seguranca minima obrigatoria (Semana 2)

Objetivo: reduzir risco de vazamento e acesso indevido.

Checklist tecnico minimo:
1. Criptografia em transito (HTTPS) e segredo forte em ambiente.
2. Controle de acesso por perfil (principio do menor privilegio).
3. Senhas com hash forte (ex.: Argon2/bcrypt), nunca texto puro.
4. Logs de auditoria para acoes sensiveis (login, alteracao de cadastro, exclusoes).
5. Backup com teste de restauracao.
6. Atualizacao de dependencias e correcao de vulnerabilidades.
7. Limitacao de tentativas de login e sessao expirada.
8. Protecao para upload (tipo/tamanho/extensao e bloqueio de executaveis).

Entregavel:
- `Checklist de seguranca` preenchido.

## 8) Contratos e terceiros (Semana 2)

Objetivo: cobrir risco de compartilhamento de dados.

1. Revisar contratos com fornecedores (hosting, banco, mensagens, analytics).
2. Incluir clausulas de:
- Confidencialidade.
- Seguranca.
- Suboperadores.
- Incidentes.
- Delecao/retorno de dados no encerramento.
3. Revisar contrato SaaS com pet shops (controlador-operador).

Entregavel:
- Adendo contratual de protecao de dados.

## 9) Incidente de seguranca: plano pronto (Semana 2)

Objetivo: agir rapido se houver vazamento.

1. Criar playbook com etapas:
- Detectar.
- Conter.
- Preservar evidencias.
- Classificar risco.
- Comunicar.
- Corrigir causa raiz.
2. Definir quem decide comunicacao.
3. Se houver risco ou dano relevante, comunicar ANPD e titulares.
4. Registrar todos os incidentes para trilha de auditoria.

Observacao importante:
- A regulamentacao de comunicacao de incidente da ANPD (Res. CD/ANPD n 15/2024) preve 3 dias uteis para comunicacao pelo controlador, ressalvadas excecoes da norma.

Entregavel:
- `Plano de resposta a incidente`.

## 10) Governanca continua (mensal)

Objetivo: manter conformidade ao longo do tempo.

1. Rodar revisao mensal de acessos.
2. Revisar campos e formularios novos antes de publicar.
3. Treinar equipe (atendimento, operacao e dev).
4. Registrar decisoes de privacidade.
5. Fazer auditoria trimestral simples de LGPD.

Entregavel:
- Calendario de revisoes e evidencias.

---

## Prioridade pratica para o seu projeto (ordem sugerida)

1. Publicar Politica de Privacidade e aviso nas telas.
2. Definir base legal por fluxo (cadastro, agendamento, marketing).
3. Implementar opt-in/opt-out de campanhas.
4. Criar rotina de retencao e descarte.
5. Fechar plano de incidente e contrato controlador-operador.
6. Evoluir trilha de auditoria e revisao de acesso por perfil.

## Referencias oficiais (consultadas)

- LGPD (Lei n 13.709/2018 - texto compilado do Planalto):  
  https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm
- ANPD - Regulamento para agentes de pequeno porte (Res. CD/ANPD n 2/2022):  
  https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- ANPD - Comunicacao de incidente de seguranca (orientacoes e prazo):  
  https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
- ANPD - Guia de seguranca para agentes de pequeno porte:  
  https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte
