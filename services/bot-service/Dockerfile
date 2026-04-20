# Build stage
FROM node:20-alpine AS builder

# Install puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

COPY package.json ./
COPY shared ./shared

WORKDIR /app/services/bot-service
COPY services/bot-service/package.json ./
COPY services/bot-service/tsconfig.json ./

WORKDIR /app
RUN npm install

WORKDIR /app/shared
RUN npm run build

WORKDIR /app/services/bot-service
COPY services/bot-service/src ./src
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install chromium for puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/bot-service/dist ./services/bot-service/dist
COPY --from=builder /app/services/bot-service/package.json ./services/bot-service/package.json
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/services/bot-service

ENV NODE_ENV=production
ENV PORT=3006
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3006/health || exit 1

CMD ["node", "dist/index.js"]
