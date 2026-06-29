import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const root = process.cwd();
const env = await loadEnv();
const port = Number(env.PORT || 8787);
const host = env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/api/health") {
      return sendJson(res, {
        ok: true,
        supabaseConfigured: Boolean(env.SUPABASE_URL && secretKey()),
        geminiConfigured: Boolean(env.GEMINI_API_KEY),
      });
    }

    if (req.url === "/api/scenes" && req.method === "POST") {
      return handleCreateScene(req, res);
    }

    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, { error: error.message || "Server error" }, 500);
  }
});

server.listen(port, host, () => {
  console.log(`CantonScene dev server: http://${host}:${port}/app.html`);
});

async function handleCreateScene(req, res) {
  requireEnv(["SUPABASE_URL", "GEMINI_API_KEY"]);
  if (!secretKey()) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req,
    duplex: "half",
  });
  const form = await request.formData();
  const media = form.get("media");
  const sceneType = String(form.get("scene_type") || "photo");
  const detailLevel = Number(form.get("detail_level") || 3);

  if (!media || typeof media === "string") {
    return sendJson(res, { error: "Missing media file" }, 400);
  }

  const sceneId = randomUUID();
  const mediaType = sceneType === "video" ? "video" : "photo";
  const fileExt = extensionFromMime(media.type, mediaType);
  const storagePath = `anonymous/${sceneId}/original${fileExt}`;
  const mediaBuffer = Buffer.from(await media.arrayBuffer());

  await uploadToSupabaseStorage("media", storagePath, mediaBuffer, media.type || "application/octet-stream");

  const [mediaAsset] = await supabaseInsert("media_assets", {
    media_type: mediaType,
    storage_path: storagePath,
    mime_type: media.type,
    file_size_bytes: media.size,
  });

  const analysis = await analyzeWithGemini({
    buffer: mediaBuffer,
    mimeType: media.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    mediaType,
    detailLevel,
  });

  const [scene] = await supabaseInsert("learning_scenes", {
    media_asset_id: mediaAsset.id,
    scene_type: mediaType,
    status: "ready",
    english_summary: analysis.english_summary,
    cantonese_summary: "",
    jyutping_summary: "",
    detail_level: detailLevel,
  });

  const insertedObjects = [];
  for (const [index, object] of analysis.objects.entries()) {
    const [inserted] = await supabaseInsert("detected_objects", {
      learning_scene_id: scene.id,
      english_label: object.english_label,
      cantonese_label: cantoneseDictionary[object.english_label.toLowerCase()]?.cantonese || "",
      jyutping: cantoneseDictionary[object.english_label.toLowerCase()]?.jyutping || "",
      description_en: object.description_en || "",
      bbox_x: object.bbox?.x ?? null,
      bbox_y: object.bbox?.y ?? null,
      bbox_width: object.bbox?.width ?? null,
      bbox_height: object.bbox?.height ?? null,
      confidence: object.confidence ?? null,
      display_priority: index,
    });
    insertedObjects.push(toClientObject(inserted, index));
  }

  await supabaseInsert("scene_descriptions", {
    learning_scene_id: scene.id,
    language: "english",
    description_type: mediaType === "video" ? "video_scene" : "photo_scene",
    text: analysis.english_summary,
    source_model: env.GEMINI_MODEL || "gemini-3.5-flash",
    qa_status: "approved",
  });

  return sendJson(res, {
    id: scene.id,
    type: mediaType,
    storagePath,
    englishSummary: analysis.english_summary,
    cantoneseSummary: "",
    jyutpingSummary: "",
    objects: insertedObjects,
  });
}

async function analyzeWithGemini({ buffer, mimeType, mediaType, detailLevel }) {
  const model = env.GEMINI_MODEL || "gemini-3.5-flash";
  const prompt = [
    "You are the English-first visual understanding engine for CantonScene, a Cantonese learning app.",
    "Analyze the uploaded photo or short video accurately in English only.",
    `Return ${Math.max(1, Math.min(5, detailLevel))} learning-worthy objects or scene elements.`,
    "Prefer concrete visible nouns and simple learner-friendly descriptions.",
    "Return strict JSON with this shape:",
    '{"english_summary":"...","objects":[{"english_label":"...","description_en":"...","confidence":0.0,"bbox":{"x":0,"y":0,"width":0,"height":0}}]}',
    "bbox values should be normalized percentages from 0 to 100 if you can infer them. If unsure, use null values.",
    mediaType === "video" ? "For video, summarize the main action over the clip." : "For photo, summarize the scene and visible objects.",
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: buffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText.slice(0, 260)}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  return normalizeAnalysis(JSON.parse(text));
}

