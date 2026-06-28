# Parte 17 - Painel Interno da Oficina

## Objetivo

Criar um painel visual para TV ou monitor interno da oficina.

## Entregas

* endpoint publico `GET /api/paineis/oficina`
* tela `frontend/src/pages/PainelOficinaPage.jsx`
* rota `/painel/oficina`

## Conteudo exibido

* fila de entrada
* motos em servico
* area `PODE RETIRAR`
* ultimos 5 finalizados

## Regras aplicadas

* sem botoes
* atualizacao automatica via socket
* leitura ampliada para monitor
* sem CPF
* sem telefone
* sem valores
* pagamento destacado apenas quando operacionalmente relevante

## Testes executados

* `npm run build` no frontend
* `npm run lint` no frontend
* teste automatizado do `painelService`
