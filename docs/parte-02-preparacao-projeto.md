# Parte 02 - Preparacao do Projeto

## Objetivo

Criar a estrutura inicial do projeto sem implementar regras funcionais de negocio.

## Estrutura criada

```text
jebil/
  backend/
    src/
      config/
      controllers/
      database/
      middlewares/
      repositories/
      routes/
      services/
      sockets/
      utils/
      validators/
      app.js
      server.js
    tests/
    uploads/
    .env.example
    package.json
    README.md
  frontend/
    src/
      api/
      components/
      contexts/
      hooks/
      layouts/
      pages/
      routes/
      services/
      socket/
      styles/
      utils/
      App.jsx
      main.jsx
    .env.example
    package.json
    README.md
  docs/
    parte-02-preparacao-projeto.md
  scripts/
  .gitignore
  README.md
```

## Dependencias instaladas

### Back-end

* `express`
* `cors`
* `dotenv`
* `nodemon`

### Front-end

* `react`
* `react-dom`
* `vite`
* `axios`
* `react-router-dom`
* `socket.io-client`

## Implementacao realizada

### Back-end

* configuracao inicial com Express;
* leitura de variaveis por `.env`;
* rota `GET /api/health`;
* middleware inicial para `404`;
* middleware centralizado de erro;
* scripts `dev` e `start`.

Resposta esperada da rota de saude:

```json
{
  "status": "ok",
  "service": "jebil-backend"
}
```

### Front-end

* projeto React com Vite;
* rota inicial `/`;
* configuracao de Axios com `VITE_API_URL`;
* pagina temporaria exibindo o estado do backend;
* tema visual provisorio, sem layout final do sistema.

## Variaveis de ambiente

### Back-end

Arquivo: `backend/.env`

```env
PORT=3333
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Front-end

Arquivo: `frontend/.env`

```env
VITE_API_URL=http://localhost:3333/api
```

## Comandos para executar

### Back-end

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

### Front-end

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

## Testes executados

### Testes tecnicos previstos

* back-end inicia sem erro;
* front-end inicia sem erro;
* front-end consulta `/api/health`;
* variaveis de ambiente sao carregadas;
* nenhuma credencial foi gravada no codigo.

### Resultado

Resultados reais executados nesta parte:

* `GET http://127.0.0.1:3333/api/health` retornou `{"status":"ok","service":"jebil-backend"}`;
* `GET http://127.0.0.1:5173/` respondeu com status `200`;
* `npm run build` no front-end concluiu com sucesso;
* os arquivos `.env` locais foram carregados a partir de `.env.example`;
* nenhuma credencial fixa foi adicionada ao codigo.

## Comandos usados na validacao

```bash
cd backend
copy .env.example .env
npm run start
```

```bash
cd frontend
copy .env.example .env
npm run dev -- --host 127.0.0.1 --port 5173
```

```bash
curl http://127.0.0.1:3333/api/health
curl http://127.0.0.1:5173/
cd frontend && npm run build
```

## Escopo explicitamente nao implementado

* banco de dados;
* login;
* CRUDs;
* fila;
* Socket.io funcional;
* layout definitivo.
