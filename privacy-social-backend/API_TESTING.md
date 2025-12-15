# API Testing Guide

## Base URL
```
http://localhost:8080
```

## 1. Authentication

### Create User (Sign Up)
```bash
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "username": "testuser",
    "full_name": "Test User",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "password": "password123"
  }'
```

## 2. Profile Management

### Update Profile
```bash
curl -X PUT http://localhost:8080/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "full_name": "Updated Name",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "My bio"
  }'
```

## 3. Location Update (Privacy-First)

```bash
curl -X POST http://localhost:8080/location/ping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194
  }'
```

## 4. Stories

### Create Story
```bash
curl -X POST http://localhost:8080/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "media_url": "https://example.com/image.jpg",
    "media_type": "image",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "caption": "Beautiful day in SF!"
  }'
```

### Get Feed (Dynamic Radius Discovery)
```bash
curl -X GET "http://localhost:8080/feed?latitude=37.7749&longitude=-122.4194" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 5. Connections

### Send Connection Request
```bash
curl -X POST http://localhost:8080/connections/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "target_user_id": "TARGET_USER_UUID"
  }'
```

### Accept/Block Connection
```bash
curl -X POST http://localhost:8080/connections/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "requester_id": "REQUESTER_UUID",
    "status": "accepted"
  }'
```

## 6. Messaging

### Get Chat History
```bash
curl -X GET "http://localhost:8080/messages?user_id=OTHER_USER_UUID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### WebSocket Chat
```
ws://localhost:8080/ws/chat
```

## 7. Safety & Reporting

### Report User/Story
```bash
curl -X POST http://localhost:8080/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "target_user_id": "USER_UUID",
    "reason": "spam",
    "description": "Posting inappropriate content"
  }'
```

## Enhancements Implemented

✅ **Structured Logging**: All logs use zerolog with structured fields
✅ **Graceful Shutdown**: Server handles SIGTERM/SIGINT gracefully
✅ **Story Expiry**: Background worker auto-deletes expired stories
✅ **Profile Updates**: Users can update name, avatar, bio
✅ **Test Coverage**: 77-80% coverage on core modules
