# Parte 18 - Painel para Clientes

## Objetivo

Criar o painel publico simplificado da area de clientes.

## Entregas

* endpoint publico `GET /api/paineis/clientes`
* tela `frontend/src/pages/PainelClientesPage.jsx`
* rota `/painel/clientes`

## Conteudo exibido

* fila simplificada
* motos em andamento
* area `Pode retirar`
* ultimos 3 finalizados

## Regras aplicadas

* sem botoes
* atualizacao automatica
* sem CPF
* sem telefone
* sem pagamento
* sem observacoes internas

## Testes executados

* teste HTTP garantindo ausencia de dados sensiveis
* `npm run build`
* `npm run lint`
