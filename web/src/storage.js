const emailKey = "cantonscene.trialEmail";

function scenesKey(email) {
  return `cantonscene.savedScenes.${email.toLowerCase()}`;
}

function captureCountsKey(email) {
  return `cantonscene.captureCounts.${email.toLowerCase() || "session"}`;
}

export function loadTrialEmail() {
  return sessionStorage.getItem(emailKey) || "";
}

export function persistTrialEmail(email) {
  sessionStorage.setItem(emailKey, email.toLowerCase());
}

export function loadTrialCaptureCounts(email = "") {
  try {
    return JSON.parse(localStorage.getItem(captureCountsKey(email)) || '{"photo":0,"video":0}');
  } catch {
    return { photo: 0, video: 0 };
  }
}

export function persistTrialCaptureCounts(email = "", counts) {
  localStorage.setItem(
    captureCountsKey(email),
    JSON.stringify({
      photo: Number(counts.photo || 0),
      video: Number(counts.video || 0),
    }),
  );
}

export function loadSavedScenes(email = "") {
  if (!email) return [];
  try {
    return JSON.parse(localStorage.getItem(scenesKey(email)) || "[]");
  } catch {
    return [];
  }
}

export function persistSavedScenes(email, scenes) {
  if (!email) return;
  localStorage.setItem(scenesKey(email), JSON.stringify(scenes.slice(0, 3)));
}
