FROM node:22-bookworm-slim AS node
FROM eclipse-temurin:25-jdk-noble
COPY --from=node /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends git tmux curl ca-certificates python3 procps \
    && rm -rf /var/lib/apt/lists/*
ARG CLAUDE_VERSION=2.1.285
ARG CODEX_VERSION=0.159.2
RUN npm install --global @anthropic-ai/claude-code@${CLAUDE_VERSION} @openai/codex@${CODEX_VERSION} \
    && npm cache clean --force
RUN useradd --uid 1000 --create-home --shell /bin/bash workspace
COPY bootstrap.sh profile-init.sh /usr/local/bin/
COPY git-credential.mjs /usr/local/bin/devhub-git-credential
RUN chmod 0755 /usr/local/bin/bootstrap.sh /usr/local/bin/profile-init.sh /usr/local/bin/devhub-git-credential
ENV HOME=/home/workspace LANG=C.UTF-8 TERM=xterm-256color
USER 1000:1000
WORKDIR /workspace
CMD ["sleep", "infinity"]
