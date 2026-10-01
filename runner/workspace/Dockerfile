FROM node:22-bookworm-slim AS node
FROM eclipse-temurin:25-jdk-noble
COPY --from=node /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends git tmux curl ca-certificates python3 procps \
    && rm -rf /var/lib/apt/lists/*
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
COPY devhub-bashrc /usr/local/share/devhub-bashrc
COPY git-credential.mjs /usr/local/bin/devhub-git-credential
COPY gh-wrapper.sh /usr/local/bin/gh
RUN chmod 0755 /usr/local/bin/bootstrap.sh /usr/local/bin/profile-init.sh /usr/local/bin/profile-shell.sh /usr/local/bin/devhub-git-credential /usr/local/bin/gh
ENV HOME=/home/workspace LANG=C.UTF-8 TERM=xterm-256color
USER 1000:1000
WORKDIR /workspace
CMD ["sleep", "infinity"]
