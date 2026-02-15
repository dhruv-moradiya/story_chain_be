# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies included in package.json (including devDependencies for build)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application (tsc && tsc-alias)
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Set the port to 8080 (Fly.io default)
# We can override this in docker-compose if needed
ENV PORT=8080 

# Copy package files and install ONLY production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the listening port
EXPOSE 8080

# Start the server
CMD ["node", "dist/server.js"]
