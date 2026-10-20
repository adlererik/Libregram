# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates ffmpeg openssl sqlite3 util-linux \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
ARG TARGETARCH
RUN npm install --global pnpm@12.10.1 && npm cache clean --force
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN case "$TARGETARCH" in arm64) cpu=arm64 ;; *) cpu=x64 ;; esac \
    && pnpm install --frozen-lockfile --cpu "$cpu" --os linux --libc glibc
COPY next.config.mjs next-env.d.ts tsconfig.json postcss.config.mjs tailwind.config.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY scripts ./scripts
COPY docs ./docs
COPY public ./public
COPY deploy/docker ./deploy/docker
# Build without any installation environment, birthday, credentials or database.
# The empty build database stays in the discarded build stage.
RUN DATABASE_URL=file:/tmp/libregram-build.db node node_modules/prisma/build/index.js db push --skip-generate \
    && DATABASE_URL=file:/tmp/libregram-build.db pnpm build \
    && pnpm prune --prod \
    && rm -rf .next/cache

FROM base AS runtime
ARG VERSION=1.6.0
ARG REVISION=unknown
LABEL org.opencontainers.image.title="Libregram" \
      org.opencontainers.image.description="A free, self-hosted Instagram alternative. Share media without a walled garden." \
      org.opencontainers.image.source="https://github.com/adlererik/libregram" \
      org.opencontainers.image.url="https://github.com/adlererik/libregram" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$REVISION"
ENV NODE_ENV=production LIBREGRAM_HOST=0.0.0.0 LIBREGRAM_PORT=3000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/app ./app
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/docs ./docs
COPY --from=build --chown=node:node /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build --chown=node:node /app/deploy/docker ./deploy/docker
COPY --chown=node:node package.json next.config.mjs tsconfig.json LICENSE README.md SECURITY.md ./
RUN mkdir -p /data /app/public /app/work \
    && ln -s /data/uploads /app/public/uploads \
    && ln -s /data/runtime /app/.runtime \
    && ln -s /data/database/libregram.db /app/prisma/dev.db \
    && ln -s /data/cache/cast-slides /app/work/cast-slides \
    && chown -R node:node /data /app/public /app/work
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD ["node", "deploy/docker/healthcheck.mjs"]
# Hold a lock for the entire process lifetime: one running app per data volume.
ENTRYPOINT ["flock", "--nonblock", "--no-fork", "/data/instance.lock", "node", "deploy/docker/entrypoint.mjs"]
