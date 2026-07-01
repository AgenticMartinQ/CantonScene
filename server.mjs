import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const root = process.cwd();
const env = await loadEnv();
const port = Number(env.PORT || 8787);
const host = env.HOST || "127.0.0.1";
const signedAudioUrlSeconds = 60 * 60 * 24 * 7;

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

export async function handleNodeRequest(req, res) {
  try {
    if (req.url === "/api/health") {
      return sendJson(res, {
        ok: true,
        supabaseConfigured: Boolean(env.SUPABASE_URL && secretKey()),
        geminiConfigured: Boolean(env.GEMINI_API_KEY),
        openaiConfigured: Boolean(env.OPENAI_API_KEY),
        photoUnderstandingProvider: photoUnderstandingProvider(),
        photoUnderstandingModel: photoUnderstandingProvider() === "openai" ? openAiVisionModel() : env.GEMINI_MODEL || "gemini-3.5-flash",
        videoUnderstandingProvider: videoUnderstandingProvider(),
        videoUnderstandingModel: videoUnderstandingProvider() === "openai_frames" ? openAiVideoModel() : env.GEMINI_MODEL || "gemini-3.5-flash",
      });
    }

    if (req.url === "/api/costs" && req.method === "GET") {
      return await handleCostDashboard(req, res);
    }

    if (req.url === "/api/auth/request-otp" && req.method === "POST") {
      return await handleRequestEmailOtp(req, res);
    }

    if (req.url === "/api/auth/verify-otp" && req.method === "POST") {
      return await handleVerifyEmailOtp(req, res);
    }

    if (req.url?.startsWith("/api/media-url") && req.method === "GET") {
      return await handleMediaUrl(req, res);
    }

    if (req.url === "/api/scenes" && req.method === "POST") {
      return await handleCreateScene(req, res);
    }

    if (req.url === "/api/temporary-media/cleanup" && req.method === "POST") {
      return await handleTemporaryMediaCleanup(req, res);
    }

    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, { error: error.message || "Server error" }, 500);
  }
}

const server = createServer(handleNodeRequest);

if (isDirectRun()) {
  server.listen(port, host, () => {
    console.log(`CantonScene dev server: http://${host}:${port}/app.html`);
  });
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

async function handleCreateScene(req, res) {
  requireEnv(["SUPABASE_URL", "GEMINI_API_KEY"]);
  if (!secretKey()) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  const profiler = createProfiler();

  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req,
    duplex: "half",
  });
  const form = await request.formData();
  profiler.mark("parse_form");
  const media = form.get("media");
  const videoFrameFiles = form.getAll("video_frame").filter((item) => item && typeof item !== "string");
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
  const videoFrames = [];
  if (sceneType === "video") {
    for (const frame of videoFrameFiles.slice(0, 10)) {
      videoFrames.push({
        buffer: Buffer.from(await frame.arrayBuffer()),
        mimeType: frame.type || "image/jpeg",
      });
    }
  }
  profiler.mark("read_media");

  await uploadToSupabaseStorage("media", storagePath, mediaBuffer, media.type || "application/octet-stream");
  const signedMediaUrl = await createSignedStorageUrl("media", storagePath, signedAudioUrlSeconds);
  profiler.mark("upload_media");

  const [mediaAsset] = await supabaseInsert("media_assets", {
    media_type: mediaType,
    storage_path: storagePath,
    mime_type: media.type,
    file_size_bytes: media.size,
  });
  profiler.mark("insert_media_asset");

  const analysis = await analyzeSceneMedia({
    buffer: mediaBuffer,
    mimeType: media.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    mediaType,
    videoFrames,
  });
  profiler.mark("scene_understanding");
  const clientAnalysis = mediaType === "video" ? { ...analysis, objects: [] } : analysis;
  const localized = await safelyLocalizeCantonese(clientAnalysis, { sceneType: mediaType, mediaBytes: mediaBuffer.byteLength });
  profiler.mark("cantonese_localization_qa");

  const [scene] = await supabaseInsert("learning_scenes", {
    media_asset_id: mediaAsset.id,
    scene_type: mediaType,
    status: "ready",
    english_summary: clientAnalysis.english_summary,
    cantonese_summary: localized.scene.cantonese,
    jyutping_summary: localized.scene.jyutping,
    detail_level: detailLevel,
  });
  profiler.mark("insert_learning_scene");

  const insertedObjects = [];
  for (const [index, object] of clientAnalysis.objects.entries()) {
    const localizedObject = localized.objects.find((item) => item.stable_id === object.stable_id) || {};
    const [inserted] = await supabaseInsert("detected_objects", {
      learning_scene_id: scene.id,
      english_label: object.english_label,
      cantonese_label: localizedObject.cantonese_label || "",
      jyutping: localizedObject.jyutping_label || "",
      description_en: object.description_en || "",
      bbox_x: object.bbox?.x ?? null,
      bbox_y: object.bbox?.y ?? null,
      bbox_width: object.bbox?.width ?? null,
      bbox_height: object.bbox?.height ?? null,
      confidence: object.confidence ?? null,
      display_priority: index,
    });
    insertedObjects.push(toClientObject(inserted, object, localizedObject, index));
  }
  profiler.mark("insert_detected_objects");

  const audio = await safelyGenerateSceneAudio({
    scene,
    mediaType,
    objects: insertedObjects,
    cantoneseSummary: localized.scene.cantonese,
    mediaBytes: mediaBuffer.byteLength,
  });
  profiler.mark("openai_tts_audio");

  await supabaseInsert("scene_descriptions", {
    learning_scene_id: scene.id,
    language: "english",
    description_type: mediaType === "video" ? "video_scene" : "photo_scene",
    text: clientAnalysis.english_summary,
    source_model: understandingSourceModel(mediaType),
    qa_status: "approved",
  });
  await supabaseInsert("scene_descriptions", {
    learning_scene_id: scene.id,
    language: "cantonese",
    description_type: mediaType === "video" ? "video_scene" : "photo_scene",
    text: localized.scene.cantonese,
    jyutping: localized.scene.jyutping,
    source_model: env.OPENAI_TEXT_MODEL || "gpt-5",
    qa_status: localized.qa_status === "pass" || localized.qa_status === "revised" ? "approved" : "pending",
  });
  profiler.mark("insert_scene_descriptions");

  return sendJson(res, {
    id: scene.id,
    type: mediaType,
    storagePath,
    mediaUrl: signedMediaUrl,
    englishSummary: clientAnalysis.english_summary,
    cantoneseSummary: localized.scene.cantonese,
    jyutpingSummary: localized.scene.jyutping,
    cantoneseAudioUrl: audio.sceneAudioUrl,
    audioStatus: audio.audio_status,
    audioError: audio.audio_error,
    localizationStatus: localized.localization_status,
    localizationError: localized.localization_error,
    objects: insertedObjects.map((object) => ({
      ...object,
      audioUrl: audio.objectAudioUrls[object.id] || "",
    })),
    processingProfile: {
      ...profiler.summary(),
      models: processingProfileModels(mediaType),
    },
  });
}

