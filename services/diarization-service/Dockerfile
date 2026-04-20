# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package.json ./
COPY shared ./shared

# Copy service code
WORKDIR /app/services/diarization-service
COPY services/diarization-service/package.json ./
COPY services/diarization-service/tsconfig.json ./

# Install dependencies
WORKDIR /app
RUN npm install

# Build shared package
WORKDIR /app/shared
RUN npm run build

# Build service
WORKDIR /app/services/diarization-service
COPY services/diarization-service/src ./src
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/diarization-service/dist ./services/diarization-service/dist
COPY --from=builder /app/services/diarization-service/package.json ./services/diarization-service/package.json
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/services/diarization-service

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3003/health || exit 1

CMD ["node", "dist/index.js"]
