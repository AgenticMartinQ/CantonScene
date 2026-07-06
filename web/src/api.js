export async function createScene({ type, mediaBlob, fileName, detailLevel, videoFrames = [], trialEmail = "", trialUserId = "" }) {
  const form = new FormData();
  form.append("scene_type", type);
  form.append("detail_level", String(detailLevel));
  if (trialEmail) form.append("trial_email", trialEmail);
  if (trialUserId) form.append("trial_user_id", trialUserId);
  form.append("media", mediaBlob, fileName || (type === "video" ? "scene.webm" : "scene.jpg"));
  videoFrames.forEach((frame, index) => {
    form.append("video_frame", frame.blob, frame.fileName || `frame-${index + 1}.jpg`);
  });

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

export async function generateSceneAudio(sceneId) {
  const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/audio`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Scene audio API failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getSignedMediaUrl(storagePath) {
  const response = await fetch(`/api/media-url?path=${encodeURIComponent(storagePath)}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Media URL API failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getCostDashboard() {
  const response = await fetch("/api/costs");

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cost API failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function requestEmailOtp(email) {
  const response = await fetch("/api/auth/request-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email verification failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function verifyEmailOtp(email, token) {
  const response = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email code verification failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getEmailFromAuthSession({ accessToken = "", tokenHash = "", type = "" }) {
  const response = await fetch("/api/auth/session-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accessToken, tokenHash, type }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email link verification failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export function cleanupTemporaryMedia(paths = []) {
  const storagePaths = [...new Set(paths.filter(Boolean))];
  if (!storagePaths.length) return true;
  const body = JSON.stringify({ storagePaths });
  if (navigator.sendBeacon) {
    return navigator.sendBeacon("/api/temporary-media/cleanup", new Blob([body], { type: "application/json" }));
  }
  fetch("/api/temporary-media/cleanup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
  return true;
}
