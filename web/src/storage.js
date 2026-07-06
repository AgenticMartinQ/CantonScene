const emailKey = "cantonscene.trialEmail";
const userIdKey = "cantonscene.trialUserId";
const temporaryVideoMediaKey = "cantonscene.temporaryVideoMedia";

function ownerKey(email = "", userId = "") {
  return String(userId || email || "").trim().toLowerCase();
}

function scenesKey(email = "", userId = "") {
  return `cantonscene.savedScenes.${ownerKey(email, userId)}`;
}

function trialUsageKey(email) {
  return `cantonscene.trialMediaUsage.${email.toLowerCase() || "session"}`;
}

function legacyCaptureCountsKey(email) {
  return `cantonscene.captureCounts.${email.toLowerCase() || "session"}`;
}

export function loadTrialEmail() {
  return sessionStorage.getItem(emailKey) || "";
}

export function persistTrialEmail(email) {
  sessionStorage.setItem(emailKey, email.toLowerCase());
}

export function loadTrialUserId() {
  return sessionStorage.getItem(userIdKey) || "";
}

export function persistTrialUserId(userId = "") {
  if (userId) {
    sessionStorage.setItem(userIdKey, userId);
  } else {
    sessionStorage.removeItem(userIdKey);
  }
}

export function loadTrialUsage(email = "") {
  try {
    const usage = JSON.parse(localStorage.getItem(trialUsageKey(email)) || "null");
    if (usage) {
      return {
        photo: Number(usage.photo || 0),
        video: Number(usage.video || 0),
      };
    }

    const legacy = JSON.parse(localStorage.getItem(legacyCaptureCountsKey(email)) || '{"photo":0,"video":0}');
    return {
      photo: Number(legacy.photo || 0),
      video: Number(legacy.video || 0),
    };
  } catch {
    return { photo: 0, video: 0 };
  }
}

export function persistTrialUsage(email = "", usage) {
  localStorage.setItem(
    trialUsageKey(email),
    JSON.stringify({
      photo: Number(usage.photo || 0),
      video: Number(usage.video || 0),
    }),
  );
}

function sceneBelongsToOwner(scene, email = "", userId = "") {
  if (!scene) return false;
  const ownerEmail = String(email || "").trim().toLowerCase();
  const ownerUserId = String(userId || "").trim();
  if (scene.isDemo || !scene.storagePath) return true;
  if (ownerUserId && scene.userId === ownerUserId) return true;
  if (ownerEmail && String(scene.trialEmail || "").trim().toLowerCase() === ownerEmail) return true;
  return false;
}

function normalizeSavedScene(scene, email = "", userId = "") {
  const normalized = scene?.previewUrl?.startsWith("blob:") ? { ...scene, previewUrl: "" } : scene;
  if (normalized?.storagePath) return { ...normalized, mediaUrl: "", previewUrl: "" };
  return normalized;
}

export function loadSavedScenes(email = "", userId = "") {
  if (!email && !userId) return [];
  try {
    const keys = [scenesKey(email, userId)];
    if (userId && email) keys.push(scenesKey(email, ""));
    const byId = new Map();
    for (const key of [...new Set(keys)]) {
      const scenes = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(scenes)) continue;
      for (const scene of scenes) {
        const normalized = normalizeSavedScene(scene, email, userId);
        if (sceneBelongsToOwner(normalized, email, userId)) byId.set(normalized.id, normalized);
      }
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}

export function persistSavedScenes(email, scenes, userId = "") {
  if (!email && !userId) return;
  const persistentScenes = scenes
    .filter((scene) => sceneBelongsToOwner(normalizeSavedScene(scene, email, userId), email, userId))
    .slice(0, 3)
    .map((scene) => normalizeSavedScene(scene, email, userId));
  localStorage.setItem(scenesKey(email, userId), JSON.stringify(persistentScenes));
}

export function loadTemporaryVideoMedia() {
  try {
    const items = JSON.parse(sessionStorage.getItem(temporaryVideoMediaKey) || "[]");
    return Array.isArray(items) ? items.filter((item) => item?.storagePath) : [];
  } catch {
    return [];
  }
}

export function trackTemporaryVideoMedia(scene) {
  if (!scene || scene.type !== "video" || !scene.storagePath) return;
  const items = loadTemporaryVideoMedia().filter((item) => item.storagePath !== scene.storagePath);
  items.push({
    sceneId: scene.id,
    storagePath: scene.storagePath,
    createdAt: new Date().toISOString(),
  });
  sessionStorage.setItem(temporaryVideoMediaKey, JSON.stringify(items));
}

export function untrackTemporaryVideoMedia(sceneOrStoragePath) {
  const storagePath = typeof sceneOrStoragePath === "string" ? sceneOrStoragePath : sceneOrStoragePath?.storagePath;
  if (!storagePath) return;
  const items = loadTemporaryVideoMedia().filter((item) => item.storagePath !== storagePath);
  sessionStorage.setItem(temporaryVideoMediaKey, JSON.stringify(items));
}

export function clearTemporaryVideoMedia() {
  sessionStorage.removeItem(temporaryVideoMediaKey);
}
