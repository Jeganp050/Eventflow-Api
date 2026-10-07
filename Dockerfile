# Multi-stage production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies including devDependencies for building
RUN npm ci

# Copy source code and docs
COPY src ./src/
COPY docs ./docs/

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs

# Expose HTTP port
EXPOSE 3000

# Run API server
CMD ["node", "dist/src/server.js"]
