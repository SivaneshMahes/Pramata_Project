# syntax=docker/dockerfile:1.7
# Build context: repository root (the API depends on workspace packages).
#   docker build -f apps/api/Dockerfile -t vrp-api .

ARG NODE_IMAGE=node:22-alpine

# ---- install all deps (dev included) for building ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/validation/package.json packages/validation/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --no-audit --no-fund

# ---- compile shared packages and the API ----
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @vrp/shared-types -w @vrp/validation \
 && npm run build -w @vrp/api

# ---- production dependencies only ----
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/validation/package.json packages/validation/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
      -w @vrp/api -w @vrp/shared-types -w @vrp/validation

# ---- minimal runtime ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
# Workspace packages are symlinked from node_modules/@vrp/* to packages/*.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build --chown=node:node /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build --chown=node:node /app/packages/validation/package.json ./packages/validation/package.json
COPY --from=build --chown=node:node /app/packages/validation/dist ./packages/validation/dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist

USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1
CMD ["node", "apps/api/dist/server.js"]
