# Build stage
FROM node:20-alpine AS builder

# Install ffmpeg dependencies
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy root configurations
COPY package.json ./
COPY shared ./shared

# Copy service code
WORKDIR /app/services/transcription-service
COPY services/transcription-service/package.json ./
COPY services/transcription-service/tsconfig.json ./

# Install dependencies
WORKDIR /app
RUN npm install

# Build shared package
WORKDIR /app/shared
RUN npm run build

# Build service
WORKDIR /app/services/transcription-service
COPY services/transcription-service/src ./src
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install ffmpeg for runtime
RUN apk add --no-cache ffmpeg

WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/transcription-service/dist ./services/transcription-service/dist
COPY --from=builder /app/services/transcription-service/package.json ./services/transcription-service/package.json
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/services/transcription-service

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]
