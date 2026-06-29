export async function createScene({ type, mediaBlob, fileName, detailLevel }) {
  const form = new FormData();
  form.append("scene_type", type);
  form.append("detail_level", String(detailLevel));
  form.append("media", mediaBlob, fileName || (type === "video" ? "scene.webm" : "scene.jpg"));

  const response = await fetch("/api/scenes", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Scene API failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
