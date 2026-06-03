FROM node:22-alpine AS development
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
RUN corepack enable && pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
