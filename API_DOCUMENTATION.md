# Memorise API Documentation

## Overview
This API provides endpoints for managing folders, decks, and flashcards in the Memorise application.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints (except auth endpoints) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```

### Login User
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

---

## Home Endpoints

### Get Home Data
- **GET** `/home`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "folders": [
        {
          "id": "folder1",
          "name": "Biologi",
          "description": "Materi biologi",
          "color": "#3B82F6",
          "decks": [
            {
              "id": "deck1",
              "name": "Sistem Pencernaan",
              "description": "Materi tentang sistem pencernaan",
              "status": "not_studied",
              "cardsCount": 12,
              "createdAt": "2025-10-25T12:00:00Z",
              "updatedAt": "2025-10-25T12:00:00Z"
            }
          ]
        }
      ],
      "unassignedDecks": [
        {
          "id": "deck2",
          "name": "Kosakata Inggris",
          "description": "Kosakata bahasa Inggris",
          "status": "learning",
          "cardsCount": 25,
          "createdAt": "2025-10-25T12:00:00Z",
          "updatedAt": "2025-10-25T12:00:00Z"
        }
      ]
    }
  }
  ```

---

## Folder Endpoints

### Create Folder
- **POST** `/folders`
- **Body:**
  ```json
  {
    "name": "Biologi",
    "description": "Materi biologi",
    "color": "#3B82F6"
  }
  ```

### Get All Folders
- **GET** `/folders`

### Get Folder by ID
- **GET** `/folders/:id`

### Update Folder
- **PATCH** `/folders/:id`
- **Body:**
  ```json
  {
    "name": "Biologi Dasar",
    "description": "Materi biologi dasar",
    "color": "#FF6B6B"
  }
  ```

### Delete Folder
- **DELETE** `/folders/:id`

### Get Folder Statistics
- **GET** `/folders/:id/stats`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "folderId": "folder1",
      "totalDecks": 3,
      "totalCards": 42
    }
  }
  ```

---

## Deck Endpoints

### Create Deck
- **POST** `/decks`
- **Body:**
  ```json
  {
    "name": "Sistem Pencernaan",
    "description": "Materi tentang sistem pencernaan manusia",
    "folderId": "folder1",
    "isDraft": false
  }
  ```

### Get All Decks
- **GET** `/decks`
- **Query Parameters:**
  - `folderId`: Filter by folder ID
  - `unassigned`: Filter unassigned decks (true/false)
  - `isDraft`: Filter draft decks (true/false)

### Get Deck by ID
- **GET** `/decks/:id?include=cards,stats`
- **Query Parameters:**
  - `include`: Comma-separated list of related data to include (cards, stats)
- **Response with include=cards,stats:**
  ```json
  {
    "success": true,
    "data": {
      "id": "deck1",
      "name": "Sistem Pencernaan",
      "description": "Materi tentang sistem pencernaan manusia",
      "folderId": "folder1",
      "isDraft": false,
      "cards": [
        {
          "id": "card1",
          "front": "Apa itu DNA?",
          "back": "Materi genetik yang mengatur sifat makhluk hidup",
          "status": "not_studied",
          "difficulty": "medium"
        }
      ],
      "stats": {
        "deckId": "deck1",
        "totalCards": 10,
        "progress": {
          "notStudied": 6,
          "learning": 3,
          "mastered": 1
        }
      }
    }
  }
  ```

### Update Deck
- **PATCH** `/decks/:id`
- **Body:**
  ```json
  {
    "name": "Sistem Pencernaan Manusia",
    "description": "Materi lengkap tentang sistem pencernaan",
    "folderId": "folder2"
  }
  ```

### Move Deck
- **PATCH** `/decks/:id/move`
- **Body:**
  ```json
  {
    "folderId": "folder2"
  }
  ```

### Delete Deck
- **DELETE** `/decks/:id`

### Get Deck Statistics
- **GET** `/decks/:id/stats`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "deckId": "deck1",
      "totalCards": 10,
      "progress": {
        "notStudied": 6,
        "learning": 3,
        "mastered": 1
      }
    }
  }
  ```

