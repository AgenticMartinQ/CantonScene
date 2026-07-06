import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { dailyDemoScenes } from "../web/src/mockData.js";

const env = await loadEnv();
const apiKey = env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

const model = process.env.OPENAI_TTS_MODEL || env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const voice = process.env.OPENAI_TTS_VOICE || env.OPENAI_TTS_VOICE || "alloy";
const force = process.argv.includes("--force");
const minBytes = 1000;
const concurrency = Number(process.env.DEMO_AUDIO_CONCURRENCY || 3);

const tasks = demoAudioTasks();
let generated = 0;
let skipped = 0;

await runPool(tasks, concurrency, async (task) => {
  const outputPath = publicPath(task.audioUrl);
  if (!force && await fileLooksUsable(outputPath)) {
    skipped += 1;
    return;
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await generateSpeech(task, outputPath);
  generated += 1;
  console.log(`generated ${task.sceneSlug}/${task.kind}/${task.id}: ${task.text}`);
});

console.log(JSON.stringify({ ok: true, model, voice, generated, skipped, total: tasks.length }, null, 2));

function demoAudioTasks() {
  const output = [];
  for (const scene of dailyDemoScenes) {
    output.push({
      id: "focus",
      kind: "focus",
      sceneSlug: scene.slug,
      english: scene.focus,
      text: scene.focusCantonese || scene.focus,
      jyutping: scene.jyutpingSummary || "",
      audioUrl: scene.focusAudioUrl,
    });
    for (const object of scene.objects) {
      output.push({
        id: object.id,
        kind: "object",
        sceneSlug: scene.slug,
        english: object.english,
        text: object.cantonese,
        jyutping: object.jyutping,
        audioUrl: object.audioUrl,
      });
    }
  }
  return output.filter((task) => task.text && task.audioUrl);
}

async function generateSpeech(task, outputPath) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: task.text,
      response_format: "mp3",
      instructions: [
        "Read the provided Cantonese text exactly once in natural Hong Kong Cantonese.",
        "Do not add English, explanations, filler, or extra words.",
        task.jyutping ? `Target Jyutping: ${task.jyutping}.` : "",
        task.english ? `Meaning/context: ${task.english}.` : "",
      ].filter(Boolean).join(" "),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS failed for ${task.sceneSlug}/${task.id}: ${response.status} ${errorText.slice(0, 600)}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < minBytes) throw new Error(`Generated audio is too small for ${task.sceneSlug}/${task.id}: ${audio.length} bytes`);
  await writeFile(outputPath, audio);
}

async function runPool(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function fileLooksUsable(path) {
  try {
    const info = await stat(path);
    return info.size >= minBytes;
  } catch {
    return false;
  }
}

function publicPath(audioUrl) {
  if (!audioUrl.startsWith("/assets/")) throw new Error(`Unexpected demo audio URL: ${audioUrl}`);
  return join(process.cwd(), "web", "public", audioUrl);
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
