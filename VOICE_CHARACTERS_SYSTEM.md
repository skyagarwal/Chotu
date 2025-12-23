# Voice Characters System - Mangwale AI

## Overview

The Voice Characters system provides a database-driven, multi-character TTS (Text-to-Speech) configuration system. All voice character settings are stored in PostgreSQL and manageable via the admin UI.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     admin.mangwale.ai                        │
│              /admin/voice/characters                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  React Admin UI (Next.js on port 3005)             │     │
│  │  - Character CRUD                                   │     │
│  │  - Emotion/Style/Language management               │     │
│  │  - Live voice testing                              │     │
│  └─────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ /api/voice-characters/*
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                  Jupiter (192.168.0.156)                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  NestJS Backend (port 3200)                             │ │
│  │  - VoiceCharactersController                            │ │
│  │  - VoiceCharactersService                               │ │
│  │  - Prisma ORM                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                    │ │
│  │  - voice_characters                                     │ │
│  │  - voice_emotion_presets                                │ │
│  │  - voice_style_presets                                  │ │
│  │  - voice_language_settings                              │ │
│  │  - voice_usage_logs                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ POST /synthesize (with character params)
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                  Mercury (192.168.0.151)                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TTS Service (port 7002)                                │ │
│  │  - ChatterBox (Hindi/Marathi/23+ langs)                 │ │
│  │  - Kokoro (English)                                     │ │
│  │  - ElevenLabs/Deepgram (Cloud fallback)                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  GPU: RTX 3060 12GB                                          │
└───────────────────────────────────────────────────────────────┘
```

## Database Schema

### VoiceCharacter
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Unique slug (e.g., "chotu", "meena") |
| displayName | String | UI display name |
| description | String? | Character description |
| personality | JSON | Background, style, traits |
| traits | String[] | Character traits array |
| defaultLanguage | String | Default language code |
| defaultExaggeration | Float | ChatterBox exaggeration (0-1) |
| defaultCfgWeight | Float | ChatterBox CFG weight (0-1) |
| defaultSpeed | Float | Speech speed multiplier |
| defaultPitch | Float | Pitch adjustment |
| ttsEngine | String | "chatterbox", "kokoro", etc. |
| isActive | Boolean | Whether character is available |
| isDefault | Boolean | Default character for new calls |

### VoiceEmotionPreset
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| characterId | UUID | Parent character |
| name | String | Emotion slug (e.g., "sweet", "excited") |
| displayName | String | UI display name |
| category | String? | "positive", "neutral", "apologetic" |
| exaggeration | Float | Override exaggeration |
| cfgWeight | Float | Override CFG weight |
| speedMultiplier | Float | Speed modifier |

### VoiceStylePreset
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| characterId | UUID | Parent character |
| name | String | Style slug (e.g., "greeting", "farewell") |
| displayName | String | UI display name |
| exaggeration | Float | Override exaggeration |
| cfgWeight | Float | Override CFG weight |
| speed | Float | Speed modifier |
| sampleText | String? | Example text for this style |

### VoiceLanguageSetting
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| characterId | UUID | Parent character |
| languageCode | String | ISO code (e.g., "hi", "en", "mr") |
| languageName | String | Display name |
| exaggeration | Float | Language-specific exaggeration |
| cfgWeight | Float | Language-specific CFG weight |
| speed | Float | Language-specific speed |
| isEnabled | Boolean | Whether language is available |

## Current Characters

### 1. Chotu (छोटू) - The Helpful Assistant
- **Personality**: Sweet, innocent village boy working in the city
- **Voice Settings**: exaggeration=0.35, cfgWeight=0.35
- **Emotions**: sweet, innocent, helpful, polite, apologetic, excited
- **Styles**: greeting, informative, apologetic, farewell
- **Languages**: Hindi (hi), English (en), Marathi (mr)

### 2. Meena (मीना) - The Friendly Guide
- **Personality**: Professional, knowledgeable female assistant
- **Voice Settings**: exaggeration=0.4, cfgWeight=0.4
- **Emotions**: professional, warm, patient, confident
- **Styles**: greeting, explaining, farewell
- **Languages**: Hindi (hi), English (en), Marathi (mr)

## API Endpoints

### Characters
- `GET /api/voice-characters` - List all characters
- `GET /api/voice-characters/:id` - Get character by ID
- `GET /api/voice-characters/name/:name` - Get by name
- `GET /api/voice-characters/default` - Get default character
- `POST /api/voice-characters` - Create character
- `PUT /api/voice-characters/:id` - Update character
- `DELETE /api/voice-characters/:id` - Delete character

### Emotions
- `POST /api/voice-characters/:id/emotions` - Add emotion
- `PUT /api/voice-characters/emotions/:emotionId` - Update
- `DELETE /api/voice-characters/emotions/:emotionId` - Delete

### Styles
- `POST /api/voice-characters/:id/styles` - Add style
- `PUT /api/voice-characters/styles/:styleId` - Update
- `DELETE /api/voice-characters/styles/:styleId` - Delete

### Languages
- `POST /api/voice-characters/:id/languages` - Add language
- `PUT /api/voice-characters/languages/:langId` - Update
- `DELETE /api/voice-characters/languages/:langId` - Delete

### Synthesis
- `POST /api/voice-characters/synthesize` - Generate speech

### Admin
- `POST /api/voice-characters/seed` - Seed default characters
- `GET /api/voice-characters/usage-stats` - Get analytics

## Synthesis Request

```json
{
  "text": "नमस्ते, मैं छोटू हूं",
  "character": "chotu",
  "language": "hi",
  "emotion": "sweet",       // optional
  "style": "greeting"       // optional
}
```

## Admin UI Access

Navigate to: **admin.mangwale.ai/admin/voice/characters**

Features:
- View/Edit all characters
- Adjust TTS parameters with live sliders
- Add/Remove emotions, styles, languages
- Test voice with live synthesis
- Set default character

## Adding New Characters

1. **Via Admin UI**: Click "New Character" button
2. **Via API**:
```bash
curl -X POST http://localhost:3200/api/voice-characters \
  -H "Content-Type: application/json" \
  -d {
