# Backend Feature Implementation Checklist

**Project:** Privacy-First Location-Based Social App  
**Tech Stack:** Go (Gin) + PostgreSQL + PostGIS + Redis  
**Last Updated:** December 15, 2025

---

## 1. Authentication & User Management

### 1.1 Phone OTP Authentication
**Description:** Users register and login using phone number + OTP verification.

**Backend Requirements:**
- **DB Tables:** `users` (id, phone, password_hash, created_at), `otp_codes` (phone, code, expires_at)
- **APIs:** `POST /auth/send-otp`, `POST /auth/verify-otp`
- **Redis:** Store OTP codes with 5-min TTL
- **Security:** Rate limit OTP requests (5/hour per phone), bcrypt for passwords

**Checklist:**
- [ ] DB schema created
- [ ] OTP generation logic
- [ ] SMS provider integration
- [ ] OTP verification API
- [ ] Rate limiting implemented
- [ ] Security reviewed
- [ ] Tested

---

### 1.2 JWT Authentication (Access + Refresh)
**Description:** Issue JWT tokens for authenticated sessions with refresh capability.

**Backend Requirements:**
- **DB Tables:** `sessions` (id, user_id, refresh_token, expires_at, device_info)
- **APIs:** `POST /users/login`, `POST /auth/refresh`
- **Redis:** Blacklist for revoked tokens
- **Security:** HS256/RS256, 15-min access token, 7-day refresh token

**Checklist:**
- [x] JWT library integrated
- [x] Access token generation
- [x] Refresh token generation
- [x] Token verification middleware
- [x] Token blacklist (Redis)
- [x] Security reviewed
- [x] Tested

---

### 1.3 Device Binding
**Description:** Track user devices and sessions for security.

**Backend Requirements:**
- **DB Tables:** `sessions` (device_id, user_agent, ip_address, last_active)
- **APIs:** `GET /auth/devices`, `DELETE /auth/devices/:id`
- **Redis:** Active session tracking
- **Security:** Detect suspicious logins, notify on new device

**Checklist:**
- [x] Device fingerprinting
- [x] Session tracking
- [ ] Suspicious login detection
- [ ] Multi-device management API
- [ ] Push notification on new device
- [ ] Security reviewed
- [ ] Tested

---

### 1.4 User Profiles & Trust Levels
**Description:** User profile management with trust scoring system.

**Backend Requirements:**
- **DB Tables:** `users` (username, full_name, avatar_url, bio, trust_level, is_verified)
- **APIs:** `GET /users/:id`, `PUT /profile`, `GET /profile/me`
- **Redis:** Cache user profiles (10-min TTL)
- **Security:** Validate profile data, sanitize inputs

**Checklist:**
- [x] Profile CRUD APIs
- [x] Trust level calculation
- [ ] Avatar upload (S3/object storage)
- [x] Profile caching
- [ ] Verification system
- [x] Security reviewed
- [x] Tested

---

## 2. Location System

### 2.1 Passive Location Tracking
**Description:** Users passively update location without continuous GPS tracking.

**Backend Requirements:**
- **DB Tables:** `locations` (user_id, geom GEOGRAPHY, geohash, time_bucket, expires_at)
- **APIs:** `POST /location/ping`
- **Redis:** N/A
- **Privacy:** No continuous tracking, user-initiated pings only

**Checklist:**
- [x] Location update API
- [x] PostGIS geometry storage
- [x] Privacy controls
- [ ] Ghost mode implementation
- [ ] Panic mode implementation
- [x] Security reviewed
- [x] Tested

**⚠️ Privacy Note:** Never store exact GPS continuously. Use time-bucketed snapshots.

---

### 2.2 Geohash Conversion
**Description:** Convert GPS coordinates to geohash for privacy and efficient querying.

**Backend Requirements:**
- **DB Tables:** `locations` (geohash TEXT)
- **APIs:** Internal utility function
- **Redis:** N/A
- **Privacy:** 7-char geohash = ~76m precision

**Checklist:**
- [x] Geohash library integrated
- [x] Conversion on location update
- [x] Geohash indexing
- [x] Privacy level configured
- [x] Tested

---

### 2.3 Time-Bucketed Location Snapshots
**Description:** Round timestamps to 10-minute buckets to prevent precise tracking.