async function handleCostDashboard(req, res) {
  requireEnv(["SUPABASE_URL"]);
  if (!secretKey()) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

  let rows = [];
  try {
    rows = await supabaseSelect(
      "model_runs",
      "id,created_at,provider,model_name,task_type,status,input_tokens,output_tokens,total_tokens,media_bytes,latency_ms,input_cost_usd,output_cost_usd,cost_estimate,usage_json,error_message",
      "order=created_at.desc&limit=120",
    );
  } catch (error) {
    if (isMissingCostMigration(error)) {
      return sendJson(res, {
        generatedAt: new Date().toISOString(),
        currency: "USD",
        migrationRequired: true,
        migrationFile: "database/cost-monitoring-migration.sql",
        summary: { runs: 0, pricedRuns: 0, totalCostUsd: 0, byTask: [] },
        recentRuns: [],
      });
    }
    throw error;
  }
  const summary = summarizeCostRows(rows);
  return sendJson(res, {
    generatedAt: new Date().toISOString(),
    currency: "USD",
    summary,
    recentRuns: rows.map(toClientCostRun),
  });
}

async function handleMediaUrl(req, res) {
  requireEnv(["SUPABASE_URL"]);
  if (!secretKey()) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(req.url, `http://localhost:${port}`);
  const storagePath = url.searchParams.get("path") || "";
  if (!storagePath || storagePath.includes("..") || storagePath.startsWith("/")) {
    return sendJson(res, { error: "Invalid media path" }, 400);
  }
  const mediaUrl = await createSignedStorageUrl("media", storagePath, signedAudioUrlSeconds);
  return sendJson(res, { mediaUrl });
}

async function handleRequestEmailOtp(req, res) {
  requireEnv(["SUPABASE_URL"]);
  const authKey = supabaseAuthApiKey();
  if (!authKey) throw new Error("Missing SUPABASE_PUBLISHABLE_KEY or Supabase service key");
  const payload = await readJsonRequestBody(req);
  const email = normalizeEmail(payload.email);
  if (!email) return sendJson(res, { error: "Invalid email" }, 400);

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: authKey,
      authorization: `Bearer ${authKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      create_user: true,
      should_create_user: true,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    return sendJson(res, { error: `Supabase OTP request failed: ${errorText.slice(0, 240)}` }, response.status);
  }
  return sendJson(res, { ok: true });
}

async function handleVerifyEmailOtp(req, res) {
  requireEnv(["SUPABASE_URL"]);
  const authKey = supabaseAuthApiKey();
  if (!authKey) throw new Error("Missing SUPABASE_PUBLISHABLE_KEY or Supabase service key");
  const payload = await readJsonRequestBody(req);
  const email = normalizeEmail(payload.email);
  const token = String(payload.token || "").trim().replace(/\s+/g, "");
  if (!email || token.length < 4) return sendJson(res, { error: "Invalid email or code" }, 400);

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: authKey,
      authorization: `Bearer ${authKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      token,
      type: "email",
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return sendJson(res, { error: `Supabase OTP verify failed: ${JSON.stringify(json).slice(0, 240)}` }, response.status);
  }
  return sendJson(res, {
    ok: true,
    email: json.user?.email || email,
    userId: json.user?.id || "",
    expiresAt: json.expires_at || null,
  });
}

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

async function handleTemporaryMediaCleanup(req, res) {
  requireEnv(["SUPABASE_URL"]);
  if (!secretKey()) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

  const payload = await readJsonRequestBody(req);
  const storagePaths = Array.isArray(payload.storagePaths)
    ? payload.storagePaths.filter(isSafeTemporaryMediaPath).slice(0, 20)
    : [];

  if (!storagePaths.length) return sendJson(res, { deleted: [] });

  await deleteSupabaseStorageObjects("media", storagePaths);
  return sendJson(res, { deleted: storagePaths });
}

