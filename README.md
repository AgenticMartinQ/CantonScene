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
- Demo fallback cards if backend processing is unavailable.
- English, Cantonese, and Jyutping display.
- Selected object card state.
- Native and Repeat controls beside the shutter.
- Collapsed right-side control rail.
- Local saved scene library.
- Mock pronunciation scoring.

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
