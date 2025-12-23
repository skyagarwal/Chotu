# Dashboard Connectivity Fix

## Issue
The dashboard was failing to load data with `ECONNREFUSED 192.168.0.156:3000`.
This was caused by an incorrect environment variable `IMAGE_AI_INTERNAL_URL` in `frontend/.env.local` pointing to a local IP address that is not accessible from within the Docker container.

## Fix Applied
1.  Updated `frontend/.env.local`:
    -   Changed `IMAGE_AI_INTERNAL_URL` from `http://192.168.0.156:3000` to `http://mangwale-ai:3200/vision`.
    -   This points to the `mangwale-ai` service on the internal Docker network, where the Vision module is hosted.
2.  Restarted `mangwale-dashboard` container to rebuild and apply changes.

## Verification
-   Dashboard logs show a clean build and start (`Ready in 204ms`).
-   No connection errors observed in the latest logs.

## Next Steps
-   Verify dashboard functionality in the browser.
-   Proceed with "Train Router Model" as per `CURRENT_STATUS.md`.