async function readJsonRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function isSafeTemporaryMediaPath(path) {
  const value = String(path || "");
  return /^anonymous\/[0-9a-f-]{36}\/original\.(mp4|webm|mov|m4v)$/i.test(value);
}

function isMissingCostMigration(error) {
  const message = error.message || "";
  return message.includes("42703") || message.includes("task_type") || message.includes("input_tokens");
}

function createProfiler() {
  const startedAt = Date.now();
  let previousAt = startedAt;
  const steps = [];

  return {
    mark(name) {
      const now = Date.now();
      steps.push({
        name,
        durationMs: now - previousAt,
        elapsedMs: now - startedAt,
      });
      previousAt = now;
    },
    summary() {
      const totalMs = Date.now() - startedAt;
      return {
        totalMs,
        steps,
        slowestSteps: [...steps].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
      };
    },
  };
}

function processingProfileModels(mediaType) {
  const visionProvider = photoUnderstandingProvider();
  const photoModel = visionProvider === "openai" ? openAiVisionModel() : env.GEMINI_MODEL || "gemini-3.5-flash";
  const videoProvider = videoUnderstandingProvider();
  const videoModel = videoProvider === "openai_frames" ? openAiVideoModel() : env.GEMINI_MODEL || "gemini-3.5-flash";
  return {
    photo_object_detection: photoModel,
    video_understanding: videoModel,
    cantonese_expression: env.OPENAI_TEXT_MODEL || "gpt-5",
    cantonese_qa: env.OPENAI_TEXT_MODEL || "gpt-5",
    cantonese_tts_scene: env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
    cantonese_tts_object: env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
    cantonese_tts_voice: env.OPENAI_TTS_VOICE || "alloy",
  };
}

function photoUnderstandingProvider() {
  return String(env.PHOTO_UNDERSTANDING_PROVIDER || "openai").trim().toLowerCase();
}

function videoUnderstandingProvider() {
  return String(env.VIDEO_UNDERSTANDING_PROVIDER || "openai_frames").trim().toLowerCase();
}

function openAiVisionModel() {
  return env.OPENAI_VISION_MODEL || env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";
}

function openAiVideoModel() {
  return env.OPENAI_VIDEO_MODEL || env.OPENAI_VISION_MODEL || env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";
}

function understandingSourceModel(mediaType) {
  if (mediaType === "video" && videoUnderstandingProvider() === "openai_frames") return openAiVideoModel();
  if (mediaType === "photo" && photoUnderstandingProvider() === "openai") return openAiVisionModel();
  return env.GEMINI_MODEL || "gemini-3.5-flash";
}


async function safelyLocalizeCantonese(analysis, context = {}) {
  if (!env.OPENAI_API_KEY) {
    return fallbackLocalization(analysis, {
      localization_status: "skipped",
      localization_error: "Missing OPENAI_API_KEY",
    });
  }
  try {
    return {
      ...(await localizeAndQaCantonese(analysis, context)),
      localization_status: "complete",
      localization_error: "",
    };
  } catch (error) {
    console.warn(error.message || error);
    return fallbackLocalization(analysis, {
      localization_status: "failed",
      localization_error: publicLocalizationError(error),
    });
  }
}

function publicLocalizationError(error) {
  const message = error.message || "";
  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "OpenAI localization quota is unavailable. Check API billing or service account limits.";
  }
  return "OpenAI localization failed.";
}

async function safelyGenerateSceneAudio({ scene, mediaType, objects, cantoneseSummary, mediaBytes }) {
  if (!env.OPENAI_API_KEY) {
    return {
      audio_status: "skipped",
      audio_error: "Missing OPENAI_API_KEY",
      sceneAudioUrl: "",
      objectAudioUrls: {},
    };
  }

  try {
    const sceneAudioUrl = cantoneseSummary
      ? await generateAndStoreTtsAudio({
          sceneId: scene.id,
          text: cantoneseSummary,
          storagePath: `anonymous/${scene.id}/scene-cantonese.mp3`,
          taskType: "cantonese_tts_scene",
          mediaType,
          mediaBytes,
        })
      : "";

    const objectAudioUrls = {};
    for (const object of objects) {
      if (!object.cantonese || object.cantonese === "待翻譯") continue;
      objectAudioUrls[object.id] = await generateAndStoreTtsAudio({
        sceneId: scene.id,
        detectedObjectId: object.dbId,
        text: object.cantonese,
        storagePath: `anonymous/${scene.id}/objects/${safeStorageName(object.id)}.mp3`,
        taskType: "cantonese_tts_object",
        mediaType,
        mediaBytes,
      });
    }

    return {
      audio_status: "complete",
      audio_error: "",
      sceneAudioUrl,
      objectAudioUrls,
    };
  } catch (error) {
    console.warn(error.message || error);
    return {
      audio_status: "failed",
      audio_error: publicTtsError(error),
      sceneAudioUrl: "",
      objectAudioUrls: {},
    };
  }
}

function publicTtsError(error) {
  const message = error.message || "";
  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "OpenAI TTS quota is unavailable. Check API billing or service account limits.";
  }
  return "Cantonese TTS generation failed.";
}

