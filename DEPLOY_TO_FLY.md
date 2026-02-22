# Deploying StoryChain Backend to Fly.io

This guide gives detailed step-by-step instructions for every scenario:
deploying for the first time, redeploying after code changes, updating secrets,
rolling back, and running locally with Docker.

> **Architecture in Production (Fly.io)**
>
> - App runs inside a Docker container on Fly.io
> - MongoDB → **MongoDB Atlas** (external, no local container)
> - Redis → **Redis Cloud / Upstash** (external, no local container)
> - `docker-compose.yml` is **only** for local development

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First-Time Deployment](#2-first-time-deployment)
3. [Setting Environment Secrets](#3-setting-environment-secrets)
4. [Redeploying After Code Changes](#4-redeploying-after-code-changes)
5. [Checking Logs & Status](#5-checking-logs--status)
6. [Rolling Back a Deployment](#6-rolling-back-a-deployment)
7. [Scaling the App](#7-scaling-the-app)
8. [Local Development with Docker](#8-local-development-with-docker)
9. [Troubleshooting Common Issues](#9-troubleshooting-common-issues)

---

## 1. Prerequisites

| Tool                   | Install Command                                             | Purpose                                        |
| ---------------------- | ----------------------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| **Fly CLI (`flyctl`)** | `pwsh -Command "iwr https://fly.io/install.ps1 -useb        | iex"`                                          | Manage Fly apps from terminal |
| **Docker Desktop**     | [Download](https://www.docker.com/products/docker-desktop/) | Build images locally (optional for Fly builds) |
| **Fly Account**        | [Sign up](https://fly.io/app/sign-up)                       | Required to deploy                             |

**Login to Fly:**

```powershell
fly auth login
```

---

## 2. First-Time Deployment

Run this **once** when you first set up the app on Fly.io.

### Step 1 — Launch the app

```powershell
fly launch
```

Fly will ask a series of questions:

- **App name**: Enter `storychain-be` (or any name, this becomes your URL)
- **Region**: Choose closest to your users (e.g., `sin` for Singapore, `bom` for Mumbai, `iad` for US East)
- **Database / Redis**: **Say NO** — you are using MongoDB Atlas and Redis Cloud
- **Deploy now?**: **Say NO** — you need to set secrets first

This creates a `fly.toml` config file in your project root.

### Step 2 — Set secrets (see [Section 3](#3-setting-environment-secrets))

### Step 3 — Deploy

```powershell
fly deploy
```

Your app will be live at `https://<your-app-name>.fly.dev`.

---

## 3. Setting Environment Secrets

Fly.io secrets are environment variables injected into your container at runtime.
They are **never** stored in your code or `fly.toml`.

### Set all secrets at once (Windows PowerShell)

Replace **every** placeholder value with your real credentials:

```powershell
fly secrets set `
  NODE_ENV="production" `
  PORT="8080" `
  HOST="0.0.0.0" `
  MONGODB_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net/storychain?retryWrites=true&w=majority" `
  REDIS_HOST="<your-redis-host>" `
  REDIS_PORT="<your-redis-port>" `
  REDIS_USERNAME="<your-redis-username>" `
  REDIS_PASSWORD="<your-redis-password>" `
  CORS_ORIGIN="https://your-frontend-domain.com" `
  CLERK_PUBLISHABLE_KEY="pk_live_..." `
  CLERK_SECRET_KEY="sk_live_..." `
  CLERK_WEBHOOK_SECRET="whsec_..." `
  CLOUDINARY_CLOUD_NAME="your-cloud-name" `
  CLOUDINARY_API_KEY="your-api-key" `
  CLOUDINARY_API_SECRET="your-api-secret"
```

> **Note**: On `cmd.exe` replace the backtick `` ` `` with `^` for line continuation.

### View currently set secrets (values are hidden)

```powershell
fly secrets list
```

### Update a single secret

```powershell
fly secrets set CLERK_SECRET_KEY="sk_live_new_value"
```

Setting a secret triggers an **automatic redeploy** of your app.

### Delete a secret

```powershell
fly secrets unset SOME_OLD_SECRET
```

---

## 4. Redeploying After Code Changes

Every time you push code changes and want them live on Fly.io:

```powershell
# Option A: Deploy directly from your local machine (Fly builds the image remotely)
fly deploy

# Option B: Build locally first, then push (faster if you have a fast local machine)
fly deploy --local-only
```

> Fly.io will rebuild the Docker image using your `Dockerfile`,
> run health checks, and only route traffic to the new version
> if it passes. If it fails, the old version keeps running.

### Deploy specific Dockerfile

```powershell
fly deploy --dockerfile Dockerfile
```

---

## 5. Checking Logs & Status

### Live-streaming logs (most useful for debugging)

```powershell
fly logs
```

### Check app status and instance health

```powershell
fly status
```

### List all deployments

```powershell
fly releases
```

### Open the app in browser

```powershell
fly open
```

### SSH into the running container (for advanced debugging)

```powershell
fly ssh console
```

---

## 6. Rolling Back a Deployment

If a new deployment breaks something, you can roll back to a previous release instantly.

### List all past releases

```powershell
fly releases
```

Example output:

```
VERSION  STATUS   DESCRIPTION  USER  DATE
v10      deployed Deploy image  me   5 mins ago
v9       deployed Deploy image  me   1 hour ago
v8       deployed Deploy image  me   3 hours ago
```

### Roll back to a specific version

```powershell
fly deploy --image registry.fly.io/<your-app-name>:deployment-<version>
```

Or using the short form:

```powershell
fly releases rollback v9
```

---

## 7. Scaling the App

### Scale the number of instances (machines)

```powershell
# Run 2 instances for redundancy
fly scale count 2

# Scale back to 1
fly scale count 1
```

### Scale memory/CPU of each instance

```powershell
# List available VM sizes
fly platform vm-sizes

# Choose a size
fly scale vm shared-cpu-1x  # Smallest (free tier)
fly scale vm shared-cpu-2x  # More CPU
fly scale vm performance-1x # Dedicated CPU
```

### View current scale settings

```powershell
fly scale show
```

---

## 8. Local Development with Docker

The `docker-compose.yml` runs a **complete local environment** with:

- The app (built from your Dockerfile)
- MongoDB 7.0 with a replica set (required for transactions)
- Redis 7

### Start everything locally

```powershell
docker-compose up --build
```

App will be accessible at: `http://localhost:4000`

### Stop all containers

```powershell
docker-compose down
```

### Stop and delete all data (volumes)

```powershell
docker-compose down -v
```

### Rebuild only the app container (after code changes)

```powershell
docker-compose up --build app
```

### View logs from local containers

```powershell
# All services
docker-compose logs -f

# Only the app
docker-compose logs -f app
```

> **Important**: For local Docker development, create a `.env` file in the
> project root with your Clerk and Cloudinary keys. The `docker-compose.yml`
> will load it automatically via `env_file: .env`. MongoDB and Redis
> connection strings are already overridden in the compose file to use
> the local containers.

### Example `.env` for local Docker development

```dotenv
# These are loaded by docker-compose.yml
# MongoDB and Redis are overridden by docker-compose, so values below are ignored for those
MONGODB_URI=mongodb://localhost:27017/storychain  # ignored by docker-compose
REDIS_HOST=localhost                              # ignored by docker-compose
REDIS_PORT=6379                                   # ignored by docker-compose
REDIS_USERNAME=default
REDIS_PASSWORD=

# These must be real values
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ORIGIN=http://localhost:3000
```

---

## 9. Troubleshooting Common Issues

### App crashes on startup

```powershell
fly logs
```

Look for the error message. Common causes:

- Missing secret (e.g., `CLERK_SECRET_KEY` not set) → set it with `fly secrets set`
- Wrong `MONGODB_URI` format → ensure it includes `?retryWrites=true&w=majority`
- MongoDB Atlas network access not allowing Fly.io IP ranges

### MongoDB connection refused

Fly.io machines have **dynamic IP addresses**. To allow connections from Fly.io:

1. Go to MongoDB Atlas → **Network Access**
2. Add `0.0.0.0/0` (Allow Access from Anywhere)

> **More secure option**: Use [Fly.io static IPs](https://fly.io/docs/networking/static-egress-ip/)
> and whitelist only those IPs in Atlas.

### Redis connection refused

If using **Upstash Redis** (recommended for Fly.io):

1. Use the connection details from your Upstash dashboard
2. The `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` must all be set correctly

If using **Redis Cloud**:

1. Enable public endpoint in Redis Cloud
2. Use the endpoint, port, username, and password

### Health check failing

The Dockerfile includes a health check at `GET /health`.
If your app doesn't have this endpoint, the container will be marked unhealthy.

Add a health check route to your Fastify app:

```typescript
fastify.get('/health', async () => ({ status: 'ok' }));
```

### `fly deploy` says "No changes detected"

Force a redeploy:

```powershell
fly deploy --strategy=rolling
```

### Check what fly.toml looks like (after `fly launch`)

```toml
app = "storychain-be"
primary_region = "sin"

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

> Set `min_machines_running = 1` if you don't want cold starts (costs money).

---

## Quick Reference Cheat Sheet

| Task                       | Command                                        |
| -------------------------- | ---------------------------------------------- |
| First deploy               | `fly launch` → set secrets → `fly deploy`      |
| Redeploy after code change | `fly deploy`                                   |
| View live logs             | `fly logs`                                     |
| Check app health           | `fly status`                                   |
| Update a secret            | `fly secrets set KEY="value"`                  |
| View all secrets           | `fly secrets list`                             |
| Rollback                   | `fly releases` then `fly releases rollback vN` |
| Scale to 2 instances       | `fly scale count 2`                            |
| SSH into container         | `fly ssh console`                              |
| Open app in browser        | `fly open`                                     |
| Run locally with Docker    | `docker-compose up --build`                    |
| Stop local Docker          | `docker-compose down`                          |
