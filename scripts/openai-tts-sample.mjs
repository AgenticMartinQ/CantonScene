import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const env = await loadEnv();
const apiKey = env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

const model = process.env.OPENAI_TTS_MODEL || env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const voice = process.env.OPENAI_TTS_VOICE || env.OPENAI_TTS_VOICE || "alloy";
const outputPath = process.env.OPENAI_OUTPUT_PATH || "tmp/openai-samples/cantonese-narration-sample.mp3";
const text =
  process.env.OPENAI_SAMPLE_TEXT ||
  "傳統茶餐廳入面，有個經典香港下午茶，一個新鮮出爐菠蘿包同一杯熱奶茶擺喺枱上面。";
const instructions =
  process.env.OPENAI_TTS_INSTRUCTIONS ||
  "Read in natural Hong Kong Cantonese. Keep the tone friendly, clear, and local.";

const response = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST",
  headers: {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model,
    voice,
    input: text,
    response_format: "mp3",
    instructions,
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`OpenAI TTS failed: ${response.status} ${errorText.slice(0, 600)}`);
}

await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
console.log(JSON.stringify({ ok: true, model, voice, outputPath, characters: text.length }, null, 2));

async function loadEnv() {
  const root = process.cwd();
  const values = {};
  for (const file of [".env", ".env.local"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const text = await readFile(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
    }
  }
  return { ...values, ...process.env };
}