async function generateAndStoreTtsAudio({ sceneId, detectedObjectId = null, text, storagePath, taskType, mediaType, mediaBytes }) {
  const model = env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
  const voice = env.OPENAI_TTS_VOICE || "alloy";
  const started = Date.now();
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: "mp3",
      instructions: "Read in natural Hong Kong Cantonese. Keep the tone friendly, clear, and local.",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    await logModelRun({
      provider: "openai",
      model,
      taskType,
      status: "failed",
      latencyMs: Date.now() - started,
      mediaBytes,
      usage: usageFromCharacters(text),
      errorMessage: `OpenAI TTS request failed: ${response.status} ${errorText.slice(0, 260)}`,
    });
    throw new Error(`OpenAI TTS request failed: ${response.status} ${errorText.slice(0, 260)}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  await uploadToSupabaseStorage("generated-audio", storagePath, audioBuffer, "audio/mpeg");
  await supabaseInsert("generated_audio", {
    learning_scene_id: sceneId,
    detected_object_id: detectedObjectId,
    tts_provider: "openai",
    voice_id: voice,
    language_code: "zh-HK",
    storage_path: storagePath,
  });
  await logModelRun({
    provider: "openai",
    model,
    taskType,
    status: "complete",
    latencyMs: Date.now() - started,
    mediaBytes,
    usage: usageFromCharacters(text),
    outputJson: {
      voice,
      storage_path: storagePath,
      audio_bytes: audioBuffer.byteLength,
      media_type: mediaType,
    },
  });

  return createSignedStorageUrl("generated-audio", storagePath, signedAudioUrlSeconds);
}

async function analyzeSceneMedia({ buffer, mimeType, mediaType, videoFrames = [] }) {
  if (mediaType === "video" && videoUnderstandingProvider() === "openai_frames") {
    if (videoFrames.length) return analyzeVideoFramesWithOpenAi({ frames: videoFrames, mediaBytes: buffer.byteLength });
    if (env.VIDEO_UNDERSTANDING_FALLBACK === "gemini") return analyzeWithGemini({ buffer, mimeType, mediaType });
    throw new Error("Missing sampled video frames for OpenAI video understanding");
  }

  if (mediaType === "photo" && photoUnderstandingProvider() === "openai") {
    try {
      return await analyzePhotoWithOpenAi({ buffer, mimeType });
    } catch (error) {
      if (env.GEMINI_API_KEY && isOpenAiImageFormatError(error)) {
        console.warn(`OpenAI photo understanding rejected image format; falling back to Gemini: ${error.message || error}`);
        return analyzeWithGemini({ buffer, mimeType, mediaType });
      }
      throw error;
    }
  }
  return analyzeWithGemini({ buffer, mimeType, mediaType });
}

async function analyzeVideoFramesWithOpenAi({ frames, mediaBytes }) {
  if (!env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY for OpenAI video understanding");

  const model = openAiVideoModel();
  const detail = env.OPENAI_VISION_DETAIL || "low";
  const taskType = "video_understanding";
  const started = Date.now();
  let response;
  const frameInputs = frames.slice(0, 10).map((frame) => {
    const imageMimeType = supportedImageMimeType(frame.buffer, frame.mimeType) || "image/jpeg";
    return {
      type: "input_image",
      image_url: `data:${imageMimeType};base64,${frame.buffer.toString("base64")}`,
      detail,
    };
  });

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: videoFrameUnderstandingPrompt(frames.length) },
              ...frameInputs,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await logModelRun({
        provider: "openai",
        model,
        taskType,
        status: "failed",
        latencyMs: Date.now() - started,
        mediaBytes,
        inputJson: { frame_count: frames.length, detail },
        errorMessage: `OpenAI video frame request failed: ${response.status} ${errorText.slice(0, 260)}`,
      });
      throw new Error(`OpenAI video frame request failed: ${response.status} ${errorText.slice(0, 260)}`);
    }

    const json = await response.json();
    const text = responseOutputText(json);
    await logModelRun({
      provider: "openai",
      model,
      taskType,
      status: "complete",
      latencyMs: Date.now() - started,
      mediaBytes,
      usage: usageFromOpenAi(json.usage),
      inputJson: { frame_count: frames.length, detail },
      outputJson: {
        provider: "openai_frame_sampling",
        frame_count: frames.length,
        detail,
      },
    });
    return normalizeAnalysis(JSON.parse(stripJsonFence(text)), { allowEmptyObjects: true });
  } catch (error) {
    if (!response) {
      await logModelRun({
        provider: "openai",
        model,
        taskType,
        status: "failed",
        latencyMs: Date.now() - started,
        mediaBytes,
        inputJson: { frame_count: frames.length, detail },
        errorMessage: error.message || "OpenAI video frame request failed",
      });
    }
    throw error;
  }
}

async function analyzePhotoWithOpenAi({ buffer, mimeType }) {
  if (!env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY for OpenAI photo understanding");

  const model = openAiVisionModel();
  const detail = env.OPENAI_VISION_DETAIL || "low";
  const imageMimeType = supportedImageMimeType(buffer, mimeType);
  if (!imageMimeType) {
    throw new Error(`OpenAI vision unsupported image format: ${mimeType || "unknown"}`);
  }
  const taskType = "photo_object_detection";
  const started = Date.now();
  let response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: photoObjectDetectionPrompt() },
              {
                type: "input_image",
                image_url: `data:${imageMimeType};base64,${buffer.toString("base64")}`,
                detail,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await logModelRun({
        provider: "openai",
        model,
        taskType,
        status: "failed",
        latencyMs: Date.now() - started,
        mediaBytes: buffer.byteLength,
        errorMessage: `OpenAI vision request failed: ${response.status} ${errorText.slice(0, 260)}`,
      });
      throw new Error(`OpenAI vision request failed: ${response.status} ${errorText.slice(0, 260)}`);
    }

    const json = await response.json();
    const text = responseOutputText(json);
    await logModelRun({
      provider: "openai",
      model,
      taskType,
      status: "complete",
      latencyMs: Date.now() - started,
      mediaBytes: buffer.byteLength,
      usage: usageFromOpenAi(json.usage),
      outputJson: {
        provider: "openai",
        detail,
      },
    });
    return normalizeAnalysis(JSON.parse(stripJsonFence(text)));
  } catch (error) {
    if (!response) {
      await logModelRun({
        provider: "openai",
        model,
        taskType,
        status: "failed",
        latencyMs: Date.now() - started,
        mediaBytes: buffer.byteLength,
        errorMessage: error.message || "OpenAI vision request failed",
      });
    }
    throw error;
  }
}

function supportedImageMimeType(buffer, declaredMimeType = "") {
  const declared = String(declaredMimeType || "").toLowerCase();
  const detected = detectImageMimeType(buffer);
  const candidate = detected || declared;
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(candidate)) return candidate;
  return null;
}

function detectImageMimeType(buffer) {
  if (!buffer || buffer.byteLength < 12) return "";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer.slice(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "";
}

function isOpenAiImageFormatError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("valid image") || message.includes("supported image") || message.includes("unsupported image format");
}

function responseOutputText(response) {
  if (response.output_text) return response.output_text;
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.text) chunks.push(content.text);
    }
  }
  return chunks.join("");
}

function stripJsonFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function analyzeWithGemini({ buffer, mimeType, mediaType }) {
  const model = env.GEMINI_MODEL || "gemini-3.5-flash";
  const prompt = mediaType === "video" ? videoUnderstandingPrompt() : photoObjectDetectionPrompt();
  const taskType = mediaType === "video" ? "video_understanding" : "photo_object_detection";
  const started = Date.now();
  let response;

  try {
    response = await fetch(
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
      await logModelRun({
        provider: "google",
        model,
        taskType,
        status: "failed",
        latencyMs: Date.now() - started,
        mediaBytes: buffer.byteLength,
        errorMessage: `Gemini request failed: ${response.status} ${errorText.slice(0, 260)}`,
      });
      throw new Error(`Gemini request failed: ${response.status} ${errorText.slice(0, 260)}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    await logModelRun({
      provider: "google",
      model,
      taskType,
      status: "complete",
      latencyMs: Date.now() - started,
      mediaBytes: buffer.byteLength,
      usage: usageFromGemini(json.usageMetadata),
    });
    return normalizeAnalysis(JSON.parse(text), { allowEmptyObjects: mediaType === "video" });
  } catch (error) {
    if (!response) {
      await logModelRun({
        provider: "google",
        model,
        taskType,
        status: "failed",
        latencyMs: Date.now() - started,
        mediaBytes: buffer.byteLength,
        errorMessage: error.message || "Gemini request failed",
      });
    }
    throw error;
  }
}

