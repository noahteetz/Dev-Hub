# Dev Hub

Small full-stack starter with a React/Vite frontend and a Spring Boot backend.

## Requirements

- Node.js 22+
- Java 25+
- Docker Desktop or Rancher Desktop for containers

## Local development

```powershell
npm run setup
npm run dev
```

The frontend is available at `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:8080`. The command starts PostgreSQL in Docker and waits for it before starting the backend. The database is exposed at `localhost:5432` with default local credentials `devhub` / `devhub` and database name `devhub`.

Override the local database credentials by creating a `.env` file from `.env.example` before starting Docker.

## Build

```powershell
npm run build
```

## Containers

```powershell
npm run up
```

Open `http://localhost:5173`. Stop the stack with `npm run down`.