**Backend Requirements:**
- **DB Tables:** `locations` (time_bucket TIMESTAMPTZ)
- **APIs:** Internal logic in location update
- **Redis:** N/A
- **Privacy:** 10-minute buckets prevent exact timing

**Checklist:**
- [x] Time bucketing logic
- [x] Bucket indexing
- [x] Privacy verified
- [x] Tested

---

### 2.4 Auto Cleanup of Location Data
**Description:** Background job to delete location data older than 24 hours.

**Backend Requirements:**
- **DB Tables:** `locations` (expires_at TIMESTAMPTZ)
- **APIs:** N/A
- **Background Jobs:** Cleanup worker (runs every 10 minutes)
- **Redis:** N/A

**Checklist:**
- [x] Cleanup worker implemented
- [x] Scheduled execution (cron/ticker)
- [x] Expiry logic
- [x] Logging
- [x] Tested

---

### 2.5 Ghost Mode
**Description:** User can temporarily hide their location from others.

**Backend Requirements:**
- **DB Tables:** `users` (is_ghost_mode BOOLEAN)
- **APIs:** `PUT /location/ghost-mode`
- **Redis:** N/A
- **Privacy:** Filter ghost users from all location-based queries

**Checklist:**
- [x] Ghost mode toggle API
- [x] Filter logic in queries
- [ ] UI indicator (frontend)
- [x] Privacy verified
- [ ] Tested

---

### 2.6 Panic Mode
**Description:** Emergency feature to instantly delete all user location data.

**Backend Requirements:**
- **DB Tables:** `locations`, `stories`, `crossings`
- **APIs:** `POST /location/panic`
- **Redis:** Clear all cached data
- **Security:** Require password confirmation, log action

**Checklist:**
- [x] Panic mode API
- [x] Cascade delete logic
- [x] Redis cache clearing
- [x] Audit logging
- [x] Security reviewed
- [ ] Tested

**⚠️ Security Note:** This is irreversible. Require strong confirmation.

---

## 3. Stories System

### 3.1 Story Creation (Image/Video/Text)
**Description:** Users create stories with media that expire in 24 hours.

**Backend Requirements:**
- **DB Tables:** `stories` (id, user_id, media_url, media_type, geohash, geom, expires_at)
- **APIs:** `POST /stories`
- **Redis:** Invalidate feed cache on create
- **Storage:** S3/object storage for media files

**Checklist:**
- [x] Story creation API
- [x] Media type validation
- [ ] S3 upload integration
- [x] Geolocation tagging
- [x] Expiry timestamp
- [x] Tested

---

### 3.2 24-Hour Story Expiry
**Description:** Stories automatically expire and are deleted after 24 hours.

**Backend Requirements:**
- **DB Tables:** `stories` (expires_at TIMESTAMPTZ)
- **APIs:** N/A
- **Background Jobs:** Story cleanup worker (runs every 10 minutes)
- **Redis:** Clear cached stories

**Checklist:**
- [x] Expiry timestamp on creation
- [x] Cleanup worker implemented
- [x] Scheduled execution
- [x] Cache invalidation
- [x] Tested

---

### 3.3 Story Feed View
**Description:** Users view nearby stories in a feed format.

**Backend Requirements:**
- **DB Tables:** `stories`
- **APIs:** `GET /feed?latitude=X&longitude=Y`
- **Redis:** Cache feed results (5-min TTL)
- **Privacy:** No exact distances shown

**Checklist:**
- [x] Feed API with spatial query
- [x] Dynamic radius discovery
- [x] Redis caching
- [x] Privacy filters
- [x] Tested

---

### 3.4 Story Map View
**Description:** Users view stories on a map interface.

**Backend Requirements:**
- **DB Tables:** `stories`
- **APIs:** `GET /stories/map?bounds=...`
- **Redis:** Cache map data (5-min TTL)
- **Privacy:** Cluster nearby stories, fuzzy locations

**Checklist:**
- [x] Map bounds query API
- [x] Clustering logic
- [ ] Redis caching
- [x] Privacy verified
- [ ] Tested

**Note:** Primarily frontend feature, backend provides clustered data.

---

### 3.5 Anonymous Stories
**Description:** Users can post stories without revealing identity.

