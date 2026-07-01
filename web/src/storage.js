const emailKey = "cantonscene.trialEmail";
const temporaryVideoMediaKey = "cantonscene.temporaryVideoMedia";

function scenesKey(email) {
  return `cantonscene.savedScenes.${email.toLowerCase()}`;
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

export function loadSavedScenes(email = "") {
  if (!email) return [];
  try {
    const scenes = JSON.parse(localStorage.getItem(scenesKey(email)) || "[]");
    return Array.isArray(scenes)
      ? scenes.map((scene) => (scene?.previewUrl?.startsWith("blob:") ? { ...scene, previewUrl: "" } : scene))
      : [];
  } catch {
    return [];
  }
}

export function persistSavedScenes(email, scenes) {
  if (!email) return;
  const persistentScenes = scenes.slice(0, 3).map((scene) => (scene?.previewUrl?.startsWith("blob:") ? { ...scene, previewUrl: "" } : scene));
  localStorage.setItem(scenesKey(email), JSON.stringify(persistentScenes));
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
