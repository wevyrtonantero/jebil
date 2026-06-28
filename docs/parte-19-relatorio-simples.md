# Parte 19 - Relatorio Simples

## Objetivo

Criar um relatorio operacional enxuto para recepcao e administracao.

## Entregas

* endpoint `GET /api/relatorios/atendimentos`
* tela `frontend/src/pages/RelatorioPage.jsx`
* rota `/relatorios`

## Filtros implementados

* `dia`
* `mes`
* `data_inicio`
* `data_fim`
* `status`
* `mecanico_id`
* `situacao_pagamento`
* `numero_os`

## Regras aplicadas

* acesso apenas para `ADMIN` e `RECEPCAO`
* filtros por periodo baseados em `entrada_em`
* sem calculos de produtividade
* perfil `OFICINA` bloqueado

## Testes executados

* teste HTTP de permissao
* teste de service para filtro mensal
* `npm run build`
* `npm run lint`
