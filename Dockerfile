FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/earth/package.json ./server/earth/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --filter earth-server... --frozen-lockfile

COPY server/earth ./server/earth
COPY packages/shared ./packages/shared
COPY convex ./convex

RUN pnpm --filter earth-server build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["pnpm", "--filter", "earth-server", "start"]
