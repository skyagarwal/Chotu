# Self-Learning & Admin Dashboard Enhancement - Complete Summary

## Date: December 21, 2024

## Overview
This session implemented comprehensive self-learning capabilities, competitor scraping microservice, and enhanced admin dashboard with role-based access control.

---

## 1. Scraper Microservice (`/scraper-service/`)

### Files Created:
- `package.json` - Dependencies (Express, Puppeteer, Redis, PostgreSQL)
- `src/main.ts` - Main Express server with endpoints
- `src/scrapers/zomato.scraper.ts` - Zomato scraping logic
- `src/scrapers/swiggy.scraper.ts` - Swiggy scraping logic
- `src/queue/scraper.queue.ts` - Job queue processor
- `migrations/001_scraper_schema.sql` - Database schema

### Features:
- **Zomato Scraper**: Search restaurants, scrape details, reviews, menu, pricing
- **Swiggy Scraper**: Search restaurants, scrape menu, pricing, offers
- **Rate Limiting**: 10 requests/minute per source
- **Job Queue**: Priority-based with retry logic (max 3 attempts)
- **Store Mapping**: Automatically match our stores to competitors using name similarity
- **Caching**: 7-day Redis cache for scraped data

### API Endpoints:
```
POST /api/scrape/zomato - Queue Zomato scrape job
POST /api/scrape/swiggy - Queue Swiggy scrape job
POST /api/compare/pricing - Get pricing comparison
GET /api/reviews/:source/:restaurantId - Get cached reviews
POST /api/match/store - Match our store to competitors
POST /api/scrape/bulk - Bulk scrape all mapped stores
```

---

## 2. Self-Learning Service (`/backend/src/learning/services/self-learning.service.ts`)

### Confidence-Based Approval:
- **High Confidence (≥90%)**: Auto-approved, added to training data immediately
- **Medium Confidence (70-90%)**: Queued for human review
- **Low Confidence (<70%)**: Priority review + sent to Label Studio

### Key Methods:
- `processPrediction()` - Main entry point for NLU predictions
- `autoApprove()` - Auto-approve high confidence predictions
- `queueForReview()` - Queue for human review
- `sendToLabelStudio()` - Send low confidence to Label Studio
- `syncFromLabelStudio()` - Hourly sync of approved annotations
- `exportForTraining()` - Export approved data (Rasa/JSON/SpaCy formats)
- `checkRetrainingNeeded()` - Check if model needs retraining

### Label Studio Integration:
- Creates tasks with pre-filled predictions
- Syncs completed annotations hourly
- Supports intent classification and entity labeling

---

## 3. Role-Based Admin Access (`/backend/src/admin/services/admin-role.service.ts`)

### Roles:
| Role | Description |
|------|-------------|
| `super_admin` | Full access to everything |
| `admin` | Most features, can't create super admins |
| `manager` | Limited admin features |
| `reviewer` | Training data review only |
| `viewer` | Read-only access |

### Permission Matrix:
```typescript
super_admin: ['*'] // All permissions
admin: ['dashboard', 'models', 'agents', 'training', 'learning', 'scraper', 'data_sources', 'users.view', 'analytics', 'settings']
manager: ['dashboard', 'agents.view/edit', 'training', 'learning.view/edit', 'analytics', 'users.view']
reviewer: ['dashboard', 'training.view/edit/execute', 'learning.view/edit', 'analytics.view']
viewer: ['dashboard.view', 'analytics.view']
```

### Features:
- JWT-based authentication (24h expiry)
- Password hashing with bcrypt
- Activity logging
- Role change protection (only super_admin)

---

## 4. Database Migrations

### Migration: `20241221_admin_dashboard_enhancement/migration.sql`

New Tables:
- `admin_users` - Admin accounts with roles
- `admin_activity_log` - Action audit trail
- `nlu_training_data` - Training examples with status
- `auto_approval_stats` - Auto-approval patterns
- `model_training_history` - Model version tracking
- `data_source_usage_log` - API usage tracking

New Views:
- `v_learning_analytics` - Daily learning stats
- `v_learning_progress` - 30-day progress
- `v_intent_distribution` - Intent breakdown
- `v_data_source_health` - Source health status
- `v_scraper_stats` - Scraper job stats
- `v_mapping_status` - Store mapping status

