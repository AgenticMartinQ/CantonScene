# Real Photo Demo Library

CantonScene should use real photos for recognisable Hong Kong landmarks,
tourist places, buildings, and MTR stations. Generated images are acceptable for
generic daily-life practice scenes, but not for named places where learners need
to associate the correct visual place with its English, Cantonese, and Jyutping
pronunciation.

## Sourcing Policy

- Prefer Wikimedia Commons, official open media libraries, or photos with clear
  Creative Commons / public-domain licensing.
- Do not use random search-engine images without permission.
- Store final app photos as individual high-resolution vertical assets. Do not
  ship crops from contact sheets or collage previews because they create mosaic
  artifacts on mobile screens.
- Target at least 900 px wide by 1600 px high for daily demo photos, with clear
  foreground objects and enough visual space for floating object cards.
- Store source page, author, license, license URL, original image URL, and
  thumbnail URL for every candidate.
- Do not automatically accept the first search result. Landmark and station
  photos require a manual curation pass for visual usefulness and place accuracy.
- Avoid images dominated by readable copyrighted signage, private faces,
  advertisements, or low-quality interiors unless the scene itself is the lesson.

## Object Card QA

- Each demo scene should keep a source pool of at least 5 useful object cards.
- The home screen may display fewer cards by default, but the detail slider must
  be able to reveal additional cards when the learner asks for more detail.
- Card coordinates should be manually reviewed against the final cropped app
  image, not inherited from a draft contact sheet or source image.

## Trial Rotation Mix

The monthly 30-day anonymous demo pack should eventually contain:

- Around 40 percent real landmark / famous place / famous building photos.
- Around 30 percent real MTR / transport / station photos.
- Around 30 percent generic daily-life scenes, which may be generated or real.

## Current Implementation

- `data/photo-sourcing-targets.mjs` stores the initial target catalog:
  50 famous buildings, 100 famous Hong Kong places, and MTR station targets.
- `scripts/source-commons-photos.mjs` queries Wikimedia Commons, saves candidate
  metadata to `data/photo-sources/`, and can download pilot sample thumbnails to
  `web/public/assets/demo-scenes/real-samples/`.

Run a small pilot:

```bash
node scripts/source-commons-photos.mjs --download-samples
```

Run the full target catalog:

```bash
node scripts/source-commons-photos.mjs --all
```

The full run should be treated as candidate sourcing only. A human review pass
is still required before images enter the production daily demo rotation.
