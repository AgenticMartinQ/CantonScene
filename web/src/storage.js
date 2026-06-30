const emailKey = "cantonscene.trialEmail";

function scenesKey(email) {
  return `cantonscene.savedScenes.${email.toLowerCase()}`;
}

function trialUsageKey(email) {
  return `cantonscene.trialUsage.${email.toLowerCase() || "session"}`;
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
    if (usage) return { recognitions: Number(usage.recognitions || 0) };

    const legacy = JSON.parse(localStorage.getItem(legacyCaptureCountsKey(email)) || '{"photo":0,"video":0}');
    return {
      recognitions: Number(legacy.photo || 0) + Number(legacy.video || 0),
    };
  } catch {
    return { recognitions: 0 };
  }
}

export function persistTrialUsage(email = "", usage) {
  localStorage.setItem(
    trialUsageKey(email),
    JSON.stringify({
      recognitions: Number(usage.recognitions || 0),
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
