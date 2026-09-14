FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json ./
RUN npm ci

COPY server ./server
RUN npm run build:server

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/server ./dist/server

# Point de montage persistant pour la session WhatsApp et la base SQLite
VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "dist/server/index.js"]