function normalizeAnalysis(analysis, options = {}) {
  const fallback = {
    english_summary: "A real-world scene with several visible learning objects.",
    objects: [],
  };
  const normalized = {
    ...fallback,
    ...analysis,
    english_summary: analysis.english_summary || analysis.english_scene_summary || fallback.english_summary,
  };
  normalized.objects = Array.isArray(normalized.objects || normalized.key_objects)
    ? (normalized.objects || normalized.key_objects).slice(0, 8)
    : [];
  normalized.objects = normalized.objects.map((object, index) => ({
    stable_id: String(object.stable_id || object.id || `object-${index + 1}`),
    english_label: String(object.english_label || object.label || object.name || `Object ${index + 1}`),
    description_en: String(object.description_en || object.english_description || object.description || ""),
    confidence: typeof object.confidence === "number" ? object.confidence : typeof object.visual_confidence === "number" ? object.visual_confidence : null,
    bbox: normalizeBbox(object.bbox),
    card_position: normalizeCardPosition(object.card_position),
  }));
  if (!normalized.objects.length && !options.allowEmptyObjects) {
    normalized.objects.push({
      english_label: "Scene",
      description_en: normalized.english_summary,
      confidence: null,
      bbox: null,
    });
  }
  return normalized;
}

function photoObjectDetectionPrompt() {
  return [
    "You are CantonScene's visual understanding engine.",
    "Analyze the image for Cantonese learners living in Hong Kong.",
    "Return JSON only. Detect up to 8 visually useful learning targets.",
    "Prefer common objects, landmarks, signs/place features, food, transport, entrances, tools, and daily-life items that a foreign Cantonese learner would want to recognize and say aloud.",
    "For each target, provide:",
    "- stable_id: short kebab-case id",
    "- english_label: concise natural English label",
    "- english_description: one short sentence",
    "- bbox: normalized coordinates {x, y, width, height} from 0 to 1",
    "- card_position: recommended floating card anchor {x, y} as percentages from 0 to 100, avoiding important visual content, the right rail, and bottom shutter controls",
    "- visual_confidence: 0 to 1",
    "Also provide:",
    "- english_scene_summary: one sentence describing the full scene",
    "- scene_type: photo",
    "- detail_candidates_count",
    "Do not invent objects that are not visible. Do not include tiny or ambiguous items unless culturally important.",
    'Use this exact top-level JSON shape: {"english_scene_summary":"...","scene_type":"photo","detail_candidates_count":0,"objects":[{"stable_id":"...","english_label":"...","english_description":"...","bbox":{"x":0,"y":0,"width":0,"height":0},"card_position":{"x":0,"y":0},"visual_confidence":0.0}]}',
  ].join("\n");
}

