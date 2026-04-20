# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package.json ./
COPY shared ./shared

# Copy service code
WORKDIR /app/services/api-gateway
COPY services/api-gateway/package.json ./
COPY services/api-gateway/tsconfig.json ./

# Install dependencies (using npm workspaces)
WORKDIR /app
RUN npm install

# Build shared package first
WORKDIR /app/shared
RUN npm run build

# Build service
WORKDIR /app/services/api-gateway
COPY services/api-gateway/src ./src
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/package.json
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/services/api-gateway

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
