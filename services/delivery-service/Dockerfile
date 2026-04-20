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

# Copy root configurations
COPY package.json ./
COPY shared ./shared

# Copy service code
WORKDIR /app/services/delivery-service
COPY services/delivery-service/package.json ./
COPY services/delivery-service/tsconfig.json ./

# Install dependencies
WORKDIR /app
RUN npm install

# Build shared package
WORKDIR /app/shared
RUN npm run build

# Build service
WORKDIR /app/services/delivery-service
COPY services/delivery-service/src ./src
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
COPY --from=builder /app/services/delivery-service/dist ./services/delivery-service/dist
COPY --from=builder /app/services/delivery-service/package.json ./services/delivery-service/package.json
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/services/delivery-service

ENV NODE_ENV=production
ENV PORT=3005
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3005/health || exit 1

CMD ["node", "dist/index.js"]
