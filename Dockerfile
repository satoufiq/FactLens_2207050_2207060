# ==============================================================================
# FactLens frontend + API gateway
# Stage 1: build the React 19 + TypeScript + Vite bundle
# Stage 2: serve it with nginx, which also reverse-proxies the four APIs
# ==============================================================================

# Stage 1: build (Vite 8 needs Node 20.19+ / 22.12+)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Only what the build reads
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src

# Blank = call the APIs on the same origin, through the gateway below.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL} \
    NODE_ENV=production
RUN npm run build

# Stage 2: gateway
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
