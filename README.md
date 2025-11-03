# Unbind AI Companion API

A reactive, emotion-aware backend that powers **Unbind**, a playful AI coach that helps Gen Z users practice social bravery. The service exposes REST endpoints for chat and emotion ingestion, orchestrates GPT-4o-mini conversations, generates personalized exposure plans, and returns a character mood plus mock voice output for the frontend.

## Getting started

### Prerequisites
- Node.js 18+ (Node 22 is recommended)

### Environment variables
Copy `.env.example` into `.env` and add your OpenAI key:

```bash
cp .env.example .env
# edit .env and set OPENAI_API_KEY
```

### Install & run
No external packages are required; the project compiles with the built-in TypeScript compiler.

```bash
npm run build
npm start
```

During development you can watch for file changes:

```bash
npm run dev
```

The server listens on `PORT` (defaults to `3000`).

## API Overview

### Health check
`GET /`

Returns a simple JSON status payload.

### `POST /api/emotion`
Stores per-second emotion readings from DeepFace.

**Body**
```json
{
  "userId": "abc123",
  "timestamp": 1730582000,
  "dominant": "fear",
  "scores": {
    "happy": 0.12,
    "sad": 0.07,
    "fear": 0.71,
    "angry": 0.03,
    "neutral": 0.07
  }
}
```

- Keeps the last 30 seconds of data per user.
- Aggregates into an `emotion_summary` for chat responses.

**Response**
```json
{ "status": "ok" }
```

### `POST /api/chat`
Sends a user message and receives the AI companion reply.

**Body**
```json
{
  "userId": "abc123",
  "message": "I get nervous around new classmates"
}
```

**Response**
```json
{
  "reply": "Safety reminders …",
  "nextAction": "continue",
  "plan": { ... optional ... },
  "emotionUsed": { "dominant": "fear", "anxious": 0.71, "calm": 0.07 },
  "sessionId": "uuid",
  "characterMood": "concerned",
  "voice": {
    "audio": "data:audio/wav;base64,...",
    "provider": "mock-voice",
    "format": "base64"
  }
}
```

Key behaviors:
- Intake flow: the AI asks onboarding questions on first contact and stores answers.
- Emotion-aware: the last 10 seconds of aggregated emotion data are injected into each prompt.
- Safety: the first two assistant replies prepend therapy/crisis reminders.
- Plan generator: after ~10 minutes or when prompted, the service returns a micro-exposure plan.
- Character mood: `calm`, `encouraging`, `celebrating`, or `concerned` for animated UI states.
- Voice: mock text-to-speech output encoded as base64; ready to swap with a real provider later.

## Project structure
```
src/
  index.ts                 # HTTP server and routing
  config/env.ts            # Minimal .env loader
  controllers/conversationController.ts
  lib/openai.ts            # GPT-4o-mini wrapper with fallback mode
  routes/chat.ts
  routes/emotion.ts
  services/
    emotionStore.ts        # In-memory emotion history & aggregation
    sessionStore.ts        # Conversation state store
    planGenerator.ts       # Personalized exposure plan builder
    disclaimer.ts          # Safety reminder helper
    tts.ts                 # Mock TTS utility
  utils/http.ts            # Request parsing helpers
  types/global.d.ts        # Minimal global typings
```

## Sample requests
Check `requests.http` for ready-to-run examples that work with VS Code REST Client or Thunder Client.

## Testing plan
- `npm run build` – TypeScript compilation to ensure type safety.
- Manual API smoke tests using the examples in `requests.http`.

## Notes
- All secrets (OpenAI API key) must be provided via environment variables.
- If no OpenAI key is set, the chat endpoint falls back to a deterministic, empathetic message so local development still works.
