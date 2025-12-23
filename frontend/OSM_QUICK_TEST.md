# OpenStreetMap Quick Test Guide

## Immediate Testing Steps

### 1. Access the Chat Interface
```
URL: https://chat.mangwale.ai/chat?module=parcel
```

### 2. Open Location Picker
- Look for the **map icon** in the bottom action bar
- Click it to open the location picker

### 3. Visual Verification
**What you should see:**
- ✅ **OpenStreetMap** (NOT Google Maps)
  - Look for "© OpenStreetMap contributors" at bottom-right
  - Map style is different from Google (more muted colors)
- ✅ **Green polygon** around Nashik city (service zone boundary)
- ✅ **Red marker** at default location (center of Nashik)
- ✅ **Status badge** at top showing zone validation

**What you should NOT see:**
- ❌ Google Maps interface
- ❌ "This page didn't load Google Maps correctly" error
- ❌ Google logo or attribution

### 4. Test Marker Placement
**A. Click to Place:**
1. Click anywhere on the map
2. Marker should jump to that location
3. Address field should update (may take 1-2 seconds for geocoding)

**B. Drag to Move:**
1. Click and hold the marker
2. Drag it to a new location
3. Release to drop
4. Address should update

### 5. Test Current Location
1. Click the **GPS icon button** (📍)
2. Browser will ask for location permission
3. Allow location access
4. Marker should move to your actual GPS location

### 6. Test Zone Validation
**Inside Service Area (Nashik):**
- Place marker anywhere within the green polygon
- Status badge should show: **"✓ In Service Area"** (green background)
- Confirm button should be **enabled**

**Outside Service Area:**
- Place marker outside the green polygon (far from Nashik)
- Status badge should show: **"✗ Outside Service Area"** (red background)
- Confirm button should be **disabled**

### 7. Test Address Geocoding
1. Move marker to different locations
2. Wait 1-2 seconds
3. Address field should auto-populate with:
   - Street address (if available)
   - City name
   - Pincode (if available)

**Note:** Nominatim geocoding may be less detailed than Google in rural areas

### 8. Test Form Submission
1. Place marker in a valid location (inside Nashik)
2. Fill in additional details:
   - Landmark (optional)
   - Locality (optional)
3. Click **"Confirm Location"**
4. Modal should close
5. Chat should receive the location data

### 9. Test Cancellation
1. Click **"Cancel"** button
2. Modal should close without saving

## Browser Console Checks

Open browser console (F12) and look for:

**Good Signs (Expected):**
```
✅ Fetched zone boundaries: 1 zones
✅ Location geocoded successfully
✅ Zone validation: true/false
```

**Bad Signs (Issues):**
```
❌ Failed to fetch zone boundaries
❌ Error loading OSM tiles
❌ Geocoding failed
❌ Leaflet is not defined
```

## Mobile Testing

### On Mobile Browser:
1. Open https://chat.mangwale.ai/chat?module=parcel
2. Tap location icon
3. Map should be responsive and fill screen
4. Pinch to zoom should work
5. Tap to place marker should work
6. Current location button should work
7. Form fields should be easily tappable

## Performance Checks

**Map Load Time:**
- OSM map should load within 2-3 seconds
- Zone polygon should appear within 1-2 seconds

**Geocoding Speed:**
- Address should update within 1-2 seconds after moving marker
- May be slower for remote locations

**Tile Loading:**
- Map tiles should load progressively as you pan
- No broken tile images (gray squares)

## Common Issues & Solutions

### Issue 1: Map Doesn't Load
**Symptoms:** Blank gray box instead of map
**Check:** Browser console for errors
**Solutions:**
- Refresh the page
- Check internet connection
- Check if OSM tiles are accessible: https://tile.openstreetmap.org/0/0/0.png

### Issue 2: No Zone Boundaries
**Symptoms:** Map loads but no green polygon
**Check:** 
```bash
curl http://localhost:3200/zones/boundaries
```
**Solution:** Restart backend:
```bash
cd /home/ubuntu/Devs/mangwale-ai
pm2 restart mangwale-ai
```

### Issue 3: Geocoding Not Working
**Symptoms:** Address field stays empty or shows "Unknown location"
**Cause:** Nominatim rate limiting or network issue
**Solution:** 
- Wait a few seconds and try again
- Move marker to a major street/city
- Check Nominatim status: https://nominatim.openstreetmap.org/status

### Issue 4: Marker Can't Be Dragged
**Symptoms:** Marker doesn't move when clicked/dragged
**Check:** Browser console for JavaScript errors
**Solution:** Clear browser cache and refresh

### Issue 5: Current Location Button Doesn't Work
**Symptoms:** GPS button does nothing
**Cause:** Browser location permission denied
**Solution:**
- Click lock icon in address bar
- Allow location access
- Refresh page and try again

## API Verification Commands

### Check Backend Services:
```bash
# Zone API:
curl http://localhost:3200/zones/boundaries | jq '.count'
# Should return: 1

# Zone validation (Nashik location):
curl "http://localhost:3200/zones/check?lat=19.970&lng=73.787"
# Should return: {"in_zone": true, ...}

# Zone validation (Mumbai - outside):
curl "http://localhost:3200/zones/check?lat=19.076&lng=72.877"
# Should return: {"in_zone": false, ...}
```

### Check Container Status:
```bash
# Dashboard:
docker ps | grep mangwale-dashboard
# Should show: Up X minutes

# Backend:
docker ps | grep mangwale_ai_service
# Should show: Up X hours

# OSRM:
docker ps | grep mangwale_osrm
# Should show: Up X days (healthy)
```

### Check Dashboard Logs:
```bash
docker logs mangwale-dashboard --tail 20
# Look for: "✓ Ready in XXXms"
```

## Success Criteria

✅ **Visual:**
- OpenStreetMap loads (not Google Maps)
- Green zone polygon visible
- Marker is draggable
- Address form shows geocoded data

✅ **Functional:**
- Click to place marker works
- Drag marker works
- Current location button works
- Zone validation badge updates correctly
- Confirm button enables/disables based on zone

✅ **Performance:**
- Map loads in < 3 seconds
- No console errors
- Smooth marker dragging
- Geocoding completes in < 2 seconds

✅ **Integration:**
- Backend zone API responding
- OSRM service healthy
- Location data sent to chat correctly

## Next Steps After Testing

### If Everything Works ✅
- Document any observed issues (e.g., geocoding accuracy)
- Monitor Nominatim rate limits in production
- Consider implementing address search feature
- Optionally add Google Maps fallback

### If Issues Found ❌
1. **Document the issue:** Screenshot + browser console errors
2. **Check logs:** Dashboard, backend, browser console
3. **Try rollback:** Use old LocationPicker.tsx if critical
4. **Report:** Share error details for debugging

## Quick Rollback (Emergency)

If OSM has critical issues:

```bash
# 1. Edit chat page:
nano /home/ubuntu/Devs/mangwale-unified-dashboard/src/app/(public)/chat/page.tsx

# 2. Change line ~15:
# FROM: const OSMLocationPicker = dynamic(...)
# TO:   import LocationPicker from '@/components/map/LocationPicker'

# 3. Change line ~517:
# FROM: <OSMLocationPicker
# TO:   <LocationPicker

# 4. Add back Google Script tag around line 333

# 5. Restart:
cd /home/ubuntu/Devs/mangwale-unified-dashboard
docker-compose restart dashboard
```

---

**Status:** Ready for testing  
**URL:** https://chat.mangwale.ai/chat  
**Test Module:** parcel  
**Expected Result:** OpenStreetMap with zone boundaries
