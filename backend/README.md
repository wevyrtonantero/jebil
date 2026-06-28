# Jebil Backend

Base inicial do back-end e banco da Jebil.

## Comandos

```bash
npm install
copy .env.example .env
npm run dev
```

## Endpoint inicial

* `GET /api/health`

## Rotas ja preparadas

### Autenticacao

* `POST /api/auth/login`
* `GET /api/auth/me`
* `POST /api/auth/logout`

### Clientes

* `GET /api/clientes`
* `GET /api/clientes/:id`
* `POST /api/clientes`
* `PUT /api/clientes/:id`
* `PATCH /api/clientes/:id/status`
* `PATCH /api/clientes/:id/reativar`

### Motocicletas

* `GET /api/motocicletas`
* `GET /api/motocicletas/:id`
* `GET /api/clientes/:clienteId/motocicletas`
* `POST /api/motocicletas`
* `PUT /api/motocicletas/:id`
* `PATCH /api/motocicletas/:id/status`
* `PATCH /api/motocicletas/:id/reativar`

## Banco de dados

### Variaveis necessarias

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=jebil
DB_USER=root
DB_PASSWORD=
```

### Comandos

```bash
npm run db:create
npm run db:migrate
npm run db:seed
npm run db:migrate:rollback
```
