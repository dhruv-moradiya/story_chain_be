# Reading History & Time Tracking API Design

## Problem Statement

We need to accurately track:

1.  **Which chapters** a user has read.
2.  **How much time** a user spends reading a story.
3.  **Resume position** (current chapter).

Tracking "Reading Time" on the web is tricky because:

- Users leave tabs open (idle time).
- Users switch tabs (visibility change).
- Browsers crash or close without sending a "stop" signal.

## Recommended Solution: The "Heartbeat" (Ping) Pattern

Instead of trying to capture a perfect "Start" and "Stop" timestamp (which fails if the browser crashes), the client should send a **"Heartbeat"** pulse to the server periodically while the user is actively reading.

### How it works

1.  **Client-Side**:
    - The frontend detects if the user is **active** (mouse movements, scroll) and if the tab is **visible** (Page Visibility API).
    - If active, the client sends a `POST /heartbeat` request every **30 seconds**.
2.  **Server-Side**:
    - Receives the heartbeat.
    - Increments the `totalReadTime` by the heartbeat interval (e.g., +30s).
    - Updates `lastReadAt` to `Date.now()`.

### Why this is the best approach

- **Crash Proof**: If the browser crashes, we only lose the last ~30 seconds of tracked time, not the whole session.
- **Idle Handling**: The frontend can stop sending heartbeats if the user is AFK (Away From Keyboard) or looking at another tab.
- **Simplicity**: The server logic is just "increment counter", avoiding complex timestamp math and timezone issues.

---

## Detailed Implementation Plan

### 1. Database Model Updates

Your `ReadingHistory` model is already well-structured for this.

```typescript
// src/models/readingHistory.model.ts

// The relevant fields you already have:
totalReadTime: { type: Number, default: 0 }, // Stores total seconds/milliseconds
lastReadAt: { type: Date, default: Date.now },
currentChapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' }
```

### 2. API Endpoints

We need two main endpoints for this feature.

#### A. Record Heartbeat (Time Tracking)

**Updates reading time and current position.**

- **Endpoint**: `POST /api/v1/history/heartbeat`
- **Auth**: Required
- **Body**:
  ```json
  {
    "storySlug": "my-awesome-story",
    "chapterId": "507f1f77bcf86cd799439011",
    "duration": 30 // seconds
  }
  ```
- **Logic**:
  1.  Find `ReadingHistory` by `userId` and `storyId`.
  2.  If not found, create it.
  3.  **Update**:
      - `$inc: { totalReadTime: 30 }`
      - `$set: { lastReadAt: new Date(), currentChapterId: chapterId }`
      - Add `chapterId` to `chaptersRead` list if not already present (addToSet).

#### B. Mark Chapter as Complete

**Explicitly marks a chapter as "Finished" (e.g., user clicks "Next Chapter").**

- **Endpoint**: `POST /api/v1/history/complete`
- **Body**:
  ```json
  {
    "storySlug": "my-awesome-story",
    "chapterId": "507f1f77bcf86cd799439011"
  }
  ```
- **Logic**:
  - Update `completedPaths` or specific chapter status.
  - Useful for analytics (Completion Rate).

---

### 3. Frontend Requirements (The "Smart" Part)

The server trusts the client to send accurate heartbeats. Result accuracy depends on the frontend implementation.

#### Key Mechanics to Implement on Frontend:

1.  **Page Visibility API**:
    - If `document.hidden` is true (user switched tabs), **STOP** the heartbeat timer.
    - Resume when `document.hidden` becomes false.

2.  **Idle Detection**:
    - Listen for `mousemove`, `keydown`, `scroll`, `touchstart`.
    - If no events occur for **60 seconds**, consider the user "Idle" and **STOP** the heartbeat.
    - Resume on next user interaction.

3.  **The Loop**:

    ```javascript
    setInterval(() => {
      if (isTabVisible && !isUserIdle) {
        sendHeartbeat({ duration: 30 });
      }
    }, 30000); // Run every 30 seconds
    ```

4.  **Debouncing**:
    - Don't spam the server. 30s or 60s intervals are standard.

---

### 4. Security & Validation

To prevent abuse (e.g., a script sending 1000 heartbeats a second to fake reading time):

1.  **Rate Limiting**:
    - Using Redis or similar, allow only **1 heartbeat per 20 seconds** from a user for a specific story.
2.  **Sanity Check**:
    - If the client sends `duration: 3000` (50 mins) in a single request, reject it. Cap the allowed increment (e.g., max 60s per call).

---

## Alternative: Start/Stop Timestamps (NOT Recommended)

You _could_ send a `start_reading` timestamp on load and `end_reading` on unload.

- **Cons**:
  - `navigator.sendBeacon` (on unload) is unreliable on mobile (iOS specifically).
  - If the browser crashes, you lose the entire session's data.
  - Hard to detect "Idle" time (user left computer on for 3 hours).

**Verdict**: Stick to the **Heartbeat** approach. It is the industry standard for engagement tracking (YouTube watch time, Medium reading time, etc.).
