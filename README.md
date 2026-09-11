# Dev Hub

Small full-stack starter with a React/Vite frontend and a Spring Boot backend.

The product vision, planned feature set, and implementation order are documented in [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).

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

## Private repositories

Dev Hub reads public repositories without any setup. To reach private repositories and the ones in your
organizations, store a personal access token under Settings in the app.

Tokens are encrypted with AES-GCM before they reach the database, and the key comes from the environment:

```powershell
DEVHUB_ENCRYPTION_KEY=<openssl rand -base64 32>
```

Without the key the application still starts, but no token can be stored. The key belongs in `.env` next to
the database credentials, never in version control. Back it up with the database: a dump restored without it
leaves the stored tokens unreadable, and they have to be entered again.

Scopes: a classic GitHub token needs `repo` and `read:org`, a fine-grained one needs Contents and Metadata set
to read. A GitLab token needs `read_api` and `read_repository`. Two cases produce an empty list rather than an
error: a fine-grained token has to be approved per organization by an owner, and with single sign-on a classic
token has to be authorized for the organization as well.

Once a token is stored, the project dialog offers a picker instead of a URL field, and Settings can turn a
multi-selection into projects in one step.

## Backend API

The backend exposes CRUD endpoints for projects and their stored information:

- `/api/projects`
- `/api/projects/{projectId}/notes`
- `/api/projects/{projectId}/code-snippets`
- `/api/projects/{projectId}/ideas`
- `/api/projects/{projectId}/todos`
- `/api/tags`
- `/api/git-credentials` and `/api/git-credentials/{provider}` for stored provider tokens
- `/api/git-repositories`, `/api/git-repositories/owners` and `/api/git-repositories/import` for the picker

A stored token can be written and replaced but never read back: every answer carries only the account, the
scopes, and the last four characters.

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
## Notes, search, and links

Notes, ideas, snippets, and todos each have a permanent address: `/notes/{id}`, `/ideas/{id}`, `/snippets/{id}`, and `/todos/{id}`. Opening one shows the Markdown editor with a live preview, a small formatting toolbar, and autosave after a short typing pause and on leaving a field. The save state is always visible, a local draft in the browser survives a crash or a lost connection, and leaving with unsaved text asks first.

Saving sends the timestamp the editor started from as `expectedUpdatedAt`. When the server holds a newer version it answers `409` with that version in `current`, and the editor asks which text to keep instead of discarding either one.

Snippets can be inserted into a note as a fixed code block or as a live reference written `{{snippet:12}}`. A reference always renders the current snippet; a deleted snippet leaves a visible hint in the preview and never removes text.

Entries can reference each other through `/api/references`. Links show up as backlinks on the target, survive assignment, promotion, and archiving, and disappear on their own once one side is deleted.

### Search

`GET /api/search` covers projects including their working context, notes, snippets, ideas, and todos.

| Parameter | Meaning |
| --- | --- |
| `q` | Search term, at least two characters, otherwise `400` |
| `types` | Any of `PROJECT`, `NOTE`, `SNIPPET`, `IDEA`, `TODO` |
| `projectId` | Restricts the results to one project |
| `tags` | Every listed tag must be present |
| `includeArchived`, `includeCompleted` | Off by default |
| `limit`, `offset` | `limit` between 1 and 100, default 20 |

Title hits rank above content hits, newer entries above older ones. In the app, `Ctrl` + `K` opens the command palette and `/search` keeps the term and every filter in the URL.

**Limits of the current implementation.** The queries use `LOWER(column) LIKE '%term%'`, which is portable across PostgreSQL and the H2 database used in tests but cannot use a normal index for the leading wildcard. There is no stemming, no ranking by term frequency, and no support for multi-word phrases beyond a plain substring match. On a personal dataset of a few thousand entries this answers in well under 100 ms.

**Planned move to `tsvector`.** Search runs behind the `SearchRepository` interface. A PostgreSQL implementation can add a generated `tsvector` column per table plus a GIN index and replace the `LIKE` queries with `to_tsquery`, without touching the service, the controller, or the frontend. The switch becomes worthwhile as soon as word forms and ranking matter more than exact substrings.
