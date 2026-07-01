import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const env = await loadEnv();
const speechKey = env.AZURE_SPEECH_KEY || env.SPEECH_KEY;
const speechRegion = env.AZURE_SPEECH_REGION || env.SPEECH_REGION;
if (!speechKey) throw new Error("Missing AZURE_SPEECH_KEY or SPEECH_KEY");
if (!speechRegion) throw new Error("Missing AZURE_SPEECH_REGION or SPEECH_REGION");

const voice = process.env.AZURE_TTS_VOICE || env.AZURE_TTS_VOICE || "zh-HK-HiuMaanNeural";
const outputPath = process.env.AZURE_OUTPUT_PATH || "tmp/azure-samples/cantonese-narration-sample.mp3";
const text =
  process.env.AZURE_SAMPLE_TEXT ||
  "傳統茶餐廳入面，有個經典香港下午茶，一個新鮮出爐菠蘿包同一杯熱奶茶擺喺枱上面。";

const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK">
  <voice name="${escapeXml(voice)}">
    <prosody rate="-5%">${escapeXml(text)}</prosody>
  </voice>
</speak>`.trim();

const response = await fetch(`https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
  method: "POST",
  headers: {
    "Ocp-Apim-Subscription-Key": speechKey,
    "Content-Type": "application/ssml+xml",
    "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
    "User-Agent": "CantonScene",
  },
  body: ssml,
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Azure TTS failed: ${response.status} ${errorText.slice(0, 600)}`);
}

await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
console.log(JSON.stringify({ ok: true, voice, outputPath, characters: text.length }, null, 2));

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
