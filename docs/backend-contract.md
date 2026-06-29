# CantonScene MVP Backend Contract

This document maps the current browser MVP to the production backend.

## Stack Target

- Mobile-first web app: Next.js or React after the static MVP is validated.
- Backend API: FastAPI or NestJS.
- Database: Supabase Postgres.
- Storage: Supabase Storage for original media, thumbnails, TTS audio, and user recordings.
- Jobs: Redis queue for AI processing.
- Vision: Gemini 3.5 Flash for English-first object and scene understanding.
- Cantonese engine: separate expression localization plus QA pass.
- TTS: provider abstraction for Cantonese voice bake-off.
- Pronunciation: Azure baseline plus custom signal-level analysis later.

## API Shape

### Create Scene

`POST /api/scenes`

Input:

```json
{
  "media_asset_id": "uuid",
  "scene_type": "photo",
  "detail_level": 3
}
```

Output:

```json
{
  "scene_id": "uuid",
  "status": "processing"
}
```

### Get Scene

`GET /api/scenes/{scene_id}`

Returns the original media, English summary, Cantonese summary, Jyutping,
detected object cards, reference audio, and processing status.

### Save Favorite

`POST /api/favorites`

Input:

```json
{
  "learning_scene_id": "uuid",
  "detected_object_id": "uuid",
  "favorite_type": "object"
}
```

### Create Practice Attempt

`POST /api/practice-attempts`

Input:

```json
{
  "practice_target_id": "uuid",
  "user_audio_asset_id": "uuid"
}
```

Output:

```json
{
  "attempt_id": "uuid",
  "overall_score": 84,
  "pronunciation_score": 82,
  "tone_score": 77,
  "fluency_score": 88
}
```

## AI Job Pipeline

1. Upload media to storage.
2. Create `media_assets` row.
3. Create `learning_scenes` row.
4. Queue `vision` job.
5. Store Gemini English-first objects and scene facts.
6. Queue `cantonese_expression` job.
7. Queue `cantonese_qa` job.
8. Queue `tts` job.
9. Mark scene `ready`.
10. User can save scene or create pronunciation attempts.

The static MVP currently mocks steps 4-9 in `app.js`.

## Current Local Server

`server.mjs` is the first no-framework backend bridge. It implements:

- `GET /api/health`
- `POST /api/scenes`
- Static file serving for `app.html`

The server reads `.env.local`, uploads media to the `media` bucket, inserts
`media_assets`, `learning_scenes`, `detected_objects`, and `scene_descriptions`,
then returns the scene payload to the browser.
