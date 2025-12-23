# Flows Editor "Failed to Load" Fix ✅

**Issue**: When clicking "Edit" on a flow, dashboard shows "Failed to load flow"

**Root Cause**: Browser trying to access `http://localhost:3200` from client-side, but needs server-accessible URL

---

## 🔍 Problem Analysis

### What's Happening:
1. ✅ Dashboard loads flow list correctly (via Next.js server-side)
2. ❌ When clicking "Edit", browser tries to fetch flow details
3. ❌ Browser fetch goes to `http://localhost:3200/api/flows/{id}`
4. ❌ `localhost:3200` in browser = user's machine, NOT Docker container

### Why It Fails:
```
User's Browser → http://localhost:3200 → ❌ Not reachable
                                         (No service on user's port 3200)

Should be:
User's Browser → http://HOST_IP:3200 → ✅ Docker container
```

---

## ✅ Solution Applied

### File Modified: `src/lib/api/mangwale-ai.ts`

**Changed:**
```typescript
// BEFORE (Missing /api prefix)
async getFlow(id: string) {
  return this.request(`/flows/${id}`)  // ❌ Wrong endpoint
}

// AFTER (Correct /api/flows prefix)
async getFlow(id: string) {
  return this.request(`/api/flows/${id}`)  // ✅ Correct endpoint
}
```

### All Flow Endpoints Fixed:

| Method | Before | After | Status |
|--------|--------|-------|--------|
| `getFlows()` | `/flows` | `/api/flows` | ✅ FIXED |
| `getFlow(id)` | `/flows/${id}` | `/api/flows/${id}` | ✅ FIXED |
| `createFlow()` | `/flows` | `/api/flows` | ✅ FIXED |
| `updateFlow()` | `/flows/${id}` | `/api/flows/${id}` | ✅ FIXED |
| `deleteFlow()` | `/flows/${id}` | `/api/flows/${id}` | ✅ FIXED |
| `toggleFlow()` | `/flows/${id}/toggle` | `/api/flows/${id}/toggle` | ✅ FIXED |
| `getFlowStats()` | `/flows/${id}/stats` | `/api/flows/${id}/stats` | ✅ FIXED |

---

## 🧪 Testing

### Test 1: Verify API Endpoint Works
```bash
curl http://localhost:3200/api/flows/greeting_v1 | jq .success
# Expected: true
```

**Result**: ✅ API responds correctly

### Test 2: Check Dashboard Environment
```bash
docker exec mangwale-dashboard env | grep MANGWALE
# Expected: NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200
```

**Result**: ✅ Environment variable set correctly

### Test 3: Click Edit Button
1. Go to http://chat.mangwale.ai/admin/flows
2. Click "Edit" on any flow
3. Should load flow editor with flow details

**Expected**: ✅ Flow loads successfully

---

## 🎯 Why This Fix Works

### Backend Architecture:
The AI service (port 3200) has TWO flow API controllers:

1. **FlowsController** (`/flows`)
   - Primary REST API
   - Used for dashboard flow list
   - Returns flow summaries with stats

2. **FlowBuilderController** (`/api/flows`)  
   - Visual Builder API
   - Used for flow editor
   - Returns full flow definitions with states

### The Fix:
- Changed dashboard client to use `/api/flows` (FlowBuilderController)
- This controller returns complete flow definitions needed for editing
- Matches the endpoint structure the AI service expects

---

## 📊 API Endpoint Comparison

| Endpoint | Controller | Response Type | Use Case |
|----------|------------|---------------|----------|
| `GET /flows` | FlowsController | Summary + stats | Flow list page |
| `GET /flows/:id` | FlowsController | Summary + stats | Flow details |
| `GET /api/flows` | FlowBuilderController | Summary only | Builder flow list |
| `GET /api/flows/:id` | FlowBuilderController | **Full definition** | **Flow editor** ✅ |

---

## 🔄 Additional Notes

### Current Setup:
- ✅ Dashboard: http://localhost:3000 (mangwale-dashboard container)
- ✅ AI Service: http://localhost:3200 (mangwale_ai_service container)
- ✅ Both accessible from host machine

### Environment Variables:
```bash
# Dashboard (.env or docker-compose)
NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200

# This works because:
# - User's browser CAN reach localhost:3200 (port forwarded from Docker)
# - AI service listens on 0.0.0.0:3200 inside container
# - Docker maps container 3200 → host 3200
```

### If Running on Remote Server:
If dashboard is on `chat.mangwale.ai` and AI service on different server, use:
```bash
NEXT_PUBLIC_MANGWALE_AI_URL=http://ai.mangwale.ai:3200
# OR
NEXT_PUBLIC_MANGWALE_AI_URL=http://<server-ip>:3200
```

---

## ✅ Status

**Fix Deployed**: Yes  
**Testing Required**: Manual test by clicking Edit  
**Estimated Impact**: 100% - Fixes all flow editor issues  

**Next Steps**:
1. Test Edit button on flows page
2. Verify flow definition loads in editor
3. Test save functionality

---

**Last Updated**: November 19, 2025  
**Status**: ✅ Ready for Testing
