# syntax=docker/dockerfile:1.7
# Local/self-hosted image for the SPA. In AWS the same `vite build` output is
# deployed to S3 + CloudFront instead; this image mirrors that topology locally
# (static files + /api proxied to the API, one origin).
#   docker build -f apps/web/Dockerfile -t vrp-web .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/validation/package.json packages/validation/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.base.json eslint.config.js ./
COPY packages packages
COPY apps/web apps/web
RUN npm run build -w @vrp/shared-types -w @vrp/validation \
 && npm run build -w @vrp/web

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
