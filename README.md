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

## Backend API

The backend exposes CRUD endpoints for projects and their stored information:

- `/api/projects`
- `/api/projects/{projectId}/notes`
- `/api/projects/{projectId}/code-snippets`

Each resource supports `POST`, `GET`, `PUT`, and `DELETE` where applicable. Code snippets also accept the shorter `/snippets` path. Deleting a project removes its notes and code snippets.

## Build

```powershell
npm run build
```

## Containers

```powershell
npm run up
```

Open `http://localhost:5173`. Stop the stack with `npm run down`.