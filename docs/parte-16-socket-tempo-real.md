# Parte 16 - Socket em Tempo Real

## Objetivo

Preparar a base de atualizacao em tempo real entre backend e frontend.

## Estrutura implementada

* servidor Socket.IO em `backend/src/sockets/index.js`
* inicializacao no `backend/src/server.js`
* cliente Socket.IO em `frontend/src/socket/socketClient.js`
* contexto em `frontend/src/contexts/SocketContext.jsx`
* assinatura central de eventos em `frontend/src/hooks/useRealtimeRefresh.js`

## Eventos emitidos

* `atendimento:criado`
* `fila:atualizada`
* `atendimento:assumido`
* `mecanico:atualizado`
* `atendimento:status_alterado`
* `atendimento:retornado_fila`
* `atendimento:servico_concluido`
* `atendimento:pagamento_confirmado`
* `atendimento:liberado_retirada`
* `atendimento:retirada_confirmada`
* `atendimento:finalizado`
* `atendimento:cancelado`

## Observacao

Nesta etapa foi entregue a infraestrutura de emissao e escuta. A validacao funcional completa depende de eventos reais produzidos com banco conectado e usuarios autenticados.

## Testes executados

### Sucesso

* backend inicializado com Socket.IO habilitado
* frontend compilado com cliente Socket.IO e hooks ativos

## Comandos

```bash
cd backend
npm run start

cd ../frontend
npm run dev
```
