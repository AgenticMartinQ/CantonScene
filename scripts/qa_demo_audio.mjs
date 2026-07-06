import { stat } from "node:fs/promises";
import { join } from "node:path";
import { dailyDemoScenes } from "../web/src/mockData.js";

const minBytes = 1000;
const failures = [];
const seen = new Set();

for (const scene of dailyDemoScenes) {
  checkAudio({
    label: `${scene.slug}: focus ${scene.focusCantonese || scene.focus}`,
    audioUrl: scene.focusAudioUrl,
  });
  for (const object of scene.objects) {
    checkAudio({
      label: `${scene.slug}: ${object.english} / ${object.cantonese}`,
      audioUrl: object.audioUrl,
    });
  }
}

await Promise.all([...seen].map(validateAudioFile));

if (failures.length) {
  console.error("Demo audio QA failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Demo audio QA passed for ${seen.size} referenced audio files.`);

function checkAudio({ label, audioUrl }) {
  if (!audioUrl) {
    failures.push(`${label}: missing audioUrl`);
    return;
  }
  if (!audioUrl.startsWith("/assets/audio/demo-scenes/") || !audioUrl.endsWith(".mp3")) {
    failures.push(`${label}: unexpected audioUrl ${audioUrl}`);
    return;
  }
  seen.add(audioUrl);
}

async function validateAudioFile(audioUrl) {
  const path = join(process.cwd(), "web", "public", audioUrl);
  try {
    const info = await stat(path);
    if (info.size < minBytes) failures.push(`${audioUrl}: file too small (${info.size} bytes)`);
  } catch {
    failures.push(`${audioUrl}: missing file`);
  }
}
