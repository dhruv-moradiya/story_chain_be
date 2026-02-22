# ============================================================
# Stage 1: Build
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for tsc build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (runs tsc && tsc-alias)
RUN npm run build

# ============================================================
# Stage 2: Runner (lean production image)
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
# Fly.io routes internal traffic to port 8080 by default
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy package files and install ONLY production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy the compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port that Fly.io expects
EXPOSE 8080

# Health check so Fly.io knows the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "dist/server.js"]