function videoUnderstandingPrompt() {
  return [
    "You are CantonScene's video understanding engine.",
    "Analyze this short video clip, up to 10 seconds, for a Cantonese learner.",
    "Return JSON only.",
    "Provide english_scene_summary as one natural sentence describing what is happening in the clip.",
    "Also provide up to 5 key_actions as short English phrases if useful.",
    "Do not return object cards for video. Use an empty objects array.",
    "Prefer everyday Hong Kong observations: transport, food, shops, station areas, street actions, landmarks, and common activities.",
    "Do not invent events not visible in the clip.",
    'Use this exact top-level JSON shape: {"english_scene_summary":"...","scene_type":"video","key_actions":["..."],"objects":[]}',
  ].join("\n");
}

function videoFrameUnderstandingPrompt(frameCount) {
  return [
    "You are CantonScene's video understanding engine.",
    `You will receive ${frameCount} sampled frames from one short video clip, ordered from beginning to end.`,
    "Infer the main visible action from the sequence, but be conservative when motion is unclear.",
    "Return JSON only.",
    "Provide english_scene_summary as one natural sentence describing what is happening in the clip.",
    "Also provide up to 5 key_actions as short English phrases if useful.",
    "Do not return object cards for video. Use an empty objects array.",
    "Prefer everyday observations useful for Cantonese learners: people, animals, transport, food, shops, stations, streets, landmarks, and common activities.",
    "Do not describe the app's background image or any UI overlay. Only describe the uploaded video frames.",
    "Do not invent events not visible across the frames.",
    'Use this exact top-level JSON shape: {"english_scene_summary":"...","scene_type":"video","key_actions":["..."],"objects":[]}',
  ].join("\n");
}

async function localizeAndQaCantonese(analysis, context = {}) {
  const localized = await callOpenAiJson({
    taskType: "cantonese_expression",
    messages: [
      { role: "system", content: cantoneseLocalizationSystemPrompt() },
      { role: "user", content: JSON.stringify(localizationInput(analysis)) },
    ],
    temperature: 0.2,
    mediaBytes: context.mediaBytes,
  });
  const qaResult = await callOpenAiJson({
    taskType: "cantonese_qa",
    messages: [
      { role: "system", content: cantoneseQaSystemPrompt() },
      { role: "user", content: JSON.stringify(normalizeLocalizedResult(localized, analysis)) },
    ],
    temperature: 0.1,
    mediaBytes: context.mediaBytes,
  });
  return normalizeLocalizedResult(qaResult, analysis);
}

async function callOpenAiJson({ taskType, messages, temperature, mediaBytes }) {
  const model = env.OPENAI_TEXT_MODEL || "gpt-5";
  const started = Date.now();
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
  };
  if (!model.startsWith("gpt-5") && temperature != null) body.temperature = temperature;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    await logModelRun({
      provider: "openai",
      model,
      taskType,
      status: "failed",
      latencyMs: Date.now() - started,
      mediaBytes,
      errorMessage: `OpenAI localization request failed: ${response.status} ${errorText.slice(0, 260)}`,
    });
    throw new Error(`OpenAI localization request failed: ${response.status} ${errorText.slice(0, 260)}`);
  }
  const json = await response.json();
  await logModelRun({
    provider: "openai",
    model,
    taskType,
    status: "complete",
    latencyMs: Date.now() - started,
    mediaBytes,
    usage: usageFromOpenAi(json.usage),
  });
  const text = json.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text);
}

function localizationInput(analysis) {
  return {
    scene: {
      english: analysis.english_summary,
    },
    objects: analysis.objects.map((object) => ({
      stable_id: object.stable_id,
      english_label: object.english_label,
      english_description: object.description_en,
    })),
  };
}

function normalizeLocalizedResult(result, analysis) {
  const scene = result.scene || {};
  const objects = Array.isArray(result.objects) ? result.objects : [];
  return {
    qa_status: result.qa_status || "pending",
    qa_notes: Array.isArray(result.qa_notes) ? result.qa_notes : [],
    scene: {
      english: scene.english || analysis.english_summary,
      cantonese: scene.cantonese || "",
      jyutping: scene.jyutping || "",
    },
    objects: analysis.objects.map((object) => {
      const localized = objects.find((item) => item.stable_id === object.stable_id || item.english_label === object.english_label) || {};
      return {
        stable_id: object.stable_id,
        english_label: object.english_label,
        cantonese_label: localized.cantonese_label || "",
        jyutping_label: localized.jyutping_label || "",
        english_description: object.description_en,
        cantonese_description: localized.cantonese_description || "",
        jyutping_description: localized.jyutping_description || "",
      };
    }),
  };
}

function fallbackLocalization(analysis, meta = {}) {
  return {
    ...normalizeLocalizedResult(
    {
      qa_status: "pending",
      scene: {
        english: analysis.english_summary,
        cantonese: "",
        jyutping: "",
      },
      objects: [],
    },
    analysis,
    ),
    localization_status: meta.localization_status || "skipped",
    localization_error: meta.localization_error || "",
  };
}