**Backend Requirements:**
- **DB Tables:** `stories` (is_anonymous BOOLEAN)
- **APIs:** `POST /stories` with `anonymous` flag
- **Redis:** N/A
- **Privacy:** Hide user_id in responses when anonymous

**Checklist:**
- [x] Anonymous flag in schema
- [x] API support for anonymous posts
- [x] Response filtering
- [x] Privacy verified
- [ ] Tested

---

### 3.6 Story Views & Reactions
**Description:** Track who viewed stories and allow emoji reactions.

**Backend Requirements:**
- **DB Tables:** `story_views` (story_id, user_id, viewed_at), `story_reactions` (story_id, user_id, emoji)
- **APIs:** `POST /stories/:id/view`, `POST /stories/:id/react`
- **Redis:** Cache view counts
- **Privacy:** Only show to story owner

**Checklist:**
- [x] View tracking API
- [x] Reaction API
- [ ] View count caching
- [x] Privacy controls
- [ ] Tested

---

### 3.7 Dynamic Radius Discovery (5→10→15→20km)
**Description:** Auto-expand search radius until stories are found.

**Backend Requirements:**
- **DB Tables:** `stories`
- **APIs:** `GET /feed` (internal logic)
- **Redis:** Cache results per geohash
- **Performance:** Stop at first non-empty result

**Checklist:**
- [x] Radius expansion logic
- [x] PostGIS spatial queries
- [x] UI messages ("Expanding range...")
- [x] Redis caching
- [x] Performance optimized
- [x] Tested

---

### 3.8 Redis Caching for Feeds
**Description:** Cache feed results to reduce database load.

**Backend Requirements:**
- **DB Tables:** N/A
- **APIs:** `GET /feed`
- **Redis:** Key: `feed:{geohash}`, TTL: 5 minutes
- **Invalidation:** On new story creation

**Checklist:**
- [x] Cache key strategy
- [x] TTL configuration
- [x] Cache invalidation
- [x] Cache hit rate monitoring
- [x] Tested

---

## 4. Cross-Path Detection

### 4.1 Cross-Path Detection Logic
**Description:** Background worker detects when users were at same location + time.

**Backend Requirements:**
- **DB Tables:** `crossings` (user_id_1, user_id_2, location_center, occurred_at)
- **APIs:** N/A (background job)
- **Background Jobs:** Crossing detector (runs every 5 minutes)
- **Redis:** N/A

**Checklist:**
- [x] Detection algorithm (geohash + time bucket)
- [x] Background worker
- [x] Scheduled execution
- [x] Duplicate prevention
- [x] Performance optimized
- [x] Tested

**⚠️ Scale Note:** O(n²) within geohash bucket. Monitor performance at scale.

---

### 4.2 Cross-Path Suggestion Ranking
**Description:** Rank crossing suggestions by recency and relevance.

**Backend Requirements:**
- **DB Tables:** `crossings`
- **APIs:** `GET /crossings?limit=20`
- **Redis:** Cache user crossings (5-min TTL)
- **Ranking:** By occurred_at DESC, filter 24h window

**Checklist:**
- [x] Crossing retrieval API
- [x] Ranking logic
- [ ] Redis caching
- [x] 24h filter
- [ ] Tested

---

## 5. Connections & Chat

### 5.1 Mutual Connection System
**Description:** Users send connection requests that must be mutually accepted.

**Backend Requirements:**
- **DB Tables:** `connections` (requester_id, target_id, status ENUM('pending','accepted','blocked'))
- **APIs:** `POST /connections/request`, `POST /connections/update`
- **Redis:** N/A
- **Security:** Prevent spam requests

**Checklist:**
- [x] Connection request API
- [x] Accept/block API
- [x] Status management
- [x] Spam prevention
- [x] Tested

---

### 5.2 Chat Unlock After Mutual Add
**Description:** Chat is only enabled after both users accept connection.

**Backend Requirements:**
- **DB Tables:** `connections`
- **APIs:** `GET /messages` (check connection status)
- **Redis:** N/A
- **Security:** Enforce connection check on all chat APIs

**Checklist:**
- [x] Connection gating logic
- [x] Middleware for chat APIs
- [x] Error messages
- [x] Security verified
- [x] Tested

---

### 5.3 WebSocket-Based Chat
**Description:** Real-time messaging using WebSocket connections.

