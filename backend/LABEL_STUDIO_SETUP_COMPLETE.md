# Label Studio Setup - COMPLETE ✅

## Status: FULLY CONFIGURED

### Container Details
- **Version**: Label Studio 1.21.0 (Latest)
- **Status**: Running
- **URL**: http://localhost:8080
- **Data Directory**: `/home/ubuntu/Devs/mangwale-ai/data/labelstudio`

### Authentication Setup ✅

**Personal Access Token (PAT)** configured properly:
- Refresh Token stored in `.env.labelstudio`
- Helper script: `scripts/get-labelstudio-token.sh`
- Access tokens auto-refresh (5-minute TTL)

**How PATs Work:**
1. Your refresh token is a JWT (never expires)
2. Exchange it for short-lived access token (5 min)
3. Use access token with `Authorization: Bearer <token>`
4. When expired (401), get new access token from refresh token

### Project Configuration ✅

**Project ID**: 1
**Title**: "NLU Intent & Language Classification"
**Interface**: Custom annotation UI with:
- 20+ intent choices (food, parcel, ecommerce)
- Module selection (Parcel, Food, Ecommerce)
- Language detection (English, Hinglish, Hindi, Marathi)
- Quality rating (1-5 stars)
- Notes field for comments

### Helper Scripts

**Get Fresh Access Token:**
```bash
./scripts/get-labelstudio-token.sh
```

**Test API Connection:**
```bash
TOKEN=$(./scripts/get-labelstudio-token.sh)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/projects/
```

**Import Tasks:**
```bash
TOKEN=$(./scripts/get-labelstudio-token.sh)
curl -X POST http://localhost:8080/api/projects/1/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"data": {"text": "your text here"}}]'
```

### Next Steps

1. **Import Training Samples**:
   - Run `scripts/label-studio-sync.ts --push --limit 100`
   - Pushes low-confidence samples (< 0.85) to Label Studio

2. **Review in Browser**:
   - Go to http://localhost:8080/projects/1
   - Review AI suggestions
   - Correct or confirm classifications
   - Submit annotations

3. **Pull Approved Data**:
   - Run `scripts/label-studio-sync.ts --pull`
   - Imports completed annotations back to database
   - Updates `training_samples` table with `review_status='approved'`

4. **Train Model**:
   - When you have 1000+ approved samples
   - Run `npm run train:router`
   - New model will have improved accuracy

### Automation

Setup cron jobs for continuous learning:

```bash
# Daily: Push new low-confidence samples
0 2 * * * cd /home/ubuntu/Devs/mangwale-ai && npm run label-studio:push

# Daily: Pull completed annotations  
0 3 * * * cd /home/ubuntu/Devs/mangwale-ai && npm run label-studio:pull

# Weekly: Train new model if enough data
0 4 * * 0 cd /home/ubuntu/Devs/mangwale-ai && npm run train:weekly
```

### Files Created/Updated

- ✅ `.env.labelstudio` - Configuration with refresh token
- ✅ `scripts/get-labelstudio-token.sh` - Token helper
- ✅ `label-studio-config.xml` - Annotation interface
- ✅ `scripts/label-studio-sync.ts` - Bi-directional sync (already exists)
- ✅ `LABEL_STUDIO_WORKFLOW.md` - Complete workflow docs

### Troubleshooting

**401 Unauthorized:**
```bash
# Get fresh access token
TOKEN=$(./scripts/get-labelstudio-token.sh)
```

**Container not running:**
```bash
docker start mangwale_labelstudio
```

**Reset everything:**
```bash
docker stop mangwale_labelstudio
docker rm mangwale_labelstudio
sudo rm -rf data/labelstudio
# Then reinstall following setup instructions
```

---

**Setup completed**: $(date)
**Label Studio Version**: 1.21.0
**Authentication**: Personal Access Tokens (JWT)
**Project Status**: Ready for production use
