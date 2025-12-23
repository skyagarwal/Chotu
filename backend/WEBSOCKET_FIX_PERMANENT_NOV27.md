# WebSocket Connection Fix (Permanent) - Nov 27, 2025

## Issue
The frontend (`chat.mangwale.ai`) was experiencing "Connection lost" errors when connecting to the backend (`api.mangwale.ai`) via WebSocket.
The console showed `Connecting to WebSocket...` followed by `Leaving session`.

## Root Cause Analysis
1.  **Traefik Routing Conflict:** The `api.mangwale.ai` domain handles both standard API traffic (HTTP) and WebSocket traffic (`/socket.io`).
2.  **Router Priority:** The generic API router (`Host('api.mangwale.ai')`) had the same priority as the WebSocket router (`Host('api.mangwale.ai') && PathPrefix('/socket.io')`).
3.  **Handshake Failure:** Socket.IO starts with an HTTP handshake. The generic API router was capturing these requests but not handling the WebSocket upgrade correctly, causing the connection to drop.

## Fix Implemented
1.  **Updated `docker-compose.yml`:**
    *   Added `traefik.http.routers.ai-websocket.priority=100` to the `mangwale-ai` service.
    *   This ensures that requests matching `/socket.io` are ALWAYS handled by the WebSocket router first, before falling back to the generic API router.

2.  **Container Cleanup:**
    *   Removed conflicting/orphaned containers (`mangwale_postgres`, `mangwale_redis`, `mangwale_ai_service`) to ensure a clean state.
    *   Recreated the stack with the new configuration.

## Verification
*   **Backend Status:** The backend is up and running.
*   **Functional Test:** Ran `scripts/verify-paneer-v2.ts` which successfully connected via WebSocket, sent a message, and received a structured response.
*   **Logs:** Backend logs show successful message processing and session management.

## Why this is a Permanent Fix
*   It correctly configures the reverse proxy (Traefik) to handle WebSocket traffic specifically.
*   It prevents the generic API router from "stealing" WebSocket handshake requests.
*   It allows the frontend to use the more efficient and real-time WebSocket protocol instead of falling back to REST polling.

## Next Steps
*   Refresh the frontend page (`chat.mangwale.ai`).
*   The connection should now be stable.