function cantoneseLocalizationSystemPrompt() {
  return [
    "You are CantonScene's Hong Kong Cantonese localization specialist.",
    "Input will contain English scene/object labels and descriptions. Convert them into authentic spoken Hong Kong Cantonese for adult foreign learners.",
    "Rules:",
    "- Use Traditional Chinese characters.",
    "- Use natural Hong Kong spoken Cantonese, not Mandarin-style written Chinese.",
    "- Keep object labels short and learnable.",
    "- Descriptions should sound like a local Hong Kong person explaining the scene casually but clearly.",
    "- Avoid Mainland terms when Hong Kong usage differs.",
    "- Preserve the meaning of the English, but do not translate word-for-word.",
    "- Keep wording suitable for TTS pronunciation.",
    "- Avoid slang that is too niche, vulgar, or age-specific.",
    "- Use Jyutping with tone numbers for every Cantonese label and sentence.",
    "- If an English term is a proper Hong Kong place/MTR/building name, keep the accepted local Cantonese name and Jyutping.",
    'Return JSON only with this shape: {"scene":{"english":"...","cantonese":"...","jyutping":"..."},"objects":[{"stable_id":"...","english_label":"...","cantonese_label":"...","jyutping_label":"...","english_description":"...","cantonese_description":"...","jyutping_description":"..."}]}',
  ].join("\n");
}

function cantoneseQaSystemPrompt() {
  return [
    "You are CantonScene's Hong Kong Cantonese QA reviewer.",
    "Review the generated Cantonese and Jyutping for authenticity, clarity, and pronounceability.",
    "Check:",
    "- Does it sound like natural Hong Kong Cantonese?",
    "- Is it too Mandarin-like or written-Chinese-like?",
    "- Are Traditional Chinese characters used correctly?",
    "- Is the object label short enough for a learner?",
    "- Is Jyutping complete and consistent with the Cantonese text?",
    "- Are local place/building/MTR names correct?",
    "- Would a native Hong Kong speaker find the expression normal?",
    'If acceptable, return the same JSON with "qa_status": "pass".',
    'If not, rewrite the problematic fields and return "qa_status": "revised".',
    'Add a short "qa_notes" array explaining any revisions.',
    "Return JSON only.",
  ].join("\n");
}

function normalizeBbox(bbox) {
  if (!bbox || typeof bbox !== "object") return null;
  return {
    x: normalizePercent(bbox.x),
    y: normalizePercent(bbox.y),
    width: normalizePercent(bbox.width),
    height: normalizePercent(bbox.height),
  };
}

function normalizeCardPosition(position) {
  if (!position || typeof position !== "object") return null;
  const x = normalizePercent(position.x);
  const y = normalizePercent(position.y);
  if (x == null || y == null) return null;
  return { x, y };
}

function toClientObject(object, analysisObject, localizedObject, index) {
  const position = analysisObject.card_position || cardPositionFromBbox(analysisObject.bbox) || fallbackPositions[index % fallbackPositions.length];
  return {
    id: analysisObject.stable_id || object.id,
    dbId: object.id,
    english: object.english_label,
    cantonese: object.cantonese_label || "待翻譯",
    jyutping: object.jyutping || "",
    description: object.description_en || "",
    cantoneseDescription: localizedObject.cantonese_description || "",
    jyutpingDescription: localizedObject.jyutping_description || "",
    x: position.x,
    y: position.y,
  };
}

function cardPositionFromBbox(bbox) {
  if (!bbox) return null;
  const x = bbox.x == null || bbox.width == null ? null : Math.min(76, Math.max(6, bbox.x + bbox.width / 2));
  const y = bbox.y == null || bbox.height == null ? null : Math.min(78, Math.max(16, bbox.y));
  if (x == null || y == null) return null;
  return { x, y };
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

async function deleteSupabaseStorageObjects(bucket, paths) {
  const response = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: secretKey(),
      authorization: `Bearer ${secretKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase storage delete failed: ${response.status} ${errorText}`);
  }
}

async function createSignedStorageUrl(bucket, path, expiresIn) {
  const response = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: secretKey(),
      authorization: `Bearer ${secretKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase signed URL failed: ${response.status} ${errorText}`);
  }
  const json = await response.json();
  const signed = json.signedURL || json.signedUrl || "";
  if (!signed) throw new Error("Supabase signed URL response was empty");
  if (signed.startsWith("http")) return signed;
  const pathPrefix = signed.startsWith("/") ? signed : `/${signed}`;
  return `${env.SUPABASE_URL}/storage/v1${pathPrefix}`;
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

