# Parte 12 - Base do Frontend

## Objetivo

Criar a base navegavel do frontend com autenticacao, layout e integracao HTTP.

## Estrutura implementada

* `axios` centralizado em `frontend/src/api/axios.js`
* contexto de autenticacao em `frontend/src/contexts/AuthContext.jsx`
* persistencia de token em `frontend/src/utils/storage.js`
* layout com menu lateral em `frontend/src/layouts/AppLayout.jsx`
* rotas protegidas e por perfil
* cliente Socket.IO base

## Rotas do frontend

* `/login`
* `/dashboard`
* `/clientes`
* `/motocicletas`
* `/mecanicos`
* `/recepcao`
* `/oficina`
* `/atendimentos`
* `/acesso-negado`

## Regras implementadas

* token enviado automaticamente no header `Authorization`
* sessao restaurada por `/api/auth/me`
* controle de acesso por perfil no roteamento
* socket conectado apenas com usuario autenticado

## Testes executados

### Sucesso

* `npm run build` aprovado
* `npm run lint` aprovado
* servidor Vite respondendo HTTP 200 em `http://127.0.0.1:4173`

## Comandos

```bash
cd frontend
npm install
npm run lint
npm run build
npm run dev
```
