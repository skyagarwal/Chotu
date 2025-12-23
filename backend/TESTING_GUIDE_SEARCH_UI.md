# 🧪 Testing Guide - Search Interface

## Quick Start Testing

### 1. Access the Application

**Local Browser**:
```
http://localhost:5173/search
```

**Network Access** (from other devices):
```
http://192.168.0.156:5173/search
http://100.121.40.69:5173/search
```

---

## Test Scenarios

### ✅ Test 1: Basic Food Search

**Steps**:
1. Navigate to http://localhost:5173/search
2. Ensure "Food" tab is selected (orange)
3. Type: `pizza`
4. Click "Search" button

**Expected Results**:
- Loading skeletons appear briefly
- Results grid displays pizza items
- Each card shows: image, name, price, veg badge, rating
- Total results count displayed above grid

**Sample Result**:
```
Demo Restaurant
pizza
₹50
⭐0 | 🕒30-40 min | 📍[distance]
[Veg badge visible]
```

---

### ✅ Test 2: Veg Filter

**Steps**:
1. In Food tab, click "🥗 Veg Only" button
2. Type: `pizza`
3. Click "Search"

**Expected Results**:
- Only vegetarian items displayed
- All cards show green veg badge (Leaf icon)
- Active filter pill shows: "🥗 Veg Only [X]"
- No non-veg items in results

**Verify**:
- Check `veg: 1` in all result cards
- Green leaf icon visible on each card

---

### ✅ Test 3: Price Filter

**Steps**:
1. Click "🎚️ Filters" to open filters panel
2. In "Price Range" section:
   - Max Price: `300`
3. Type: `pizza`
4. Click "Apply Filters"

**Expected Results**:
- Active filter pill: "Price: ₹0 - ₹300 [X]"
- All results have price ≤ ₹300
- Items like "₹50", "₹250" visible
- No items above ₹300

**Verify**:
- Search API called with: `price_max=300`
- Results filtered correctly

---

### ✅ Test 4: Combined Filters

**Steps**:
1. Enable "🥗 Veg Only"
2. Set "Max Price: 300"
3. Select "Rating: ⭐4.0+"
4. Type: `pizza`
5. Click "Apply Filters"

**Expected Results**:
- Active filter pills:
  - "🥗 Veg Only [X]"
  - "Price: ₹0 - ₹300 [X]"
  - "Rating: ⭐4.0+ [X]"
- Results are vegetarian, under ₹300, rated 4.0+
- Fewer results than unfiltered search

**API URL**:
```
GET /search/food?q=pizza&veg=1&price_max=300&rating_min=4&size=20
```

---

### ✅ Test 5: Module Switching

**Steps**:
1. Click "🛍️ Shopping" tab (blue)
2. Type: `laptop`
3. Click "Search"
4. Switch to "🏨 Hotels" tab (purple)
5. Type: `hotel`
6. Click "Search"

**Expected Results**:
- Each module shows appropriate results
- Shopping: Product cards (no veg badge)
- Hotels: Room/hotel listings
- Filters adapt to module (no veg filter for shopping)
- Total results differ per module

**Verify**:
- Module tabs change color when selected
- Filters panel adapts to module type
- Results from correct OpenSearch index

---

### ✅ Test 6: Empty State

**Steps**:
1. Type: `xxxxxxxxxxxxxx` (nonsense query)
2. Click "Search"

**Expected Results**:
- No skeleton cards after loading
- Empty state displayed:
  - 🔍 icon
  - "No results found"
  - "Try adjusting your search or filters"
- Suggestions displayed:
  - "Try: biryani, pizza, burger, pasta"

---

### ✅ Test 7: Error Handling

**Steps**:
1. Stop Search API: `kill -9 $(lsof -ti:3100)`
2. Try searching for anything
3. Restart Search API

**Expected Results**:
- Red error banner appears:
  - "Failed to load results: [error message]"
- Error message user-friendly
- "Retry" or manual refresh works after restart

**Restore**:
```bash
cd /home/ubuntu/Devs/Search
pm2 restart search-api
```

---

### ✅ Test 8: Filter Pills

**Steps**:
1. Apply multiple filters (veg, price, rating)
2. Click [X] on "🥗 Veg Only" pill
3. Click "Clear all" link

**Expected Results**:
- Clicking [X] removes individual filter
- Results refresh without that filter
- "Clear all" removes ALL active filters
- Pills disappear from display

---

### ✅ Test 9: Responsive Design

**Desktop (>1024px)**:
- 3 columns of result cards
- Filters panel side-by-side with inputs
- All metadata visible

**Tablet (768-1024px)**:
- 2 columns of result cards
- Filters panel stacks vertically
- Most metadata visible

**Mobile (<768px)**:
- 1 column of result cards
- Filters panel below search input
- Compact metadata display

**Test**:
- Resize browser window
- Verify layout adapts smoothly
- Check all buttons clickable
- Verify text readable

---

### ✅ Test 10: Loading States

**Steps**:
1. Enter search query
2. Observe before clicking "Search"
3. Click "Search"
4. Observe during API call
5. Observe after results load

