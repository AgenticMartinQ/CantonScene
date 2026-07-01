import { writeFile } from "node:fs/promises";

const apiKey = process.env.MINIMAX_API_KEY;
if (!apiKey) throw new Error("Missing MINIMAX_API_KEY");

const endpoint = process.env.MINIMAX_TTS_ENDPOINT || "https://api.minimaxi.chat/v1/t2a_v2";
const model = process.env.MINIMAX_TTS_MODEL || "speech-02-turbo";
const voiceId = process.env.MINIMAX_VOICE_ID || "male-qn-qingse";
const outputPath = process.env.MINIMAX_OUTPUT_PATH || "tmp/minimax-samples/cantonese-narration-sample.mp3";
const languageBoost = process.env.MINIMAX_LANGUAGE_BOOST || "";
const text =
  process.env.MINIMAX_SAMPLE_TEXT ||
  "傳統茶餐廳入面，有個經典香港下午茶，一個新鮮出爐菠蘿包同一杯熱奶茶擺喺枱上面。";

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model,
    text,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: 0.95,
      vol: 1,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 64000,
      format: "mp3",
      channel: 1,
    },
    ...(languageBoost ? { language_boost: languageBoost } : {}),
  }),
});

const raw = await response.text();
let json;
try {
  json = JSON.parse(raw);
} catch {
  throw new Error(`MiniMax returned non-JSON response: ${response.status} ${raw.slice(0, 300)}`);
}

if (!response.ok || json.base_resp?.status_code) {
  throw new Error(`MiniMax TTS failed: ${response.status} ${JSON.stringify(json).slice(0, 600)}`);
}

const audioHex = json.data?.audio;
const audioUrl = json.data?.audio_url;
if (audioHex) {
  await writeFile(outputPath, Buffer.from(audioHex, "hex"));
  console.log(JSON.stringify({ ok: true, model, voiceId, outputPath, traceId: json.trace_id || "", extraInfo: json.extra_info || null }, null, 2));
} else if (audioUrl) {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) throw new Error(`MiniMax audio download failed: ${audioResponse.status}`);
  await writeFile(outputPath, Buffer.from(await audioResponse.arrayBuffer()));
  console.log(JSON.stringify({ ok: true, model, voiceId, outputPath, traceId: json.trace_id || "", extraInfo: json.extra_info || null }, null, 2));
} else {
  throw new Error(`MiniMax response did not include audio: ${JSON.stringify(json).slice(0, 600)}`);
}
