# qone-catalog-portal: build the remote with Node 22 and serve remoteEntry.js and its assets with
# NGINX (Annex H). The only build argument is the shell's origin; the portal never receives the
# gateway URL (norm 5.4.1).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
ARG VITE_SHELL_URL=http://localhost:5173
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1
