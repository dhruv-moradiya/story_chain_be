# Deploying StoryChain BE to Fly.io

This guide will walk you through deploying your **StoryChain Backend** (Fastify + TypeScript) to [Fly.io](https://fly.io).

## Prerequisites

1.  **Fly.io Account**: [Sign up here](https://fly.io/app/sign-up).
2.  **Fly CLI**: [Install the Fly CLI](https://fly.io/docs/hands-on/install-flyctl/).
    - Windows PowerShell: `pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"`
3.  **Login**: Run `fly auth login` in your terminal.

## Step 1: Dockerize the Application

Since your project does not have a `Dockerfile`, you need to create one to tell Fly.io how to build and run your app.

### 1. Create `Dockerfile`

Create a file named `Dockerfile` (no extension) in the root of your project (`e:\Mine\Turorials\storychain-be\Dockerfile`) with the following content:

```dockerfile
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
ENV PORT=8080

# Copy package files and install ONLY production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the listening port
EXPOSE 8080

# Start the server
CMD ["node", "dist/server.js"]
```

### 2. Create `.dockerignore`

Create a `.dockerignore` file to prevent unnecessary files from being sent to the build context:

```text
node_modules
dist
.git
.github
.env
logs
```

## Step 2: Initialize Fly App

Open your terminal in the project root and run:

```powershell
fly launch
```

1.  **Choose an app name**: (e.g., `storychain-be`).
2.  **Choose a region**: Select one close to you or your users (e.g., `sin`, `bom`, `ams`).
3.  **Configuration**:
    - It might ask to tweak settings. You can accept defaults.
    - It will create a `fly.toml` file.
4.  **Database**: It might ask to set up a Postgres/Redis. **Say No** since you are using MongoDB Atlas and Redis Labs.
5.  **Deploy now?**: You can say **No** for now, as we need to set secrets first.

## Step 3: Configure Environment Variables

Your application requires several sensitive environment variables (Secrets). You must set these in Fly.io.

Run the following command (replace the values with your actual credentials):

```powershell
fly secrets set ^
  NODE_ENV=production ^
  MONGODB_URI="your_mongodb_atlas_connection_string" ^
  REDIS_USERNAME="your_redis_lab_username" ^
  REDIS_PASSWORD="your_redis_lab_password" ^
  REDIS_HOST="your_redis_lab_host" ^
  REDIS_PORT="your_redis_lab_port" ^
  CLOUDINARY_CLOUD_NAME="your_cloud_name" ^
  CLOUDINARY_API_KEY="your_api_key" ^
  CLOUDINARY_API_SECRET="your_api_secret" ^
  CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key" ^
  CLERK_SECRET_KEY="your_clerk_secret_key" ^
  CLERK_WEBHOOK_SECRET="your_clerk_webhook_secret" ^
  RAILWAY_URL="https://your-app-name.fly.dev"
```

> **Note**: I noticed `RAILWAY_URL` is required in your config. I've mapped it to your future Fly.io URL (e.g., `https://storychain-be.fly.dev`). If your code uses it specifically for Railway-specific logic, you might need to adjust your code.

> **Important**: Ensure your `MONGODB_URI` includes the database name if needed (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/storychain?retryWrites=true&w=majority`).

## Step 4: Verification and Code Adjustments

### 1. Host Binding

Your `src/config/env.ts` sets `HOST` to `0.0.0.0` by default, which is correct for Docker.
Your `PORT` defaults to `4000`, but the Dockerfile sets `ENV PORT=8080`. Your `env.ts` uses `z.coerce.number()`, so it will pick up `8080`. This is correct.

### 2. Redis Configuration

I noticed `REDIS_URL` is commented out in `src/config/env.ts`, but `src/config/services/config.service.ts` requires `REDIS_USERNAME`, `PASSWORD`, `HOST`, and `PORT`.
**Ensure these matching variables are set in `fly secrets` as shown in Step 3.**
If you connect via a single URL string instead, you might need to adjust your `RedisService` or `ConfigService` to parse that URL, but the current code expects broken-down parameters.

## Step 5: Deploy

Once the file is created and secrets are set, deploy required:

```powershell
fly deploy
```

Fly will build your Docker image remotely and deploy it.

## Step 6: Troubleshooting

- **Logs**: If the deployment fails or app crashes, check logs:
  ```powershell
  fly logs
  ```
- **Connection Issues**: Ensure your MongoDB Atlas Network Access is set to **Allow Access from Anywhere** (0.0.0.0/0) or whitelists Fly.io IPs (which vary). For Redis Labs, also ensure the firewall allows connections.