**Expected Behavior**:
- **Before Search**:
  - Search button enabled
  - No skeleton cards
  - Empty state or suggestions visible

- **During Search** (loading=true):
  - Search button disabled and shows "Searching..."
  - 6 skeleton cards with pulse animation
  - No empty state

- **After Search**:
  - Search button re-enabled
  - Skeleton cards replaced with results
  - Results count updated

---

## Edge Cases to Test

### 1. Very Long Query
```
Input: "I want a delicious vegetarian pizza with extra cheese and mushrooms under 300 rupees in Pune near Shivaji Nagar"
Expected: Query truncated or handled gracefully
```

### 2. Special Characters
```
Input: "pizza & pasta @ 50% off!"
Expected: Search works, special chars handled
```

### 3. Numbers Only
```
Input: "123456"
Expected: Either results or empty state
```

### 4. Empty Query
```
Input: "" (empty)
Expected: Button disabled or empty state with suggestions
```

### 5. Zero Results with Filters
```
Input: "pizza" + veg=true + price_max=10
Expected: Empty state, suggest removing filters
```

---

## API Verification

### Test Search API Directly

**Food Module**:
```bash
curl 'http://localhost:3100/search/food?q=pizza&veg=1&price_max=300&size=5' | jq
```

**Ecommerce Module**:
```bash
curl 'http://localhost:3100/search/ecom?q=laptop&price_max=50000&size=5' | jq
```

**Health Check**:
```bash
curl 'http://localhost:3100/health'
# Expected: {"ok":true,"opensearch":"green"}
```

---

## Browser Console Checks

### Expected Console Output

**On Search Success**:
```javascript
// No errors
// Optional: debug logs from search function
```

**On Search Error**:
```javascript
// Error logged with details
Error: Failed to fetch search results: [reason]
```

### Check Network Tab

**Search Request**:
```
GET http://localhost:3100/search/food?q=pizza&veg=1&price_max=300&size=20
Status: 200 OK
Response: {items: [...], meta: {...}}
```

---

## Performance Checks

### Metrics to Monitor

1. **Search Response Time**: < 500ms typical
2. **Frontend Render**: < 100ms after API response
3. **Skeleton Display**: Immediate (< 50ms)
4. **Filter Toggle**: Instant (no API call)
5. **Module Switch**: < 50ms (UI only)

### Check in DevTools

**Performance Tab**:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

---

## Accessibility Checks

### Keyboard Navigation

**Tab Order**:
1. Module tabs
2. Search input
3. Filters button
4. Search button
5. Filter pills
6. Result cards

**Keyboard Shortcuts** (to implement):
- `Enter` in search input → trigger search
- `Esc` in filters panel → close panel
- `Tab` through result cards
- `Enter` on card → open detail

### Screen Reader Testing

**Elements to Check**:
- Alt text on images
- ARIA labels on buttons
- Semantic HTML (nav, main, section)
- Focus indicators visible

---

## Bug Reporting Template

If you find a bug, report it with:

```markdown
**Bug**: [Brief description]

**Steps to Reproduce**:
1. [First step]
2. [Second step]
3. [Etc.]

**Expected**: [What should happen]

**Actual**: [What actually happened]

**Environment**:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Screen Size: [1920x1080]
- Module: [food/ecom/rooms/movies/services]

**Console Errors**: [Paste any errors]

**Network Tab**: [Screenshot or curl equivalent]

**Screenshot**: [If applicable]
```

---

## Success Criteria

### Phase 2 Complete When:

- ✅ All 10 test scenarios pass
- ✅ No TypeScript errors
- ✅ No console errors in browser
- ✅ Responsive on mobile/tablet/desktop
- ✅ All 5 modules functional
- ✅ Filters work correctly
- ✅ Loading/error/empty states work
- ✅ API returns correct results
- ✅ Search API GREEN status

---

## Troubleshooting

### Frontend Not Loading

**Check**:
```bash
# Is dev server running?
lsof -i :5173

# Restart if needed
cd /home/ubuntu/mangwale-admin-frontend
npm run dev
```

### Search API Not Responding

**Check**:
```bash
# Is Search API running?
curl http://localhost:3100/health

# Check process
lsof -i :3100

# Restart if needed
cd /home/ubuntu/Devs/Search
pm2 restart search-api
```

### OpenSearch Issues

**Check**:
```bash
# OpenSearch health
curl http://localhost:9200/_cluster/health

# Should return: {"status":"green",...}
```

### No Results Returned

**Debug**:
1. Check browser Network tab
2. Verify API request URL
3. Test API with curl directly
4. Check OpenSearch indices:
   ```bash
   curl http://localhost:9200/_cat/indices?v
   ```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Create Phase 3 plan (Vector Search)
2. Document any UI improvements needed
3. Prepare for user acceptance testing
4. Consider deployment to staging

### If Issues Found ❌
1. Document bugs in GitHub issues
2. Prioritize by severity
3. Fix critical bugs first
4. Retest after fixes

---

**Happy Testing! 🎉**