function normalizeAnalysis(analysis) {
  const fallback = {
    english_summary: "A real-world scene with several visible learning objects.",
    objects: [],
  };
  const normalized = { ...fallback, ...analysis };
  normalized.objects = Array.isArray(normalized.objects) ? normalized.objects.slice(0, 5) : [];
  normalized.objects = normalized.objects.map((object, index) => ({
    english_label: String(object.english_label || object.label || `Object ${index + 1}`),
    description_en: String(object.description_en || object.description || ""),
    confidence: typeof object.confidence === "number" ? object.confidence : null,
    bbox: normalizeBbox(object.bbox),
  }));
  if (!normalized.objects.length) {
    normalized.objects.push({
      english_label: "Scene",
      description_en: normalized.english_summary,
      confidence: null,
      bbox: null,
    });
  }
  return normalized;
}

function normalizeBbox(bbox) {
  if (!bbox || typeof bbox !== "object") return null;
  return {
    x: numberOrNull(bbox.x),
    y: numberOrNull(bbox.y),
    width: numberOrNull(bbox.width),
    height: numberOrNull(bbox.height),
  };
}

function toClientObject(object, index) {
  return {
    id: object.id,
    english: object.english_label,
    cantonese: object.cantonese_label || "待翻譯",
    jyutping: object.jyutping || "",
    description: object.description_en || "",
    x: object.bbox_x ?? fallbackPositions[index % fallbackPositions.length].x,
    y: object.bbox_y ?? fallbackPositions[index % fallbackPositions.length].y,
  };
}

async function uploadToSupabaseStorage(bucket, path, buffer, contentType) {
  const response = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: secretKey(),
      authorization: `Bearer ${secretKey()}`,
      "content-type": contentType,
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase storage upload failed: ${response.status} ${errorText}`);
  }
}

async function supabaseInsert(table, row) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: secretKey(),
      authorization: `Bearer ${secretKey()}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase insert ${table} failed: ${response.status} ${errorText}`);
  }
  return response.json();
}

async function serveStatic(req, res) {
  const rawPath = new URL(req.url || "/", `http://localhost:${port}`).pathname;
  const requested = rawPath === "/" ? "/app.html" : rawPath;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const fullPath = join(root, safePath);

  if (!fullPath.startsWith(root) || !existsSync(fullPath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }

  const content = await readFile(fullPath);
  res.writeHead(200, { "content-type": mimeTypes[extname(fullPath)] || "application/octet-stream" });
  res.end(content);
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function loadEnv() {
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
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      values[key] = value;
    }
  }
  return { ...values, ...process.env };
}

function requireEnv(keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

function secretKey() {
  return env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extensionFromMime(mimeType, mediaType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "video/quicktime") return ".mov";
  if (mimeType === "video/webm") return ".webm";
  return mediaType === "video" ? ".mp4" : ".jpg";
}

const fallbackPositions = [
  { x: 42, y: 41 },
  { x: 6, y: 28 },
  { x: 8, y: 66 },
  { x: 44, y: 28 },
  { x: 12, y: 48 },
];

const cantoneseDictionary = {
  fruit: { cantonese: "生果", jyutping: "sang1 gwo2" },
  signboard: { cantonese: "招牌", jyutping: "ziu1 paai4" },
  person: { cantonese: "人", jyutping: "jan4" },
  cup: { cantonese: "杯", jyutping: "bui1" },
  tea: { cantonese: "茶", jyutping: "caa4" },
  street: { cantonese: "街", jyutping: "gaai1" },
  stall: { cantonese: "檔口", jyutping: "dong3 hau2" },
  food: { cantonese: "食物", jyutping: "sik6 mat6" },
};
