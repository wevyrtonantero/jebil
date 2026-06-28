# Jebil Motos Preparacoes

Base inicial do sistema de fluxo de oficina da Jebil Motos Preparacoes.

## Estrutura

```text
jebil/
  backend/
  frontend/
  docs/
  scripts/
  .gitignore
  README.md
```

## Primeiros comandos

### Back-end

```bash
cd backend
copy .env.example .env
npm install
npm test
npm run dev
```

### Front-end

```bash
cd frontend
copy .env.example .env
npm install
npm run lint
npm run build
npm run dev
```

## Variaveis de ambiente

### `backend/.env`

Use `backend/.env.example` como base. Para as partes ja implementadas, os campos principais sao:

* `PORT`
* `FRONTEND_URL`
* `UPLOAD_BASE_URL`
* `UPLOAD_DIR`
* `JWT_SECRET`
* `JWT_EXPIRES_IN`
* `DB_HOST`
* `DB_PORT`
* `DB_NAME`
* `DB_USER`
* `DB_PASSWORD`

### `frontend/.env`

Use `frontend/.env.example` como base:

* `VITE_API_URL=http://localhost:3333/api`
* `VITE_SOCKET_URL=http://localhost:3333`

## Telas disponiveis

* App autenticado: `/dashboard`, `/clientes`, `/motocicletas`, `/mecanicos`, `/recepcao`, `/atendimentos`, `/oficina`, `/relatorios`
* Painel interno: `/painel/oficina`
* Painel de clientes: `/painel/clientes`

## Documentacao

* `parte-01-arquitetura-e-regras.md`
* `docs/parte-02-preparacao-projeto.md`
* `docs/parte-03-banco-mysql.md`
* `docs/parte-04-backend-autenticacao.md`
* `docs/parte-05-crud-clientes.md`
* `docs/parte-06-crud-motocicletas.md`
* `docs/parte-07-crud-mecanicos.md`
* `docs/parte-08-atendimentos-fila.md`
* `docs/parte-09-fluxo-oficina.md`
* `docs/parte-10-pagamento-retirada.md`
* `docs/parte-11-cancelamento-historico.md`
* `docs/parte-12-base-frontend.md`
* `docs/parte-13-telas-cadastros.md`
* `docs/parte-14-tela-recepcao.md`
* `docs/parte-15-tela-oficina.md`
* `docs/parte-16-socket-tempo-real.md`
* `docs/parte-17-painel-interno.md`
* `docs/parte-18-painel-clientes.md`
* `docs/parte-19-relatorio-simples.md`
* `docs/parte-20-testes-integrados.md`
* `docs/parte-21-preparacao-vps.md`
* `docs/parte-22-implantacao-validacao-final.md`
* `docs/manual-recepcao.md`
* `docs/manual-oficina.md`
* `docs/manual-administrador.md`