### Get Overall Statistics
- **GET** `/decks/stats`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "totalFolders": 5,
      "totalDecks": 12,
      "totalCards": 250,
      "progress": {
        "notStudied": 180,
        "learning": 50,
        "mastered": 20
      }
    }
  }
  ```

---

## Card Endpoints

### Create Card
- **POST** `/cards`
- **Body:**
  ```json
  {
    "deckId": "deck1",
    "front": "Apa itu Mitokondria?",
    "back": "Pusat energi sel",
    "imageFront": "https://example.com/mito.png",
    "imageBack": "https://example.com/energy.png",
    "notes": "Gunakan gambar sel untuk membantu visualisasi",
    "tags": ["biologi", "sel"]
  }
  ```

### Get Cards by Deck
- **GET** `/cards/deck/:deckId`

### Get Card by ID
- **GET** `/cards/:id`

### Update Card
- **PATCH** `/cards/:id`
- **Body:**
  ```json
  {
    "front": "Apa fungsi Mitokondria?",
    "back": "Tempat berlangsungnya respirasi sel dan produksi energi",
    "notes": "Perhatikan proses ATP di diagram"
  }
  ```

### Delete Card
- **DELETE** `/cards/:id`

### Update Card Status
- **PATCH** `/cards/:id/status`
- **Body:**
  ```json
  {
    "status": "learning"
  }
  ```

### Update Card Study Data
- **PATCH** `/cards/:id/study-data`
- **Body:**
  ```json
  {
    "timesStudied": 5,
    "lastStudied": "2025-10-25T12:00:00Z",
    "nextReview": "2025-10-27T12:00:00Z",
    "easeFactor": 2.3,
    "interval": 2
  }
  ```

### Add Tag to Card
- **POST** `/cards/:id/tags`
- **Body:**
  ```json
  {
    "tag": "biologi"
  }
  ```

### Remove Tag from Card
- **DELETE** `/cards/:id/tags/:tag`

### Get Card Statistics for Deck
- **GET** `/cards/deck/:deckId/stats`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "deckId": "deck1",
      "totalCards": 10,
      "progress": {
        "notStudied": 6,
        "learning": 3,
        "mastered": 1
      }
    }
  }
  ```

### Get Cards by Status
- **GET** `/cards/deck/:deckId/status/:status`
- **Status values:** `not_studied`, `learning`, `mastered`

### Bulk Update Cards
- **PATCH** `/cards/bulk`
- **Body:**
  ```json
  {
    "cardIds": ["card1", "card2", "card3"],
    "updateData": {
      "status": "learning",
      "difficulty": "medium"
    }
  }
  ```

### Bulk Delete Cards
- **DELETE** `/cards/bulk`
- **Body:**
  ```json
  {
    "cardIds": ["card1", "card2", "card3"]
  }
  ```


---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Data Models

### Folder
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "color": "string (hex color)",
  "userId": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Deck
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "userId": "string",
  "folderId": "string | null",
  "isDraft": "boolean",
  "settings": {
    "studyMode": "normal | spaced_repetition",
    "difficulty": "easy | medium | hard"
  },
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Card
```json
{
  "id": "string",
  "front": "string",
  "back": "string",
  "deckId": "string",
  "userId": "string",
  "imageFront": "string | null",
  "imageBack": "string | null",
  "notes": "string",
  "status": "not_studied | learning | mastered",
  "difficulty": "easy | medium | hard",
  "studyData": {
    "timesStudied": "number",
    "lastStudied": "datetime | null",
    "nextReview": "datetime | null",
    "easeFactor": "number",
    "interval": "number"
  },
  "tags": ["string"],
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

---

## Usage Examples

### Get Deck with Cards and Stats
```bash
GET /api/decks/64f1a2b3c4d5e6f7g8h9i0j1?include=cards,stats
```

### Get Deck with Only Cards
```bash
GET /api/decks/64f1a2b3c4d5e6f7g8h9i0j1?include=cards
```

### Get Deck with Only Stats
```bash
GET /api/decks/64f1a2b3c4d5e6f7g8h9i0j1?include=stats
```

### Get Overall Statistics
```bash
GET /api/decks/stats
```

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. All IDs are MongoDB ObjectIds (24-character hex strings)
3. Image URLs should be valid HTTP/HTTPS URLs
4. Tags are case-sensitive and trimmed
5. Soft delete is used for all resources (isDeleted flag)
6. All endpoints support pagination where applicable
7. Rate limiting is applied to all API endpoints
8. CORS is configured for frontend integration
9. Use `include` parameter to fetch related data in a single request
10. Deck status has been removed - only cards have status (not_studied, learning, mastered)
