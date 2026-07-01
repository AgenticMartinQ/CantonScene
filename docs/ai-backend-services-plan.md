# CantonScene AI Backend Services Plan

This plan reflects the current product direction for the web MVP and future
mobile app.

## Service Choices

| # | AI service | Current choice | Notes |
|---|---|---|---|
| 1 | Monthly generic demo photo generation | OpenAI `gpt-image-2` | Use only for generic daily-life scenes. Generate individual high-resolution vertical images, not contact sheets. |
| 2 | Real Hong Kong photo sourcing | Google image search pipeline plus licensed-source review | Build target lists for famous places, buildings, street names, and MTR stations. Prefer high-resolution images, but store license/source metadata and manually review. |
| 3 | Image object detection | Gemini 3.5 Flash | Primary model for uploaded/captured photos and approved demo photos. Ask for up to 8 objects with coordinates. |
| 4 | Object card text generation | Gemini 3.5 Flash plus Cantonese localization prompt | Generate English, Traditional Chinese Cantonese, Jyutping, object descriptions, and card coordinates. |
| 5 | Cantonese localization and QA | GPT-5-class text model | Use a Hong Kong spoken Cantonese localization pass, then a separate QA pass. |
| 6 | Object-card Cantonese TTS | MiniMax Speech first, Azure fallback | MiniMax Speech 2.8 lists Cantonese support and should be benchmarked for Hong Kong accent naturalness. Browser TTS must not be used for production. |
| 7 | Video understanding and narration | Gemini 3.5 Flash video understanding | MiniMax public docs reviewed so far focus on video generation, not video understanding. Re-evaluate if MiniMax exposes direct video-to-Cantonese description. |
| 8 | Cantonese narration TTS | MiniMax Speech first, Azure fallback | Generate sentence-level narration audio and store it in Supabase Storage. |
| 9 | Pronunciation assessment | Azure Pronunciation Assessment for MVP | Keep advanced Cantonese tone/audio-similarity assessment in backlog. |
| 10 | Detail slider regeneration | Stored object/event pool | Detect up to 8 objects/events from the beginning. `+/-` only changes how many are displayed or how verbose narration is. |

## Monthly Demo Photo Generation

For generic daily-life scenes, generate on the first day of each month:

- 30 vertical photorealistic images.
- At least 900 x 1600 final app resolution.
- No contact sheets, collage crops, watermarks, logos, or readable brand text.
- Clear foreground objects and enough empty visual space for object cards.

Prompt template:

```text
Create one high-quality photorealistic vertical smartphone photo for a
mobile Cantonese-learning app.

Scene: [specific Hong Kong daily-life scene].
Composition: 9:16 vertical frame, realistic Hong Kong environment, natural
lighting, crisp foreground objects, no collage, no mosaic, no watermark, no
readable brand logos or fictional signage.

Learning needs: include 5-8 visually clear everyday objects that can be labeled
with floating cards. Leave enough visual space around important objects.

Style: documentary smartphone photography, authentic Hong Kong daily life,
true-to-life colors, no cinematic exaggeration.
```

Named landmarks, MTR stations, famous streets, and famous buildings should use
real sourced photos instead.

## Real Photo Sourcing

Targets:

- Top 50 famous buildings.
- Top 100 famous Hong Kong places and streets.
- All MTR station names.

Search strategy:

- Use Google image search / Programmable Search-style metadata where available.
- Use image filters for large/photo results where supported.
- Prefer official tourism/government/operator sources, Wikimedia Commons, and
  clearly licensed images.
- Save candidate metadata before using a photo: source URL, image URL, author,
  license, license URL, width, height, target place, and review status.

Important: Google search discovers images; it does not grant usage rights. Every
selected real photo still needs source/license review before production use.

## Gemini Photo Object Detection Prompt

```text
You are CantonScene's visual understanding engine.

Analyze the image for Cantonese learners living in Hong Kong.

Return JSON only. Detect up to 8 visually useful learning targets. Prefer common
objects, landmarks, signs/place features, food, transport, entrances, tools, and
daily-life items that a foreign Cantonese learner would want to recognize and
say aloud.

For each target, provide:
- stable_id: short kebab-case id
- english_label: concise natural English label
- english_description: one short sentence
- bbox: normalized coordinates {x, y, width, height} from 0 to 1
- card_position: recommended floating card anchor {x, y} as percentages from 0
  to 100, avoiding important visual content and app controls
- visual_confidence: 0 to 1

Also provide:
- english_scene_summary: one sentence describing the full scene
- scene_type: photo
- detail_candidates_count

Do not invent objects that are not visible. Do not include tiny or ambiguous
items unless culturally important.
```

