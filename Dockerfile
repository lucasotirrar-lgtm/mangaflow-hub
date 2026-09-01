FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

FROM node:24-bookworm-slim AS api
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm_config_build_from_source=true npm ci --omit=dev \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY backend ./backend
ENV NODE_ENV=production PORT=3100 MANGAFLOW_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3100
CMD ["node", "backend/server.cjs"]

FROM api AS worker
CMD ["node", "backend/worker.cjs"]