async function supabaseSelect(table, columns, query = "") {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}&${query}`, {
    headers: {
      apikey: secretKey(),
      authorization: `Bearer ${secretKey()}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase select ${table} failed: ${response.status} ${errorText}`);
  }
  return response.json();
}

async function logModelRun({
  provider,
  model,
  taskType,
  status,
  latencyMs,
  mediaBytes,
  usage = {},
  inputJson = null,
  outputJson = null,
  errorMessage = "",
}) {
  if (!env.SUPABASE_URL || !secretKey()) return;
  const cost = estimateModelCost(provider, model, usage);
  try {
    await supabaseInsert("model_runs", {
      provider,
      model_name: model,
      task_type: taskType,
      status,
      input_json: inputJson,
      output_json: outputJson,
      latency_ms: latencyMs ?? null,
      input_tokens: usage.inputTokens ?? null,
      output_tokens: usage.outputTokens ?? null,
      total_tokens: usage.totalTokens ?? null,
      media_bytes: mediaBytes ?? null,
      input_cost_usd: cost.inputCostUsd,
      output_cost_usd: cost.outputCostUsd,
      cost_estimate: cost.totalCostUsd,
      usage_json: usage.raw || usage,
      error_message: errorMessage || null,
    });
  } catch (error) {
    console.warn(`Cost logging failed: ${error.message || error}`);
  }
}

function usageFromOpenAi(usage = {}) {
  return {
    inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? null,
    outputTokens: usage.completion_tokens ?? usage.output_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
    raw: usage,
  };
}

function usageFromGemini(usage = {}) {
  return {
    inputTokens: usage.promptTokenCount ?? null,
    outputTokens: usage.candidatesTokenCount ?? null,
    totalTokens: usage.totalTokenCount ?? null,
    raw: usage,
  };
}

function usageFromCharacters(text) {
  const characters = Array.from(String(text || "")).length;
  return {
    inputTokens: null,
    outputTokens: null,
    totalTokens: characters,
    raw: { characters },
  };
}

function estimateModelCost(provider, model, usage = {}) {
  const pricing = pricingForModel(provider, model);
  const inputTokens = Number(usage.inputTokens || 0);
  const outputTokens = Number(usage.outputTokens || 0);
  const totalTokens = Number(usage.totalTokens || inputTokens + outputTokens || 0);
  const inputCostUsd = pricing.inputPer1M == null ? null : (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUsd = pricing.outputPer1M == null ? null : (outputTokens / 1_000_000) * pricing.outputPer1M;
  const totalCostUsd = inputCostUsd == null && outputCostUsd == null
    ? pricing.totalPer1M == null
      ? null
      : (totalTokens / 1_000_000) * pricing.totalPer1M
    : Number(inputCostUsd || 0) + Number(outputCostUsd || 0);
  return {
    inputCostUsd: roundMoney(inputCostUsd),
    outputCostUsd: roundMoney(outputCostUsd),
    totalCostUsd: roundMoney(totalCostUsd),
  };
}

function pricingForModel(provider, model) {
  const normalized = `${provider}:${model}`.toLowerCase();
  const overrides = parsePricingOverrides();
  if (overrides[normalized]) return overrides[normalized];
  if (normalized.includes("openai:gpt-4o-mini-tts")) return { totalPer1M: 0.6 };
  if (normalized.includes("openai:tts")) return { totalPer1M: 15 };
  if (normalized.includes("openai:gpt-5.4-mini")) return { inputPer1M: 1, outputPer1M: 8 };
  if (normalized.includes("openai:gpt-5")) return { inputPer1M: 1, outputPer1M: 8 };
  if (normalized.includes("google:gemini-3.5-flash")) return { inputPer1M: 0, outputPer1M: 0 };
  if (normalized.includes("google:gemini")) return { inputPer1M: 0, outputPer1M: 0 };
  return { inputPer1M: null, outputPer1M: null };
}

function parsePricingOverrides() {
  if (!env.AI_COST_PRICE_TABLE_JSON) return {};
  try {
    return JSON.parse(env.AI_COST_PRICE_TABLE_JSON);
  } catch {
    console.warn("AI_COST_PRICE_TABLE_JSON is not valid JSON. Using built-in price defaults.");
    return {};
  }
}

function summarizeCostRows(rows) {
  const byTask = {};
  let totalCostUsd = 0;
  let pricedRuns = 0;
  for (const row of rows) {
    const task = row.task_type || "unknown";
    const cost = Number(row.cost_estimate || 0);
    if (!byTask[task]) {
      byTask[task] = {
        taskType: task,
        runs: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        mediaBytes: 0,
        costUsd: 0,
      };
    }
    byTask[task].runs += 1;
    byTask[task].inputTokens += Number(row.input_tokens || 0);
    byTask[task].outputTokens += Number(row.output_tokens || 0);
    byTask[task].totalTokens += Number(row.total_tokens || 0);
    byTask[task].mediaBytes += Number(row.media_bytes || 0);
    byTask[task].costUsd += cost;
    if (row.cost_estimate != null) {
      totalCostUsd += cost;
      pricedRuns += 1;
    }
  }
  return {
    runs: rows.length,
    pricedRuns,
    totalCostUsd: roundMoney(totalCostUsd),
    byTask: Object.values(byTask).map((item) => ({
      ...item,
      costUsd: roundMoney(item.costUsd),
    })),
  };
}

function toClientCostRun(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    provider: row.provider,
    model: row.model_name,
    taskType: row.task_type || "unknown",
    status: row.status || "complete",
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    mediaBytes: row.media_bytes,
    latencyMs: row.latency_ms,
    inputCostUsd: row.input_cost_usd,
    outputCostUsd: row.output_cost_usd,
    costUsd: row.cost_estimate,
    errorMessage: row.error_message,
  };
}

function roundMoney(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
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

function supabaseAuthApiKey() {
  return env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || secretKey();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePercent(value) {
  const number = numberOrNull(value);
  if (number == null) return null;
  if (number >= 0 && number <= 1) return Math.round(number * 1000) / 10;
  return Math.min(100, Math.max(0, Math.round(number * 10) / 10));
}

function extensionFromMime(mimeType, mediaType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "video/quicktime") return ".mov";
  if (mimeType === "video/webm") return ".webm";
  return mediaType === "video" ? ".mp4" : ".jpg";
}

function safeStorageName(value) {
  return String(value || randomUUID())
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || randomUUID();
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