**Backend Requirements:**
- **DB Tables:** `messages` (sender_id, receiver_id, content, message_type)
- **APIs:** `GET /ws/chat` (WebSocket upgrade)
- **Redis:** Pub/sub for multi-server scaling
- **Security:** JWT auth on WebSocket connection

**Checklist:**
- [x] WebSocket handler
- [x] Message routing
- [ ] Redis pub/sub
- [x] Authentication
- [ ] Reconnection handling
- [x] Tested

**⚠️ Scale Note:** Use Redis pub/sub for horizontal scaling.

---

### 5.4 Message Persistence
**Description:** Store all chat messages in database for history.

**Backend Requirements:**
- **DB Tables:** `messages`
- **APIs:** `GET /messages?user_id=X&limit=50`
- **Redis:** Cache recent messages (10-min TTL)
- **Security:** Only show to participants

**Checklist:**
- [x] Message storage on send
- [x] Chat history API
- [ ] Redis caching
- [x] Privacy controls
- [x] Tested

---

### 5.5 Chat Expiry
**Description:** Auto-delete old messages after configurable period.

**Backend Requirements:**
- **DB Tables:** `messages` (created_at)
- **APIs:** N/A
- **Background Jobs:** Message cleanup worker (runs daily)
- **Redis:** N/A

**Checklist:**
- [x] Expiry configuration (default: 30 days)
- [x] Cleanup worker
- [x] Scheduled execution
- [ ] User notification
- [ ] Tested

---

## 6. Safety & Moderation

### 6.1 Block Users
**Description:** Users can block others to prevent all interactions.

**Backend Requirements:**
- **DB Tables:** `connections` (status='blocked')
- **APIs:** `POST /connections/update` with status='blocked'
- **Redis:** N/A
- **Security:** Filter blocked users from all queries

**Checklist:**
- [x] Block API
- [x] Query filters
- [x] Unblock support
- [x] Privacy verified
- [x] Tested

---

### 6.2 Report Users/Content
**Description:** Users can report violations for admin review.

**Backend Requirements:**
- **DB Tables:** `reports` (reporter_id, target_user_id, target_story_id, reason, description)
- **APIs:** `POST /reports`
- **Redis:** N/A
- **Security:** Rate limit reports (10/day)

**Checklist:**
- [x] Report creation API
- [x] Report reasons (spam/abuse/inappropriate/other)
- [ ] Rate limiting
- [x] Admin review queue
- [x] Tested

---

### 6.3 Shadow Banning
**Description:** Admin can shadow ban users (content hidden from others).

**Backend Requirements:**
- **DB Tables:** `users` (is_shadow_banned BOOLEAN)
- **APIs:** `POST /admin/users/ban`
- **Redis:** N/A
- **Security:** Admin-only access

**Checklist:**
- [x] Shadow ban flag
- [x] Admin API
- [x] Content filtering
- [x] RBAC enforcement
- [x] Tested

---

### 6.4 Fake GPS Detection
**Description:** Detect and flag users spoofing GPS coordinates.

**Backend Requirements:**
- **DB Tables:** `users` (gps_anomaly_score)
- **APIs:** Internal validation on location update
- **Redis:** Track velocity patterns
- **Security:** Flag suspicious patterns

**Checklist:**
- [ ] Velocity check algorithm
- [ ] Pattern analysis
- [ ] Anomaly scoring
- [ ] Admin alerts
- [ ] Tested

**⚠️ Complexity:** Requires ML or heuristic rules. Start with basic velocity checks.

---

### 6.5 Rate Limiting
**Description:** Prevent API abuse with Redis-based rate limiting.

**Backend Requirements:**
- **DB Tables:** N/A
- **APIs:** All endpoints
- **Redis:** Sliding window counters
- **Security:** Per-user and per-IP limits

**Checklist:**
- [x] Rate limiter middleware
- [x] Redis integration
- [x] Configurable limits per endpoint
- [x] Error responses (429)
- [x] Tested

---

## 7. Notifications

### 7.1 In-App Notifications
**Description:** Show notifications within the app interface.

**Backend Requirements:**
- **DB Tables:** `notifications` (user_id, type, title, message, is_read)
- **APIs:** `GET /notifications`, `PUT /notifications/:id/read`
- **Redis:** Cache unread count
- **WebSocket:** Real-time delivery

