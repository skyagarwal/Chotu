# Google Cloud Setup Guide for MangwaleAI

## Step 1: Create Project

```bash
# Go to: https://console.cloud.google.com/
# Click "Select Project" → "New Project"
# Name: mangwale-ai
# Click "Create"
```

## Step 2: Enable APIs

Enable these APIs in Google Cloud Console:

1. **Places API** (for restaurant matching & reviews)
   ```
   https://console.cloud.google.com/apis/library/places-backend.googleapis.com
   ```

2. **Cloud Natural Language API** (for sentiment analysis)
   ```
   https://console.cloud.google.com/apis/library/language.googleapis.com
   ```

3. **Speech-to-Text API** (optional ASR fallback)
   ```
   https://console.cloud.google.com/apis/library/speech.googleapis.com
   ```

4. **Text-to-Speech API** (optional TTS fallback)
   ```
   https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
   ```

## Step 3: Create API Key (for Places API)

```bash
# Go to: https://console.cloud.google.com/apis/credentials
# Click "Create Credentials" → "API Key"
# Copy the key
# Click "Restrict Key":
#   - Name: mangwale-places-key
#   - API restrictions: Places API only
```

## Step 4: Create Service Account (for NL API)

```bash
# Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
# Click "Create Service Account"
# Name: mangwale-ai-nlp
# Role: Cloud Natural Language API User
# Click "Create Key" → JSON → Download
```

## Step 5: Set Environment Variables

```bash
# Add to backend/.env:

# Google Places API (for restaurant matching)
GOOGLE_PLACES_API_KEY=AIza...your-key...

# Google Cloud Project
GOOGLE_CLOUD_PROJECT_ID=mangwale-ai

# Service Account (for NL API)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/mangwale-ai-nlp.json

# Optional: Speech APIs
GOOGLE_SPEECH_API_KEY=AIza...optional...
```

## Step 6: Billing Setup

```bash
# Go to: https://console.cloud.google.com/billing
# Link a billing account to the project
# NEW ACCOUNTS GET $300 FREE CREDIT!
```

## Estimated Monthly Costs

| API | Free Tier | After Free | Est. Usage | Est. Cost |
|-----|-----------|------------|------------|-----------|
| Places Text Search | $200/mo credit | $17/1000 | 5000/mo | ~$85 |
| Places Details | Included | $17/1000 | 2000/mo | ~$34 |
| Natural Language | 5K units/mo | $1/1000 | 10K/mo | ~$5 |
| Speech-to-Text | 60 min/mo | $0.006/15s | Backup only | ~$0 |

**Total Estimated: ~₹10,000/month** (after free tier)

## Quick Test

```bash
# Test Places API
curl "https://maps.googleapis.com/maps/api/place/textsearch/json?query=dominos+nashik&key=YOUR_API_KEY"

# Test Natural Language API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://language.googleapis.com/v1/documents:analyzeSentiment" \
  -d '{"document":{"type":"PLAIN_TEXT","content":"The pizza was delicious but delivery was late"}}'
```

## Database Setup

After getting API keys, add to database:

```sql
-- Add Google Places source
INSERT INTO data_sources (name, type, provider, api_key, priority, is_active)
VALUES ('Google Places', 'reviews', 'google_places', 'AIza...your-key', 1, true);

-- Add Google NL source  
INSERT INTO data_sources (name, type, provider, api_key, priority, is_active)
VALUES ('Google NL', 'sentiment', 'google_nl', 'service-account', 1, true);
```
