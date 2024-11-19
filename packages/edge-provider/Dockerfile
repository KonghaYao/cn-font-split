FROM docker.io/node:lts-alpine AS build

WORKDIR /build
COPY package.json .

RUN npm i --production --registry=https://registry.npmmirror.com
RUN npm i vite --registry=https://registry.npmmirror.com

COPY server server
COPY vite.config.ts vite.config.ts
RUN npm run build

################################################################################

FROM docker.io/denoland/deno:alpine-2.0.5

WORKDIR /app

## copy the main binary
COPY --from=build /build/dist/edge-provider.mjs ./
COPY deno.lock deno.lock
RUN deno install
CMD ["deno", "serve", "-A", "--unstable-kv", "edge-provider.mjs"]