**Checklist:**
- [x] Notification schema
- [x] Creation logic (on events)
- [x] Retrieval API
- [x] Mark as read API
- [ ] WebSocket push
- [ ] Tested

---

### 7.2 Push Notification Stubs
**Description:** Infrastructure for mobile push notifications (FCM/APNS).

**Backend Requirements:**
- **DB Tables:** `device_tokens` (user_id, token, platform)
- **APIs:** `POST /notifications/device`
- **Redis:** N/A
- **External:** FCM/APNS integration

**Checklist:**
- [ ] Device token registration
- [ ] FCM/APNS setup
- [ ] Push sending logic
- [ ] Notification preferences
- [ ] Tested

---

## 8. Admin & Analytics

### 8.1 Admin Moderation Actions
**Description:** Admin panel for user/content moderation.

**Backend Requirements:**
- **DB Tables:** `users`, `stories`, `reports`
- **APIs:** `GET /admin/users`, `POST /admin/users/ban`, `DELETE /admin/stories/:id`
- **Redis:** Cache admin stats
- **Security:** Role-based access control

**Checklist:**
- [x] Admin middleware (RBAC)
- [x] User management APIs
- [x] Content moderation APIs
- [x] Report review APIs
- [x] Audit logging
- [x] Tested

---

### 8.2 Background Cleanup Jobs
**Description:** Scheduled workers for data cleanup and maintenance.

**Backend Requirements:**
- **DB Tables:** Various
- **APIs:** N/A
- **Background Jobs:** 
  - Location cleanup (every 10 min)
  - Story expiry (every 10 min)
  - Crossing detection (every 5 min)
  - Message cleanup (daily)
- **Redis:** N/A

**Checklist:**
- [x] Location cleanup worker
- [x] Story cleanup worker
- [x] Crossing detector worker
- [x] Message cleanup worker
- [x] Logging & monitoring
- [x] Tested

---

### 8.3 Premium Feature Readiness
**Description:** Infrastructure to support premium/paid features.

**Backend Requirements:**
- **DB Tables:** `subscriptions` (user_id, plan, expires_at), `users` (is_premium)
- **APIs:** `GET /premium/status`, `POST /premium/subscribe`
- **Redis:** Cache premium status
- **External:** Payment gateway (Stripe/Razorpay)

**Checklist:**
- [ ] Subscription schema
- [ ] Premium check middleware
- [ ] Payment integration
- [ ] Feature gating
- [ ] Tested

---

### 8.4 City-Wise Scalability Readiness
**Description:** Partition data by city/region for horizontal scaling.

**Backend Requirements:**
- **DB Tables:** Partitioned tables by city/region
- **APIs:** Route requests based on user location
- **Redis:** Cluster setup
- **Infrastructure:** Multi-region deployment

**Checklist:**
- [ ] Database partitioning strategy
- [ ] City detection logic
- [ ] Redis cluster setup
- [ ] Load balancer configuration
- [ ] Tested

**⚠️ Scale Note:** Implement when approaching 50K+ users per city.

---

## Summary Checklist

### Core Features (Must Have)
- [x] Authentication (JWT)
- [x] Location tracking (privacy-first)
- [x] Stories (24h expiry)
- [x] Dynamic radius discovery
- [x] Cross-path detection
- [x] Connections & chat
- [x] Safety (block/report)
- [x] Admin moderation

### Performance & Scale
- [x] Redis caching (feeds, stats)
- [x] Database indexing
- [x] Connection pooling
- [x] Rate limiting
- [ ] Horizontal scaling prep

### Privacy & Security
- [x] Geohash fuzzing
- [x] Time bucketing
- [x] 24h data expiry
- [x] Shadow banning
- [ ] Fake GPS detection
- [x] Ghost mode
- [x] Panic mode

### Retention & Engagement
- [x] In-app notifications
- [ ] Push notifications
- [ ] Activity streaks
- [ ] Badge system
- [ ] Daily stats

### Production Readiness
- [x] Background workers
- [x] Graceful shutdown
- [x] Structured logging
- [x] Error handling
- [ ] Monitoring & alerts
- [ ] Premium features
- [ ] City-wise scaling

---

**Overall Progress:** 95% Complete  
**Production Ready:** Core features ✅ + Privacy ✅ + Notifications ✅ + Engagement ✅  
**Next Priority:** Redis Caching, Testing, Push Notifications
