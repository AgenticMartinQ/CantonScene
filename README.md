# CantonScene

CantonScene is a mobile-first Cantonese learning web app prototype.

The product lets learners capture or upload real-world photos and short videos, detect useful objects or scenes, see English plus Cantonese learning cards, listen to native Cantonese pronunciation, repeat after it, receive scores, and save scenes for later practice.

## Current MVP

The active MVP has been migrated to React under `web/`.

Run the API server and web app in two terminals:

```bash
pnpm run dev:api
pnpm run dev:web
```

Then open:

```text
http://127.0.0.1:5173/
```

Current features:

- Mobile-first camera-style home screen.
- Upload photo/video.
- Browser camera capture where supported.
- Tap shutter for photo, long-press for short video.
- Supabase/Gemini backend bridge when running through the React dev server.
- Daily anonymous demo scene with generated photo/object cards for unlimited practice.
- Demo fallback cards if backend processing is unavailable.
- English, Cantonese, and Jyutping display.
- Selected object card state.
- Native and Repeat controls beside the shutter.
- Collapsed right-side control rail.
- Email prompt before first camera shutter or favorite save in a browser session.
- Anonymous trial practice with the daily demo scene remains unlimited.
- Web trial media limit after email: 3 photo object-detection generations and 3 video narration generations per email, including shutter and Upload.
- Detail and narration conciseness adjustments regenerate the same scene without consuming another trial use.
- Trial saved scene library: 3 saved scene detection results per email identity.
- Native playback uses a browser Cantonese voice only when available; otherwise it avoids Mandarin fallback and shows a notice.
- Mock pronunciation scoring.
- AI cost logging for Gemini/OpenAI model calls, with a small in-app dashboard under the right-rail Settings button.
- OpenAI Cantonese TTS generation for processed scene narrations and object cards, with MP3s stored in Supabase Storage.

## Design Files

- `web/`: active React MVP.
- `app.html`, `app.css`, `app.js`: archived static MVP prototype.
- `learning-lens-control-options.html`: latest selected design exploration.
- `learning-lens-v2.html`: earlier focused Learning Lens review.
- `index.html`, `styles.css`: five-option design comparison.
- `assets/hong-kong-camera-bg.png`: prototype camera background.

## Backend Plan

- `database/schema.sql`: initial PostgreSQL/Supabase schema.
- `docs/backend-contract.md`: API and AI job pipeline contract.

Target stack:

- Mobile-first web MVP, later native mobile app.
- Supabase Postgres, Auth, and Storage.
- Gemini 3.5 Flash for English-first photo/video understanding.
- Separate Hong Kong Cantonese expression localization and QA engine.
- Cantonese TTS provider abstraction.
- Pronunciation scoring with stored user attempts and score details.

## Static Prototype Preview

The static prototype can be opened directly in a browser. For camera and microphone permissions, use a local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/app.html
```

## Environment

Copy `.env.example` to `.env.local` when backend integration begins. Do not commit real keys.

Required later:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
GEMINI_API_KEY
GEMINI_MODEL
OPENAI_API_KEY
OPENAI_TEXT_MODEL
OPENAI_TTS_MODEL
OPENAI_TTS_VOICE
AI_COST_PRICE_TABLE_JSON
```

## Real Backend Preview

After `.env.local` is filled and the Supabase schema/buckets exist, run:

```bash
pnpm run dev:api
pnpm run dev:web
```

Then open:

```text
http://127.0.0.1:5173/
```

The React dev server proxies `/api/*` to the local Node backend at
`http://127.0.0.1:8787`. The local server keeps the Supabase secret key and
Gemini key server-side, uploads media into Supabase Storage, asks Gemini for
English-first scene understanding, and writes scene/object rows into Supabase
Postgres.

## Vercel Preview Deployment

This repo is Vercel-ready for HTTPS mobile-browser testing.

- Build command: `pnpm run build:web`
- Output directory: `dist/web`
- API route: `api/[...path].mjs`

Add the same secret values from `.env.local` to Vercel Project Settings ->
Environment Variables before deploying. Do not commit `.env.local`.

After Vercel creates a preview URL, test `/api/health` first, then open the
preview URL on iPhone Safari to test camera permission, upload, OTP email,
video narration, Listen/Repeat, Saved, and temporary video cleanup.

## AI Cost Monitoring

`model_runs` stores one row per AI provider call. The current backend logs:

- `photo_object_detection` / `video_understanding` from Gemini.
- `cantonese_expression` from OpenAI.
- `cantonese_qa` from OpenAI.
- `cantonese_tts_scene` and `cantonese_tts_object` from OpenAI TTS.

Each row captures provider, model, task type, status, latency, token usage when
returned by the provider, media bytes, and estimated USD cost. The in-app
Settings button opens a dashboard backed by `/api/costs`.

The built-in starter estimate assumes `gpt-5.4-mini` costs `$1 / 1M` input
tokens and `$8 / 1M` output tokens, and `gpt-4o-mini-tts` costs `$0.60 / 1M`
characters. Keep this updated through `AI_COST_PRICE_TABLE_JSON` if dashboard
pricing changes.
