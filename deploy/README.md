# Deploying Dev Hub

Dev Hub runs at `https://dev-hub.noahteetz.de` on the same server as the other
applications: no published ports, one shared Traefik in `/opt/proxy` that
terminates TLS, and one shared Keycloak in `/opt/keycloak` that owns every
login. GitHub Actions builds the images, pushes them to GHCR, and restarts the
stack over SSH.

## Keycloak

Everything below lives in its own realm, so nothing here touches the existing
`tmb` realm or its users.

### Import the realm

`keycloak/dev-hub-realm.json` creates the realm, both clients, the roles and the
audience mapper in one step.

1. Open `https://auth.teammegabyte.net/admin` and sign in as `admin`.
2. Realm picker → **Create realm** → **Browse** → pick the file → **Create**.

### What the file sets up

| Object | Value |
| --- | --- |
| Realm | `dev-hub`, display name Dev Hub |
| Browser client | `dev-hub-frontend`, public, authorization code + PKCE (S256) |
| API client | `dev-hub-backend`, confidential, every flow off |
| Realm roles | `devhub-user`, `devhub-admin` |
| Redirect URIs | `https://dev-hub.noahteetz.de/*` and `http://localhost:5173/*` |
| Web origins | `https://dev-hub.noahteetz.de` and `http://localhost:5173` |
| Audience mapper | Writes `dev-hub-backend` into the `aud` claim of every access token |

Self-registration is off, brute force protection is on, an access token lives
five minutes and a session idles out after thirty.

The `localhost` entries are what let a developer run the real login against this
realm; remove them if that is not wanted.

### Add yourself

The realm starts without any user.

1. **Users → Add user**: username, email, email verified on → **Create**.
2. **Credentials → Set password**, temporary off.
3. **Role mapping → Assign role → Filter by realm roles → `devhub-user`**.

Without `devhub-user` the login succeeds and every API call answers `403`. The
app says so rather than showing an empty page.

Dev Hub has no per-user data: everyone in this realm who holds `devhub-user`
sees the same projects, notes and stored Git tokens. Only add accounts that are
meant to see everything.

### Why two clients

The browser logs in as `dev-hub-frontend`, which holds no secret because a
secret shipped to a browser is not one. The audience mapper stamps every access
token with `dev-hub-backend`, and the API refuses a token that does not carry
it. Without that mapper any token from the realm — including one another
application handed out — would open Dev Hub.

## The server

### One time setup

```bash
ssh noahteetz@<server>
mkdir -p ~/dev-hub
# copy deploy/.env.example to ~/dev-hub/.env and fill it in
chmod 600 ~/dev-hub/.env
```

`docker-compose.yml` is not copied by hand. Every deploy sends the file from
this repository to the server first, so the two cannot drift apart. Change the
stack by editing `deploy/docker-compose.yml` and pushing, never by editing the
copy on the server.

The `.env` needs two generated values:

```bash
openssl rand -base64 24   # POSTGRES_PASSWORD
openssl rand -base64 32   # DEVHUB_ENCRYPTION_KEY
```

Back the encryption key up together with the database. A dump restored without
it leaves every stored GitHub and GitLab token unreadable.

`dev-hub.noahteetz.de` already resolves to the server, so Traefik requests the
certificate on the first request.

### GitHub Actions

The workflow needs three repository secrets, the same values the other
deployments use:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | The server address |
| `DEPLOY_USER` | `noahteetz` |
| `DEPLOY_SSH_KEY` | The private key of the deploy key in that account |

Every push to `main` that touches `backend/`, `frontend/` or `deploy/` runs the
test suites, builds both images, and restarts the stack. The server is already
logged in to GHCR, so `docker compose pull` works without further setup.

## Checking a deployment

```bash
curl -i https://dev-hub.noahteetz.de/api/projects        # expect 401
curl -s https://dev-hub.noahteetz.de/api/auth/config     # expect the dev-hub realm
```

A `401` on the first call is the point of the whole exercise: the API is closed
without a token. If it answers `200`, the login is off — check
`DEVHUB_AUTH_ENABLED` in the stack's environment immediately.
