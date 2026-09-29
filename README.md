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

## Signing in

The deployed app is behind Keycloak. The browser performs an authorization code
login with PKCE against the `dev-hub` realm and sends the resulting access token
with every API call; the backend validates the signature, the issuer, the
audience and the realm role `devhub-user` before it answers. There is no session
on the server and no cookie to steal.

The frontend image carries no realm settings. It asks the backend for them at
`/api/auth/config`, the only endpoint besides the health probe that answers
without a token, so the same image works in every environment.

| Variable | Meaning |
| --- | --- |
| `DEVHUB_AUTH_ENABLED` | `false` opens the API completely. Local development only |
| `DEVHUB_AUTH_ISSUER_URI` | Public realm URL, exactly as it appears in the token's `iss` |
| `DEVHUB_AUTH_JWK_SET_URI` | Where the signing keys are fetched, container to container in production |
| `DEVHUB_AUTH_CLIENT_ID` | The public client the browser logs in with |
| `DEVHUB_AUTH_AUDIENCE` | Required `aud` entry. Empty turns the check off |
| `DEVHUB_AUTH_REQUIRED_ROLE` | Realm role a token must carry. Empty admits any account in the realm |

Local development runs with `DEVHUB_AUTH_ENABLED=false`, so `npm run dev` needs
no identity provider. Set it to `true` and fill in the realm to exercise the
real login; the `dev-hub-frontend` client already allows `http://localhost:5173`.

Every account has its own data: each row belongs to the account that created it, and nobody sees another
account's projects unless the owner shares them (see below). Everything that existed before multi-user support
belongs to the account named by `DEVHUB_LEGACY_OWNER_SUBJECT`.

## Sharing projects

The owner of a project can add other Dev Hub users to it under Share in the project header. A member is found
by the exact username or e-mail; there is no listing and no partial match, and the person has to have signed in
to Dev Hub once before. Every member has one of two roles:

| Action | Viewer | Editor | Owner |
| --- | :-: | :-: | :-: |
| Read the project, its context, entries, repository data, and links | yes | yes | yes |
| Mark the project as a favorite (personal, others do not see it) | yes | yes | yes |
| Leave the project | yes | yes | - |
| Create, change, and delete notes, snippets, ideas, and todos; complete todos | - | yes | yes |
| Edit the resume context, link entries, file own inbox entries into the project | - | yes | yes |
| Start an own project from an idea of the shared project | - | yes | yes |
| Change name, description, links, status, and priority | - | - | yes |
| Connect or refresh the repository, take entries out of the project | - | - | yes |
| Manage members, archive, restore, delete | - | - | yes |

A few rules follow from that:

- Content of a project belongs to the owner's data. The author of each entry is stored separately and shown in
  the project, so removing a member keeps what they wrote.
- Entries of a shared project use the tags of the owner.
- Only the owner refreshes the repository, and the hourly sync runs with the owner's Git token. Members read the
  cached state and never cause a request with somebody else's token.
- A person without a role gets `404` for the project, a member whose role is too low gets `403`.
- The inbox stays private. Filing an entry into a shared project hands it to the project; only the owner can
  move it back to their inbox.
- Links between entries show up for a person only if they can see both ends.

## Appearance

Dev Hub ships a light and a dark theme. The switch in the sidebar header flips between them, and Settings
adds a third choice: System follows the light or dark setting of the operating system and moves with it while
the app is open.

The choice lives in `localStorage`, not in the database, so it belongs to the browser rather than the account
and every device can differ. A small script in `index.html` reads it before React starts, so reloading in the
dark theme does not flash a white page.

Both themes are built from one palette in `frontend/src/theme.ts`. Components ask it for tints, shadows, and
surfaces instead of writing colours of their own, which is what keeps the two modes in step.

## Deployment

Production setup, the Keycloak realm to import, and the server steps are in
[deploy/README.md](deploy/README.md).

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

## Repository sync

Dev Hub refreshes every connected repository on its own, once an hour, so the last commit on a project card
and the activity order on the dashboard stay current without pressing "Sync now". The panel says when the
last sync succeeded.

A run is cheap. Both providers answer a conditional request with `304 Not Modified` when nothing changed,
which costs a single request and, on GitHub, none of the hourly quota; only a repository that actually moved
is read in full. Archived projects, projects without a repository URL, unsupported Git hosts, and a project
whose quota has not reset yet are all left out, and one unreachable repository does not stop the rest.

| Variable | Meaning |
| --- | --- |
| `DEVHUB_REPOSITORY_SYNC_ENABLED` | `false` turns the background sync off; the button in the app keeps working |
| `DEVHUB_REPOSITORY_SYNC_INTERVAL` | How old a repository's last attempt has to be before it is synced again. Default `1h` |
| `DEVHUB_REPOSITORY_SYNC_INITIAL_DELAY` | Grace period after start before the first run. Default `2m` |
| `DEVHUB_REPOSITORY_SYNC_REQUEST_SPACING` | Pause between two repositories in one run. Default `1s` |

An open browser tab picks the new data up when it comes back into focus, at most once a minute.

## Backend API

The backend exposes CRUD endpoints for projects and their stored information:

- `/api/projects`
- `/api/projects/{projectId}/members`, `/api/projects/{projectId}/members/{userId}` and `/api/projects/{projectId}/members/me` for sharing
- `/api/projects/{projectId}/favorite` for the personal favorite mark
- `/api/users/lookup?query=` to find one account by exact username or e-mail
- `/api/projects/{projectId}/notes`
- `/api/projects/{projectId}/code-snippets`
- `/api/projects/{projectId}/ideas`
- `/api/projects/{projectId}/todos`
- `/api/tags`, or `/api/tags?projectId=` for the tags of a project's owner
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
