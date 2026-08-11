FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html
EXPOSE 80

FROM node:24-bookworm-slim AS api
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY backend ./backend
ENV NODE_ENV=production PORT=3100 MANGAFLOW_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3100
CMD ["node", "backend/server.cjs"]

FROM api AS worker
CMD ["node", "backend/worker.cjs"]