## Cantonese Localization Prompt

```text
You are CantonScene's Hong Kong Cantonese localization specialist.

Input will contain English scene/object labels and descriptions. Convert them
into authentic spoken Hong Kong Cantonese for adult foreign learners.

Rules:
- Use Traditional Chinese characters.
- Use natural Hong Kong spoken Cantonese, not Mandarin-style written Chinese.
- Keep object labels short and learnable.
- Descriptions should sound like a local Hong Kong person explaining the scene
  casually but clearly.
- Avoid Mainland terms when Hong Kong usage differs.
- Preserve the meaning of the English, but do not translate word-for-word.
- Keep wording suitable for TTS pronunciation.
- Avoid slang that is too niche, vulgar, or age-specific.
- Use Jyutping with tone numbers for every Cantonese label and sentence.
- If an English term is a proper Hong Kong place/MTR/building name, keep the
  accepted local Cantonese name and Jyutping.

Return JSON only:
{
  "scene": {
    "english": "...",
    "cantonese": "...",
    "jyutping": "..."
  },
  "objects": [
    {
      "stable_id": "...",
      "english_label": "...",
      "cantonese_label": "...",
      "jyutping_label": "...",
      "english_description": "...",
      "cantonese_description": "...",
      "jyutping_description": "..."
    }
  ]
}
```

## Cantonese QA Prompt

```text
You are CantonScene's Hong Kong Cantonese QA reviewer.

Review the generated Cantonese and Jyutping for authenticity, clarity, and
pronounceability.

Check:
- Does it sound like natural Hong Kong Cantonese?
- Is it too Mandarin-like or written-Chinese-like?
- Are Traditional Chinese characters used correctly?
- Is the object label short enough for a learner?
- Is Jyutping complete and consistent with the Cantonese text?
- Are local place/building/MTR names correct?
- Would a native Hong Kong speaker find the expression normal?

If acceptable, return the same JSON with "qa_status": "pass".
If not, rewrite the problematic fields and return "qa_status": "revised".
Add a short "qa_notes" array explaining any revisions.

Return JSON only.
```

## Video Understanding Prompt

```text
You are CantonScene's video understanding engine.

Analyze this short video clip, up to 10 seconds, for a Cantonese learner.

Return JSON only:
- english_scene_summary: one sentence
- english_narration: 1-3 short sentences describing what is happening
- key_objects: up to 8 objects or places visible across the clip
- key_actions: up to 5 actions
- suggested_detail_levels:
  - concise: one short narration sentence
  - normal: two short narration sentences
  - detailed: three short narration sentences with key objects/actions

Prefer everyday Hong Kong observations: transport, food, shops, station areas,
street actions, landmarks, and common objects.
Do not invent events not visible in the clip.
```

The output then goes through the same Cantonese localization and QA prompts.

## MiniMax TTS Benchmark Plan

For each candidate voice/model, generate the same test pack:

- 20 object labels, e.g. 奶茶, 菠蘿包, 港鐵, 小巴, 街市, 斑馬線.
- 10 short object descriptions.
- 10 sentence narrations from video scenes.

Score with native Hong Kong reviewers:

- Accent authenticity.
- Tone accuracy.
- Rhythm and pacing.
- Naturalness.
- Robustness on English/HK place names mixed into Cantonese.
- Audio artifacts.

Preferred initial MiniMax model: `speech-2.8-hd` for quality, then test
`speech-2.8-turbo` for lower latency/cost.

## Pronunciation Backlog

MVP:

- Azure Pronunciation Assessment.
- Store overall score, accuracy, fluency, completeness, and raw provider result.

Backlog:

- Reference-audio comparison against MiniMax-generated Cantonese.
- Cantonese syllable segmentation.
- Tone contour comparison.
- Dynamic time warping over pitch/energy features.
- Per-syllable and per-word feedback.
