const emailKey = "cantonscene.trialEmail";

function scenesKey(email) {
  return `cantonscene.savedScenes.${email.toLowerCase()}`;
}

export function loadTrialEmail() {
  return sessionStorage.getItem(emailKey) || "";
}

export function persistTrialEmail(email) {
  sessionStorage.setItem(emailKey, email.toLowerCase());
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
