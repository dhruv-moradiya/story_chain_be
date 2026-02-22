# StoryChain API Documentation - Story Feature

This document outlines the Story API endpoints. All routes are prefixed with the base URL (e.g., `/api/v1/stories`).

---

## Table of Contents

- [Story Management](#story-management)
  - [Create Story](#create-story)
  - [Get Story by Slug](#get-story-by-slug)
  - [Search Stories](#search-stories)
  - [List User's Stories](#list-users-stories)
  - [List User's Drafts](#list-users-drafts)
- [Story Configuration](#story-configuration)
  - [Update Story Settings](#update-story-settings)
  - [Get Story Settings](#get-story-settings)
  - [Update Cover Image](#update-cover-image)
  - [Update Card Image](#update-card-image)
  - [Get Upload Signature](#get-upload-signature)
- [Story Content & Structure](#story-content--structure)
  - [Get Story Overview](#get-story-overview)
  - [Get Story Tree](#get-story-tree)
  - [Add Chapter to Story](#add-chapter-to-story)
- [Publishing](#publishing)
  - [Publish Story](#publish-story)
- [Collaborators](#collaborators)
  - [Get Collaborators](#get-collaborators)
  - [Create invitation](#create-invitation)
  - [Accept Invitation](#accept-invitation)
  - [Decline Invitation](#decline-invitation)

---

## Story Management

### Create Story

Creates a new story draft.

- **URL:** `/`
- **Method:** `POST`
- **Auth Required:** Yes (Bearer Token)
- **Body:**
  ```json
  {
    "title": "My Epic Tale",
    "slug": "my-epic-tale",
    "description": "A long story about magic.",
    "coverImage": {
      "url": "https://...",
      "publicId": "..."
    },
    "settings": {
      "isPublic": true,
      "allowBranching": true,
      "requireApproval": false,
      "allowComments": true,
      "allowVoting": true,
      "genres": ["fantasy", "adventure"],
      "contentRating": "teen"
    },
    "tags": ["magic", "dragon"],
    "status": "draft"
  }
  ```
- **Success Response (201):**
  ```json
  {
    "success": true,
    "message": "Story created successfully as a draft.",
    "data": {
      "_id": "67b864...",
      "title": "My Epic Tale",
      "slug": "my-epic-tale",
      "status": "draft",
      "createdAt": "2026-02-21T..."
    }
  }
  ```

### Get Story by Slug

Retrieves full details of a story.

- **URL:** `/slug/:slug`
- **Method:** `GET`
- **Auth Required:** Yes (Bearer Token)
- **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Story retrieved successfully",
    "data": {
      "_id": "...",
      "title": "...",
      "slug": "...",
      "coverImage": { "url": "...", "publicId": "..." },
      "cardImage": { "url": "...", "publicId": "..." },
      "creatorId": "...",
      "status": "published",
      "tags": ["..."],
      "genres": ["..."],
      "contentRating": "...",
      "stats": {
        "totalChapters": 5,
        "totalBranches": 2,
        "totalReads": 100,
        "totalVotes": 10,
        "uniqueContributors": 3,
        "averageRating": 4.5
      },
      "lastActivityAt": "...",
      "publishedAt": "..."
    }
  }
  ```

### Search Stories

Searches for stories by title.

- **URL:** `/search`
- **Method:** `GET`
- **Query Params:**
  - `q` (string, required): Search query.
  - `limit` (number, optional): Max results (default 10).
- **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Found 2 stories",
    "data": [{ "_id": "...", "title": "..." }]
  }
  ```

### List User's Stories

- **URL:** `/my`
- **Method:** `GET`
- **Auth Required:** Yes

### List User's Drafts

- **URL:** `/draft`
- **Method:** `GET`
- **Auth Required:** Yes

---

## Story Configuration

### Update Story Settings

Updates the configuration of a story.

- **URL:** `/slug/:slug/settings`
- **Method:** `POST`
- **Auth Required:** Yes (Owner/Co-Author only)
- **Body:**
  ```json
  {
    "isPublic": true,
    "allowBranching": true,
    "requireApproval": true,
    "allowComments": true,
    "allowVoting": true,
    "genres": ["romance"],
    "contentRating": "mature"
  }
  ```
- **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Story setting updated successfully",
    "data": {
      "settings": { ... },
      "coverImage": { ... },
      "cardImage": { ... }
    }
  }
  ```

### Get Story Settings

- **URL:** `/slug/:slug/settings`
- **Method:** `GET`
- **Auth Required:** Yes

### Update Cover Image

- **URL:** `/slug/:slug/cover-image`
- **Method:** `PATCH`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "coverImage": {
      "url": "https://...",
      "publicId": "..."
    }
  }
  ```

### Update Card Image

- **URL:** `/slug/:slug/card-image`
- **Method:** `PATCH`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "cardImage": {
      "url": "https://...",
      "publicId": "..."
    }
  }
  ```

### Get Upload Signature

Generates a Cloudinary signature for secure uploads.

- **URL:** `/slug/:slug/signature-url`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Upload parameters generated successfully",
    "data": {
      "timestamp": 1234567,
      "signature": "...",
      "apiKey": "...",
      "cloudName": "...",
      "folder": "..."
    }
  }
  ```

---

## Story Content & Structure

### Get Story Overview

A summary view containing creator information and collaborators.

- **URL:** `/slug/:slug/overview`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Story overview fetched successfully",
    "data": {
      "title": "...",
      "slug": "...",
      "description": "...",
      "creator": { "username": "...", "avatarUrl": "..." },
      "collaborators": [ ... ],
      "stats": { ... }
    }
  }
  ```

### Get Story Tree

Retrieves the hierarchical structure of chapters.

- **URL:** `/slug/:slug/tree`
- **Method:** `GET`
- **Auth Required:** Yes
- **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Story tree loaded successfully",
    "data": {
      "slug": "...",
      "chapters": [
        {
          "slug": "root-chapter",
          "title": "Introduction",
          "children": [ ... ]
        }
      ]
    }
  }
  ```

### Add Chapter to Story

Adds a new chapter (root or child).

- **URL:** `/slug/:slug/chapters`
- **Method:** `POST`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "title": "Chapter 2",
    "content": "Once upon a time...",
    "parentChapterSlug": "intro-slug"
  }
  ```
  _(Use `"parentChapterSlug": "root"` or omit it for root chapters)_

---

## Publishing

### Publish Story

Transitions a story from draft to published status.

- **URL:** `/slug/:slug/publish`
- **Method:** `POST`
- **Auth Required:** Yes
- **Success Response (200):**
  ```json
  {
    "success": true,
    "message": "Story published successfully",
    "data": {
      "_id": "...",
      "status": "published",
      "publishedAt": "..."
    }
  }
  ```

---

## Collaborators

### Get Collaborators

- **URL:** `/slug/:slug/collaborators`
- **Method:** `GET`
- **Auth Required:** Yes

### Create Invitation

- **URL:** `/slug/:slug/collaborators`
- **Method:** `POST`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "role": "co_author",
    "invitedUserId": "user_123",
    "invitedUserName": "John Doe"
  }
  ```

### Accept Invitation

- **URL:** `/slug/:slug/collaborators/accept-invitation`
- **Method:** `POST`
- **Auth Required:** Yes

### Decline Invitation

- **URL:** `/slug/:slug/collaborators/decline-invitation`
- **Method:** `POST`
- **Auth Required:** Yes
