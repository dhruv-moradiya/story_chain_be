# Notifications & Collaboration Invitations API Documentation

This document provides details for the Frontend (FE) team on how to fetch notifications and handle collaboration invitations (Accept/Decline).

---

## 1. Notification Fetch API

Used to retrieve all notifications for the currently authenticated user.

- **Endpoint**: `/api/notifications`
- **Method**: `GET`
- **Authentication**: Required (Bearer Token)
- **Rate Limit**: Authenticated

### Request
- **Headers**: 
  - `Authorization: Bearer <token>`
- **Payload**: None

### Response Structure
- **Success (200 OK)**
```json
{
  "success": true,
  "code": "FETCHED",
  "statusCode": 200,
  "message": "Notifications fetched successfully.",
  "data": [
    {
      "_id": "65f1a...", // Notification ID
      "userId": "user_25...", // Receiver's Clerk ID
      "type": "collab_invitation", // Enum (see below)
      "relatedStorySlug": "the-lost-chronicles", // Story slug related to notification
      "relatedChapterSlug": null,
      "relatedPullRequestId": null,
      "relatedCommentId": null,
      "relatedUserId": "user_trigger_id", // Who triggered the notification
      "title": "New Collaboration Invitation",
      "message": "Dhruv invited you to collaborate on 'The Lost Chronicles'",
      "isRead": false,
      "readAt": null,
      "actionUrl": "/stories/slug/the-lost-chronicles", // FE path to redirect user
      "createdAt": "2024-03-14T10:00:00.000Z",
      "updatedAt": "2024-03-14T10:00:00.000Z"
    }
  ]
}
```

### Notification Types (`type`)
The `type` field can be one of the following:
- `collab_invitation` (Most relevant for invitations)
- `new_branch`, `chapter_upvote`, `story_milestone`, `story_continued`
- `pr_opened`, `pr_approved`, `pr_rejected`, `pr_merged`, `pr_commented`
- `comment_reply`, `comment_mention`, `mention`, `new_follower`, `badge_earned`

---

## 2. Accept Collaboration Invitation

Used to accept an invitation to collaborate on a story.

- **Endpoint**: `/api/stories/slug/:slug/collaborators/accept-invitation`
- **Method**: `POST`
- **Authentication**: Required (Bearer Token)
- **Parameters**:
  - `slug`: The slug of the story (retrieved from `relatedStorySlug` in notification or URL).

### Request
- **Headers**: 
  - `Authorization: Bearer <token>`
- **Payload**: None

### Response Structure
- **Success (200 OK)**
```json
{
  "success": true,
  "code": "UPDATED",
  "statusCode": 200,
  "message": "Invitation accepted successfully",
  "data": {
    "storyId": "65f1...",
    "userId": "user_25...",
    "role": "writer", // "writer", "editor", etc.
    "status": "accepted",
    "updatedAt": "2024-03-14T11:00:00.000Z"
  }
}
```

---

## 3. Decline (Reject) Collaboration Invitation

Used to decline an invitation to collaborate on a story.

- **Endpoint**: `/api/stories/slug/:slug/collaborators/decline-invitation`
- **Method**: `POST`
- **Authentication**: Required (Bearer Token)
- **Parameters**:
  - `slug`: The slug of the story.

### Request
- **Headers**: 
  - `Authorization: Bearer <token>`
- **Payload**: None

### Response Structure
- **Success (200 OK)**
```json
{
  "success": true,
  "code": "UPDATED",
  "statusCode": 200,
  "message": "Invitation declined successfully",
  "data": {
    "storyId": "65f1...",
    "userId": "user_25...",
    "role": "writer",
    "status": "declined",
    "updatedAt": "2024-03-14T11:00:00.000Z"
  }
}
```

---

## Error Responses (Common)

All APIs follow the standard error format:

- **Unauthorized (401)**: Missing or invalid token.
- **Not Found (404)**: Story or notification does not exist.
- **Conflict (409)**: Invitation already accepted or declined.
- **Internal Error (500)**: Server-side issue.

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "statusCode": 401,
  "message": "Authentication required",
  "errors": []
}
```
