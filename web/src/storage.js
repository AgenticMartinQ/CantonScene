const key = "cantonscene.savedScenes";

export function loadSavedScenes() {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function persistSavedScenes(scenes) {
  localStorage.setItem(key, JSON.stringify(scenes.slice(0, 20)));
}