Functions:
- `get_admin_dashboard_stats()` - Aggregated dashboard data

---

## 5. Admin Dashboard Frontend

### New Pages:
- `/admin/learning` - Self-Learning Dashboard
- `/admin/learning/review` - Review Queue
- `/admin/data-sources` - Data Source Management

### Navigation Updates (`layout.tsx`):
Added new menu sections:
- **Self-Learning**: Dashboard, Review Queue, Training Data, Model Performance, Label Studio
- **Data Sources**: Source Management, Scraper Jobs, Store Mappings, Health Monitor
- **User Management**: Admin Users, Roles & Permissions, Activity Log

---

## 6. Usage Examples

### Process NLU Prediction:
```typescript
const result = await selfLearningService.processPrediction({
  text: "mala misal pav pathav",
  intent: "food_order",
  confidence: 0.92,
  entities: [{ entity: "dish", value: "misal pav", start: 5, end: 14 }],
  conversationId: "conv_123",
  userId: "user_456"
});
// result: { action: 'auto_approved', message: 'Auto-approved with 92.0% confidence' }
```

### Queue Scrape Job:
```typescript
await scraperQueue.addJob({
  source: 'both',
  storeId: 'store_uuid',
  storeName: 'Ashok Vada Pav',
  storeAddress: 'College Road, Nashik',
  lat: 19.9975,
  lng: 73.7898,
  priority: 'high',
  maxAttempts: 3
});
```

### Check Permissions:
```typescript
const canEdit = adminRoleService.hasPermission(user, 'training', 'edit');
if (!canEdit) throw new ForbiddenException('Not authorized');
```

---

## 7. Environment Variables Needed

```env
# Label Studio
LABEL_STUDIO_URL=http://localhost:8080
LABEL_STUDIO_TOKEN=your_token
LABEL_STUDIO_PROJECT=1

# Admin JWT
JWT_SECRET=your-secure-secret

# Scraper Service
SCRAPER_REDIS_URL=redis://localhost:6379
SCRAPER_DATABASE_URL=postgresql://...

# Google APIs (optional, for store enrichment)
GOOGLE_PLACES_API_KEY=your_api_key
```

---

## 8. Running Migrations

```bash
# Backend migrations
cd backend
npx prisma migrate dev

# Scraper service
cd scraper-service
psql $DATABASE_URL < migrations/001_scraper_schema.sql
```

---

## 9. Starting Services

```bash
# Backend
cd backend
npm run start:dev

# Scraper Service
cd scraper-service
npm install
npm run dev
```

---

## Files Created This Session

1. `/scraper-service/package.json`
2. `/scraper-service/src/main.ts`
3. `/scraper-service/src/scrapers/zomato.scraper.ts`
4. `/scraper-service/src/scrapers/swiggy.scraper.ts`
5. `/scraper-service/src/queue/scraper.queue.ts`
6. `/scraper-service/migrations/001_scraper_schema.sql`
7. `/backend/src/learning/services/self-learning.service.ts`
8. `/backend/src/admin/services/admin-role.service.ts`
9. `/backend/prisma/migrations/20241221_admin_dashboard_enhancement/migration.sql`
10. `/frontend/src/app/admin/learning/page.tsx`
11. `/frontend/src/app/admin/learning/review/page.tsx`
12. `/frontend/src/app/admin/data-sources/page.tsx`
13. `/backend/docs/GOOGLE_CLOUD_SETUP.md`

---

## Next Steps

1. **Run Migrations**: Apply database migrations
2. **Configure Label Studio**: Set up project and API token
3. **Test Scrapers**: Verify Zomato/Swiggy scraping works
4. **Create Super Admin**: Use the default admin or create new one
5. **Connect NLU**: Hook self-learning to NLU prediction pipeline
6. **Monitor**: Watch auto-approval rates and adjust thresholds

---

## Legal Note

The scraper service is for **research purposes only**. Ensure compliance with:
- Zomato Terms of Service
- Swiggy Terms of Service
- Applicable data protection laws

Consider using official APIs when available.
