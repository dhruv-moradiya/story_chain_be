# Rate Limiting - Complete Guide

## Table of Contents

1. [What is Rate Limiting?](#1-what-is-rate-limiting)
2. [Why Rate Limiting Matters](#2-why-rate-limiting-matters)
3. [Core Concepts](#3-core-concepts)
4. [Rate Limiting Algorithms](#4-rate-limiting-algorithms)
5. [How Fastify Rate Limit Works](#5-how-fastify-rate-limit-works)
6. [Configuration Options Explained](#6-configuration-options-explained)
7. [Rate Limiting Strategies](#7-rate-limiting-strategies)
8. [Best Practices](#8-best-practices)

---

## 1. What is Rate Limiting?

### Definition

Rate limiting is a technique used to control the number of requests a client can make to a server within a specified time period. Think of it as a traffic controller for your API - it ensures that no single user or system can overwhelm your server with too many requests.

### Real-World Analogy

Imagine a popular restaurant with limited seating:

- **Without rate limiting**: Everyone rushes in at once, causing chaos, long waits, and poor service for everyone
- **With rate limiting**: A host manages the flow, allowing a controlled number of guests in at a time, ensuring quality service for all

### Simple Example

```
Rule: Maximum 100 requests per minute per user

User A makes requests:
├── Request 1 at 10:00:00  ✅ Allowed (1/100)
├── Request 2 at 10:00:01  ✅ Allowed (2/100)
├── ...
├── Request 100 at 10:00:30 ✅ Allowed (100/100)
├── Request 101 at 10:00:31 ❌ BLOCKED (limit reached)
│
└── At 10:01:00 → Counter resets → Requests allowed again
```

---

## 2. Why Rate Limiting Matters

### 2.1 Protection Against Attacks

| Threat           | How Rate Limiting Helps                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| **DDoS Attacks** | Limits the impact of distributed attacks by capping requests per source |
| **Brute Force**  | Prevents password guessing by limiting login attempts                   |
| **Scraping**     | Stops bots from harvesting your data too quickly                        |
| **API Abuse**    | Prevents malicious users from exploiting endpoints                      |

### 2.2 Resource Management

Rate limiting ensures fair resource distribution:

```
Without Rate Limiting:
┌─────────────────────────────────────────────────┐
│ Server Resources (100%)                         │
├─────────────────────────────────────────────────┤
│ User A: ████████████████████████████████ (80%)  │ ← Hogging resources
│ User B: ████ (10%)                              │
│ User C: ████ (10%)                              │
└─────────────────────────────────────────────────┘

With Rate Limiting:
┌─────────────────────────────────────────────────┐
│ Server Resources (100%)                         │
├─────────────────────────────────────────────────┤
│ User A: ████████████ (33%)                      │ ← Fair share
│ User B: ████████████ (33%)                      │
│ User C: ████████████ (33%)                      │
└─────────────────────────────────────────────────┘
```

### 2.3 Cost Control

For cloud-based applications:

- **Database queries** cost money (read/write operations)
- **Bandwidth** is metered
- **Compute time** is billed
- Rate limiting prevents runaway costs from misbehaving clients

### 2.4 Quality of Service

Ensures consistent performance for all users by preventing any single user from degrading the experience for others.

---

## 3. Core Concepts

### 3.1 Key Terminology

| Term           | Definition                                             |
| -------------- | ------------------------------------------------------ |
| **Rate**       | Number of allowed requests                             |
| **Window**     | Time period for the rate (e.g., per minute, per hour)  |
| **Limit**      | Maximum requests allowed within the window             |
| **Key**        | Identifier for tracking (IP address, user ID, API key) |
| **Quota**      | Total allocation over a longer period                  |
| **Throttling** | Slowing down requests rather than blocking             |
| **Burst**      | Allowing temporary spikes above normal rate            |

### 3.2 Request Flow with Rate Limiting

```
                    Incoming Request
                          │
                          ▼
              ┌───────────────────────┐
              │   Extract Client Key   │
              │  (IP, User ID, Token)  │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Check Current Count   │
              │    in Rate Store       │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Count < Limit?        │
              └───────────┬───────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
     ┌─────────────┐            ┌─────────────┐
     │     YES     │            │     NO      │
     └──────┬──────┘            └──────┬──────┘
            │                          │
            ▼                          ▼
     ┌─────────────┐            ┌─────────────┐
     │ Increment   │            │ Return 429  │
     │ Counter     │            │ Too Many    │
     │             │            │ Requests    │
     │ Process     │            └─────────────┘
     │ Request     │
     └─────────────┘
```

### 3.3 HTTP Response Headers

When rate limiting is active, servers typically return these headers:

| Header                  | Purpose                                        | Example      |
| ----------------------- | ---------------------------------------------- | ------------ |
| `X-RateLimit-Limit`     | Maximum requests allowed                       | `100`        |
| `X-RateLimit-Remaining` | Requests left in window                        | `45`         |
| `X-RateLimit-Reset`     | When the window resets (Unix timestamp)        | `1699574400` |
| `Retry-After`           | Seconds to wait before retrying (when blocked) | `60`         |

### 3.4 HTTP Status Codes

| Code  | Meaning             | When Used                        |
| ----- | ------------------- | -------------------------------- |
| `200` | OK                  | Request processed successfully   |
| `429` | Too Many Requests   | Rate limit exceeded              |
| `503` | Service Unavailable | Server overloaded (global limit) |

---

## 4. Rate Limiting Algorithms

### 4.1 Fixed Window Counter

**How It Works:**

- Divides time into fixed intervals (windows)
- Counts requests within each window
- Resets counter when new window starts

```
Window: 1 minute (10:00 - 10:01)
Limit: 5 requests

Timeline:
10:00:00 │ Request 1 ✅ (count: 1)
10:00:15 │ Request 2 ✅ (count: 2)
10:00:30 │ Request 3 ✅ (count: 3)
10:00:45 │ Request 4 ✅ (count: 4)
10:00:50 │ Request 5 ✅ (count: 5)
10:00:55 │ Request 6 ❌ (count: 5 - LIMIT REACHED)
─────────┼──────────────────────────────────────
10:01:00 │ Window Reset (count: 0)
10:01:05 │ Request 7 ✅ (count: 1)
```

**Pros:**

- Simple to implement
- Low memory usage
- Fast lookups

**Cons:**

- Burst problem at window boundaries (can get 2x limit)

**Burst Problem Illustrated:**

```
Limit: 5 requests per minute

10:00:55 │ 5 requests ✅ (end of window 1)
10:01:00 │ Window Reset
10:01:05 │ 5 requests ✅ (start of window 2)
─────────┼
         │ Result: 10 requests in 10 seconds!
```

---

### 4.2 Sliding Window Log

**How It Works:**

- Stores timestamp of each request
- Counts requests within the sliding time window
- Removes expired timestamps

```
Window: 1 minute sliding
Limit: 5 requests
Current Time: 10:02:30

Stored Timestamps:
├── 10:01:20 ❌ (expired - older than 1 minute)
├── 10:01:35 ✅ (valid)
├── 10:01:50 ✅ (valid)
├── 10:02:00 ✅ (valid)
├── 10:02:15 ✅ (valid)
└── 10:02:25 ✅ (valid)

Current count: 5 (only valid timestamps)
New request at 10:02:30 → ❌ Blocked
```

**Pros:**

- Very accurate
- No boundary burst problem

**Cons:**

- High memory usage (stores all timestamps)
- More expensive to compute

---

### 4.3 Sliding Window Counter (Hybrid)

**How It Works:**

- Combines Fixed Window + Sliding Window
- Uses weighted average of current and previous window

```
Window: 1 minute
Limit: 100 requests
Current Time: 10:01:20 (20 seconds into current window)

Previous Window (10:00 - 10:01): 80 requests
Current Window (10:01 - 10:02): 30 requests

Calculation:
├── Previous window weight: 40/60 = 0.67 (40 seconds remaining)
├── Current window weight: 20/60 = 0.33 (20 seconds elapsed)
│
├── Weighted count = (80 × 0.67) + (30 × 1.0)
│                  = 53.6 + 30
│                  = 83.6 requests
│
└── 83.6 < 100 → ✅ Request Allowed
```

**Pros:**

- Smooths out bursts
- Memory efficient (only 2 counters)
- Good accuracy

**Cons:**

- Slightly more complex calculation

---

### 4.4 Token Bucket

**How It Works:**

- Bucket holds tokens (each request consumes one)
- Tokens are added at a fixed rate
- Requests are rejected if bucket is empty

```
Bucket Capacity: 10 tokens
Refill Rate: 1 token per second

Time 0:00: Bucket = 10 tokens (full)
           ├── 5 requests arrive → 5 tokens consumed
           └── Bucket = 5 tokens

Time 0:01: Bucket = 6 tokens (+1 refill)
           ├── 2 requests arrive → 2 tokens consumed
           └── Bucket = 4 tokens

Time 0:02: Bucket = 5 tokens (+1 refill)
           ├── 8 requests arrive
           │   ├── 5 allowed (tokens available)
           │   └── 3 rejected (no tokens)
           └── Bucket = 0 tokens

Time 0:03: Bucket = 1 token (+1 refill)
```

**Visual Representation:**

```
Bucket Capacity: ████████████ (10)

Initial:        ████████████ (10/10)
After 5 req:    ██████       (5/10)
After refill:   ███████      (6/10)
After 2 req:    █████        (4/10)
After refill:   ██████       (5/10)
After 5 req:               □ (0/10)
After refill:   █            (1/10)
```

**Pros:**

- Allows controlled bursts
- Smooth rate limiting
- Flexible for different traffic patterns

**Cons:**

- More complex to implement
- Requires storing bucket state

---

### 4.5 Leaky Bucket

**How It Works:**

- Requests enter a queue (bucket)
- Requests are processed at a fixed rate (leak)
- Bucket overflows if too many requests queue up

```
Bucket Capacity: 5 requests
Processing Rate: 1 request per second

Incoming:    [R1] [R2] [R3] [R4] [R5] [R6] [R7]
                                        ↓
             ┌─────────────────────────────────┐
Bucket:      │ R1 │ R2 │ R3 │ R4 │ R5 │ OVERFLOW
             └─────────────┬───────────────────┘
                           │ (leak rate: 1/sec)
                           ▼
             ┌─────────────────────────────────┐
Processed:   │  R1  │  R2  │  R3  │ ...        │
             └─────────────────────────────────┘
             t=0    t=1    t=2

R6, R7 are rejected (bucket full)
```

**Pros:**

- Smooths out traffic completely
- Predictable processing rate

**Cons:**

- Adds latency (queuing)
- Can reject valid bursts

---

### 4.6 Algorithm Comparison

| Algorithm       | Accuracy  | Memory   | Burst Handling | Best For              |
| --------------- | --------- | -------- | -------------- | --------------------- |
| Fixed Window    | Low       | Very Low | Poor           | Simple APIs           |
| Sliding Log     | Very High | High     | Excellent      | Security-critical     |
| Sliding Counter | High      | Low      | Good           | General purpose       |
| Token Bucket    | High      | Low      | Controlled     | APIs with burst needs |
| Leaky Bucket    | High      | Medium   | Smoothing      | Traffic shaping       |

---

## 5. How Fastify Rate Limit Works

### 5.1 Overview

`@fastify/rate-limit` is a plugin for Fastify that provides efficient rate limiting. It integrates seamlessly with Fastify's hook system and supports multiple storage backends.

### 5.2 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Fastify Server                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Request Lifecycle                            │ │
│  │                                                                 │ │
│  │  Incoming     onRequest      preHandler     Handler    Response │ │
│  │  Request  ──────┬──────────────┬─────────────┬────────────►     │ │
│  │                 │              │             │                  │ │
│  │                 ▼              │             │                  │ │
│  │         ┌──────────────┐      │             │                  │ │
│  │         │  Rate Limit  │      │             │                  │ │
│  │         │    Hook      │      │             │                  │ │
│  │         └──────┬───────┘      │             │                  │ │
│  │                │              │             │                  │ │
│  └────────────────┼──────────────┼─────────────┼──────────────────┘ │
│                   │              │             │                    │
│                   ▼              │             │                    │
│  ┌────────────────────────────┐  │             │                    │
│  │      Rate Limit Store      │  │             │                    │
│  │  ┌──────────────────────┐  │  │             │                    │
│  │  │   Local (in-memory)  │  │  │             │                    │
│  │  │        OR            │  │  │             │                    │
│  │  │   Redis (shared)     │  │  │             │                    │
│  │  └──────────────────────┘  │  │             │                    │
│  └────────────────────────────┘  │             │                    │
│                                  │             │                    │
└──────────────────────────────────┴─────────────┴────────────────────┘
```

### 5.3 Request Processing Flow

```
Step 1: Request Arrives
        │
        ▼
Step 2: Extract Key (IP, User ID, or custom)
        │
        ▼
Step 3: Check Allow List
        ├── If in allow list → Skip rate limiting → Process request
        │
        ▼
Step 4: Look up current count in store
        │
        ▼
Step 5: Apply rate limit check
        ├── If under limit:
        │   ├── Increment counter
        │   ├── Set/Update TTL
        │   ├── Add rate limit headers
        │   └── Continue to handler
        │
        └── If over limit:
            ├── Add rate limit headers
            ├── Add Retry-After header
            └── Return 429 response
```

### 5.4 Storage Backends

#### Local Store (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fastify Instance                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Local Memory Store                          ││
│  │  ┌───────────────────────────────────────────────────────┐  ││
│  │  │  Key: "192.168.1.1"  →  { count: 45, ttl: 1699574400 }│  ││
│  │  │  Key: "192.168.1.2"  →  { count: 12, ttl: 1699574400 }│  ││
│  │  │  Key: "10.0.0.1"     →  { count: 99, ttl: 1699574400 }│  ││
│  │  └───────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

Pros: Fast, no external dependencies
Cons: Not shared between instances, lost on restart
```

#### Redis Store (Distributed)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Instance 1  │  │  Instance 2  │  │  Instance 3  │
│              │  │              │  │              │
│  Fastify +   │  │  Fastify +   │  │  Fastify +   │
│  Rate Limit  │  │  Rate Limit  │  │  Rate Limit  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────────┬┴─────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │    Redis Server     │
              │  ┌───────────────┐  │
              │  │ Shared Store  │  │
              │  └───────────────┘  │
              └─────────────────────┘

Pros: Shared state, survives restarts, scales horizontally
Cons: Network latency, external dependency
```

### 5.5 Key Generation

How the plugin identifies unique clients:

```
Default: IP Address
┌─────────────────────────────────────────────────┐
│ Request Headers                                  │
│  ├── X-Forwarded-For: 203.0.113.195, 70.41.3.18│
│  ├── X-Real-IP: 203.0.113.195                   │
│  └── Connection IP: 10.0.0.1                    │
│                                                  │
│ Trust Proxy = true:                             │
│  └── Key = "203.0.113.195" (from X-Forwarded)   │
│                                                  │
│ Trust Proxy = false:                            │
│  └── Key = "10.0.0.1" (direct connection)       │
└─────────────────────────────────────────────────┘

Custom Key Function:
┌─────────────────────────────────────────────────┐
│ Custom Logic Examples:                          │
│                                                  │
│ By User ID:                                     │
│  └── Key = request.user.id                      │
│                                                  │
│ By API Key:                                     │
│  └── Key = request.headers['x-api-key']         │
│                                                  │
│ By Route + IP:                                  │
│  └── Key = `${request.url}:${request.ip}`       │
└─────────────────────────────────────────────────┘
```

### 5.6 Hook Integration

Fastify-rate-limit uses the `onRequest` hook by default:

```
Request Lifecycle with Rate Limiting:

 onRequest          onRequest         preValidation      preHandler
    │                   │                  │                 │
    ▼                   ▼                  ▼                 ▼
┌────────┐        ┌──────────┐       ┌──────────┐      ┌──────────┐
│ Logger │   →    │  Rate    │  →    │ Schema   │  →   │  Auth    │
│        │        │  Limit   │       │ Validate │      │ Check    │
└────────┘        └────┬─────┘       └──────────┘      └──────────┘
                       │
                       │ If limit exceeded
                       ▼
                  ┌──────────┐
                  │ 429 Error│
                  │ Response │
                  └──────────┘
                  (Request stops here)
```

---

## 6. Configuration Options Explained

### 6.1 Core Options

| Option       | Type            | Default       | Description                              |
| ------------ | --------------- | ------------- | ---------------------------------------- |
| `max`        | number/function | 1000          | Maximum requests per time window         |
| `timeWindow` | number/string   | 60000 (1 min) | Duration of rate limit window            |
| `ban`        | number          | -             | Requests to block after limit (optional) |
| `cache`      | number          | 5000          | Max number of keys to track              |

### 6.2 Time Window Explained

```
timeWindow: 60000 (milliseconds) = 1 minute

Visual:
├─────────────────── 60 seconds ───────────────────┤
│                                                   │
│  All requests within this period count together  │
│                                                   │
└───────────────────────────────────────────────────┘

Alternative formats:
├── "1 minute"  = 60000ms
├── "5 minutes" = 300000ms
├── "1 hour"    = 3600000ms
└── "1 day"     = 86400000ms
```

### 6.3 Ban Feature

Temporarily blocks repeat offenders:

```
max: 100 requests per minute
ban: 10 additional requests triggers ban

Timeline:
├── Requests 1-100: ✅ Allowed
├── Requests 101-110: ❌ Blocked (429 response)
├── Request 111: 🚫 BANNED (403 Forbidden)
│
│   User is now banned for the remainder of the window
│
└── After window reset: Ban lifted, counter reset
```

### 6.4 Allow List

Exempts certain clients from rate limiting:

```
Allow List Behavior:

Request from 192.168.1.100:
├── Is IP in allowList?
│   ├── YES → Skip rate limiting entirely
│   └── NO  → Apply rate limit rules
```

### 6.5 Custom Key Strategies

```
Strategy 1: By IP (Default)
─────────────────────────────
All requests from same IP share one counter
Good for: Public APIs, general protection

Strategy 2: By User ID
─────────────────────────────
Authenticated users get individual limits
Good for: User-based quotas, SaaS applications

Strategy 3: By API Key
─────────────────────────────
Different API keys get separate limits
Good for: Developer APIs, tiered access

Strategy 4: By Route + IP
─────────────────────────────
Different endpoints have separate limits per IP
Good for: Protecting expensive operations
```

### 6.6 Response Customization

```
When limit is exceeded:

Default Response:
┌─────────────────────────────────────┐
│ HTTP/1.1 429 Too Many Requests      │
│                                     │
│ Headers:                            │
│   X-RateLimit-Limit: 100            │
│   X-RateLimit-Remaining: 0          │
│   X-RateLimit-Reset: 1699574460     │
│   Retry-After: 60                   │
│                                     │
│ Body:                               │
│ {                                   │
│   "statusCode": 429,                │
│   "error": "Too Many Requests",     │
│   "message": "Rate limit exceeded"  │
│ }                                   │
└─────────────────────────────────────┘

Custom Response:
┌─────────────────────────────────────┐
│ Custom message, status code, or     │
│ complete response structure         │
└─────────────────────────────────────┘
```

---

## 7. Rate Limiting Strategies

### 7.1 Global Rate Limiting

Applies same limit to all routes:

```
┌─────────────────────────────────────────────────────────────┐
│                     Global Rate Limit                        │
│                    100 requests/minute                       │
│                                                              │
│  GET /users      ─┐                                         │
│  GET /stories    ─┼── All share the same 100 req/min limit  │
│  POST /chapters  ─┤                                         │
│  DELETE /users   ─┘                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Route-Specific Rate Limiting

Different limits for different endpoints:

```
┌─────────────────────────────────────────────────────────────┐
│                  Route-Specific Limits                       │
│                                                              │
│  GET /stories         → 200 requests/minute (read-heavy)    │
│  POST /stories        → 10 requests/minute (creation limit) │
│  POST /auth/login     → 5 requests/minute (security)        │
│  GET /health          → No limit (monitoring)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 User-Based Rate Limiting

Different limits based on user type:

```
┌─────────────────────────────────────────────────────────────┐
│                   User-Based Limits                          │
│                                                              │
│  Anonymous Users      → 20 requests/minute                  │
│  Free Tier Users      → 100 requests/minute                 │
│  Pro Users            → 1000 requests/minute                │
│  Enterprise Users     → 80000 requests/minute               │
│  Internal Services    → Unlimited                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Hierarchical Rate Limiting

Multiple layers of protection:

```
Layer 1: Global Server Limit
├── 10,000 requests/second across all users
│
├── Layer 2: Per-IP Limit
│   ├── 1,000 requests/minute per IP
│   │
│   ├── Layer 3: Per-User Limit
│   │   ├── 200 requests/minute per user
│   │   │
│   │   └── Layer 4: Per-Route Limit
│   │       ├── POST /upload: 5/minute
│   │       └── POST /login: 3/minute
```

### 7.5 Sliding vs Fixed Window Decision

```
Choose Fixed Window when:
├── Simplicity is priority
├── Exact accuracy isn't critical
├── Memory is constrained
└── Traffic is relatively consistent

Choose Sliding Window when:
├── Preventing burst attacks is critical
├── Fair distribution matters
├── User experience is priority
└── Resources allow for extra computation
```

---

## 8. Best Practices

### 8.1 Setting Appropriate Limits

```
Factors to Consider:

1. Normal Usage Patterns
   ├── Monitor typical user behavior
   ├── Analyze traffic patterns
   └── Set limits above normal, below abuse

2. Endpoint Cost
   ├── Read operations → Higher limits
   ├── Write operations → Lower limits
   ├── CPU-intensive → Lower limits
   └── External API calls → Match external limits

3. User Expectations
   ├── Real-time features → Higher limits
   ├── Batch operations → Lower limits
   └── Critical operations → Stricter limits
```

### 8.2 Communicating Limits

```
Best Practice: Always Include Headers

Response Headers:
├── X-RateLimit-Limit: Shows the maximum
├── X-RateLimit-Remaining: Shows what's left
├── X-RateLimit-Reset: Shows when it resets
└── Retry-After: Tells when to try again

Documentation:
├── Publish rate limits clearly
├── Explain different tiers
└── Provide examples
```

### 8.3 Handling Distributed Systems

```
Single Server:
└── Local memory store works fine

Multiple Servers (Load Balanced):
└── Use Redis for shared state

┌────────┐    ┌────────┐    ┌────────┐
│Server 1│    │Server 2│    │Server 3│
└───┬────┘    └───┬────┘    └───┬────┘
    │             │             │
    └─────────────┼─────────────┘
                  │
                  ▼
           ┌───────────┐
           │   Redis   │
           │  (shared) │
           └───────────┘

Without shared store:
User could get 100 req × 3 servers = 300 requests/minute!
```

### 8.4 Graceful Degradation

```
When Rate Limited:

DON'T:
├── Return cryptic errors
├── Drop connections silently
└── Ban users permanently

DO:
├── Return clear 429 responses
├── Include Retry-After header
├── Log for monitoring
├── Allow immediate retry after window
└── Consider exponential backoff hints
```

### 8.5 Monitoring and Alerts

```
Key Metrics to Track:

1. Rate Limit Hit Rate
   └── % of requests hitting the limit

2. Unique Keys Tracked
   └── Number of IPs/users being rate limited

3. Ban Triggers
   └── Users hitting ban threshold

4. Store Performance
   └── Redis latency, memory usage

Alert Thresholds:
├── > 5% of requests rate limited → Investigate
├── > 20% of requests rate limited → Urgent review
└── Single IP hitting limit repeatedly → Possible attack
```

### 8.6 Security Considerations

```
1. Trust Proxy Settings
   ├── Behind load balancer? Enable trust proxy
   ├── Direct internet? Disable trust proxy
   └── Wrong setting = Rate limit bypass!

2. Key Spoofing Prevention
   ├── Don't trust client-provided keys
   ├── Verify user IDs from auth tokens
   └── Validate API keys server-side

3. Distributed Attack Protection
   ├── Per-IP limits for DDoS
   ├── Per-user limits for authenticated abuse
   └── Global limits for server protection
```

---

## Summary

Rate limiting is a critical component for building robust, secure, and fair APIs. Understanding the different algorithms, their trade-offs, and how tools like `@fastify/rate-limit` implement them allows you to make informed decisions about protecting your application.

**Key Takeaways:**

1. **Rate limiting protects** against abuse, ensures fair resource distribution, and maintains service quality
2. **Different algorithms** suit different needs - sliding window for accuracy, token bucket for controlled bursts
3. **Fastify-rate-limit** provides a flexible, high-performance implementation with multiple storage backends
4. **Configuration should match** your traffic patterns, user expectations, and security requirements
5. **Always communicate limits** through headers and documentation
6. **Monitor actively** to tune limits and detect attacks
