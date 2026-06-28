# Parte 09 - Fluxo da Oficina

## Objetivo

Implementar o ciclo operacional do atendimento dentro da oficina.

## Rotas implementadas

* `PATCH /api/atendimentos/:id/status`
* `PATCH /api/atendimentos/:id/retornar-fila`
* `PATCH /api/atendimentos/:id/concluir-servico`

## Regras implementadas

* atendimento assumido entra em `EM_SERVICO`
* transicoes operacionais controladas por regra central
* suporte aos status `EM_SERVICO`, `AGUARDANDO_PECAS` e `SAIDA_PARA_TESTE`
* apenas atendimentos ativos podem trocar de status operacional
* retorno para fila remove o mecanico atual
* conclusao do servico grava data de conclusao
* ao concluir, o sistema informa se a retirada ja pode ser liberada

## Estrutura adicionada

* `backend/src/utils/statusRules.js`
* `frontend/src/pages/OficinaAdminPage.jsx`

## Testes executados

### Sucesso

* build do frontend aprovado com a tela da oficina
* lint do frontend aprovado
* suite do backend aprovada

### Limitacao atual

As validacoes finais de transicao exigem base MySQL populada com atendimentos reais.

## Comandos

```bash
cd frontend
npm run lint
npm run build
```
