FROM node:22-bookworm-slim AS node
FROM eclipse-temurin:25-jdk-noble
COPY --from=node /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends git tmux curl ca-certificates python3 procps \
       jq ripgrep make zip unzip xz-utils sqlite3 libicu74 \
    && rm -rf /var/lib/apt/lists/*
# PostgreSQL server for throwaway test databases (see devhub-postgres); no cluster is created at build time.
ARG POSTGRES_MAJOR=18
RUN curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/keyrings/pgdg.asc \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && mkdir -p /etc/postgresql-common/createcluster.d && echo "create_main_cluster = false" > /etc/postgresql-common/createcluster.d/devhub.conf \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-${POSTGRES_MAJOR} \
    && rm -rf /var/lib/apt/lists/*
# System libraries for headless Chromium. Projects install the browser matching their own Playwright version into $HOME.
ARG PLAYWRIGHT_VERSION=1.63.0
RUN npx --yes playwright@${PLAYWRIGHT_VERSION} install-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm
ARG GH_VERSION=2.102.0
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends gh=${GH_VERSION} \
    && rm -rf /var/lib/apt/lists/*
ARG CLAUDE_VERSION=2.1.285
ARG CODEX_VERSION=0.159.2
RUN npm install --global @anthropic-ai/claude-code@${CLAUDE_VERSION} @openai/codex@${CODEX_VERSION} \
    && npm cache clean --force
RUN existing_user="$(getent passwd 1000 | cut -d: -f1)" \
    && if [ -n "$existing_user" ]; then usermod --login workspace --home /home/workspace --move-home --shell /bin/bash "$existing_user"; \
       else useradd --uid 1000 --create-home --shell /bin/bash workspace; fi
COPY bootstrap.sh profile-init.sh profile-shell.sh /usr/local/bin/
COPY devhub-postgres.sh /usr/local/bin/devhub-postgres
COPY devhub-bashrc /usr/local/share/devhub-bashrc
COPY git-credential.mjs /usr/local/bin/devhub-git-credential
COPY gh-wrapper.sh /usr/local/bin/gh
RUN chmod 0755 /usr/local/bin/bootstrap.sh /usr/local/bin/profile-init.sh /usr/local/bin/profile-shell.sh /usr/local/bin/devhub-git-credential /usr/local/bin/gh \
    /usr/local/bin/devhub-postgres
ENV HOME=/home/workspace LANG=C.UTF-8 TERM=xterm-256color POSTGRES_MAJOR=${POSTGRES_MAJOR}
USER 1000:1000
WORKDIR /workspace
CMD ["sleep", "infinity"]
