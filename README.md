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
- `/api/projects/{projectId}/ideas`
- `/api/projects/{projectId}/todos`
- `/api/tags`

Projects can store a repository URL, deployment URL, and any number of named external links. Ideas and todos support globally reusable tags. Convert an idea into a todo with `POST /api/projects/{projectId}/ideas/{ideaId}/convert`; the idea stays visible as converted history. Mark a todo open or completed with `PATCH /api/projects/{projectId}/todos/{todoId}/completion` and a JSON body such as `{ "completed": true }`.

Each resource supports `POST`, `GET`, `PUT`, and `DELETE` where applicable. Code snippets also accept the shorter `/snippets` path. Deleting a project removes all of its notes, snippets, ideas, todos, and links.

## Organizing work

Use the Ideas tab to collect possibilities without turning them into commitments. Add tags such as `backend`, `release`, or `research` while creating or editing ideas and todos; the same tag is suggested across projects and can be used to filter either tab. When an idea becomes actionable, convert it to create an open todo with the idea's title, details, and tags. Completed todos stay visible and can be reopened.

## Build

```powershell
npm run build
```

## Containers

```powershell
npm run up
```

Open `http://localhost:5173`. Stop the stack with `npm run down`.