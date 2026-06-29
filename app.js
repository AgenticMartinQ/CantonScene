const state = {
  stream: null,
  mediaRecorder: null,
  recordChunks: [],
  pressTimer: null,
  recordTimer: null,
  isRecordingVideo: false,
  repeatRecorder: null,
  repeatChunks: [],
  language: "both",
  detailLevel: 3,
  activeScene: null,
  selectedObjectId: null,
  savedScenes: loadSavedScenes(),
};

const els = {
  feed: document.querySelector(".camera-feed"),
  capturedMedia: document.querySelector(".captured-media"),
  capturedVideo: document.querySelector(".captured-video"),
  objectLayer: document.querySelector(".object-layer"),
  shutter: document.querySelector(".camera-shutter"),
  uploadInput: document.querySelector(".upload-input"),
  uploadNav: document.querySelector(".upload-nav"),
  cameraNav: document.querySelector(".camera-nav"),
  savedNav: document.querySelector(".saved-nav"),
  processing: document.querySelector(".processing-panel"),
  sceneSheet: document.querySelector(".scene-sheet"),
  savedSheet: document.querySelector(".saved-sheet"),
  savedList: document.querySelector(".saved-list"),
  toast: document.querySelector(".toast"),
  rail: document.querySelector(".right-rail"),
  detailButton: document.querySelector(".detail-button"),
  detailSlider: document.querySelector(".detail-slider input"),
  favoriteButton: document.querySelector(".favorite-button"),
  nativeButton: document.querySelector(".native-action"),
  repeatButton: document.querySelector(".repeat-action"),
  langButtons: [...document.querySelectorAll(".language-tabs button")],
};

const mockObjects = [
  {
    id: "fruit",
    english: "Fruit",
    cantonese: "生果",
    jyutping: "sang1 gwo2",
    x: 42,
    y: 41,
    selected: true,
    description: "A fruit display at a busy street stall.",
  },
  {
    id: "signboard",
    english: "Signboard",
    cantonese: "招牌",
    jyutping: "ziu1 paai4",
    x: 6,
    y: 28,
    description: "A shop sign above the market stall.",
  },
  {
    id: "person-buying",
    english: "Person buying fruit",
    cantonese: "買緊生果",
    jyutping: "maai5 gan2 sang1 gwo2",
    x: 8,
    y: 66,
    description: "A person is choosing or buying fruit.",
  },
];

init();

async function init() {
  bindEvents();
  renderObjects(mockObjects);
  setSelectedObject("fruit");
  await startCamera();
}

function bindEvents() {
  els.uploadNav.addEventListener("click", () => els.uploadInput.click());
  els.uploadInput.addEventListener("change", handleUpload);
  els.cameraNav.addEventListener("click", () => {
    hideSaved();
    showToast("Camera mode");
  });
  els.savedNav.addEventListener("click", showSaved);

  els.langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.lang;
      els.langButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderObjects(currentObjects());
      renderSelectedSheet();
    });
  });

  els.rail.addEventListener("click", (event) => {
    if (els.rail.classList.contains("collapsed")) {
      els.rail.classList.remove("collapsed");
      event.stopPropagation();
    }
  });
  document.querySelector(".rail-handle").addEventListener("click", (event) => {
    els.rail.classList.toggle("collapsed");
    els.rail.classList.remove("show-slider");
    event.stopPropagation();
  });
  els.detailButton.addEventListener("click", (event) => {
    els.rail.classList.toggle("show-slider");
    event.stopPropagation();
  });
  els.detailSlider.addEventListener("change", () => {
    state.detailLevel = Number(els.detailSlider.value);
    els.rail.classList.remove("show-slider");
    processCurrentScene("Regenerating scene detail...");
  });
  els.favoriteButton.addEventListener("click", saveActiveScene);

  els.nativeButton.addEventListener("click", playNative);
  els.repeatButton.addEventListener("click", recordRepeat);

  document.querySelector(".sheet-close").addEventListener("click", () => {
    els.sceneSheet.hidden = true;
  });
  document.querySelector(".saved-close").addEventListener("click", hideSaved);

  els.shutter.addEventListener("pointerdown", startShutterPress);
  els.shutter.addEventListener("pointerup", endShutterPress);
  els.shutter.addEventListener("pointerleave", endShutterPress);
  els.shutter.addEventListener("pointercancel", endShutterPress);
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Camera unavailable here. Upload still works.");
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: true,
    });
    els.feed.srcObject = state.stream;
    await els.feed.play();
  } catch {
    showToast("Camera permission needed. Upload still works.");
  }
}

function startShutterPress(event) {
  event.preventDefault();
  if (state.pressTimer || state.isRecordingVideo) return;
  state.pressTimer = window.setTimeout(() => startVideoRecording(), 420);
}

function endShutterPress() {
  if (state.isRecordingVideo) {
    stopVideoRecording();
    return;
  }
  if (state.pressTimer) {
    clearTimeout(state.pressTimer);
    state.pressTimer = null;
    takePhoto();
  }
}

function takePhoto() {
  const canvas = document.createElement("canvas");
  const width = els.feed.videoWidth || 1080;
  const height = els.feed.videoHeight || 1920;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (els.feed.videoWidth) {
    context.drawImage(els.feed, 0, 0, width, height);
  }
  const dataUrl = els.feed.videoWidth ? canvas.toDataURL("image/jpeg", 0.86) : "assets/hong-kong-camera-bg.png";
  showCapturedImage(dataUrl);
  createScene("photo", dataUrl);
}

function startVideoRecording() {
  state.pressTimer = null;
  if (!state.stream || !window.MediaRecorder) {
    showToast("Video recording unavailable. Try Upload.");
    return;
  }
  state.recordChunks = [];
  state.isRecordingVideo = true;
  els.shutter.classList.add("recording");
  state.mediaRecorder = new MediaRecorder(state.stream);
  state.mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) state.recordChunks.push(event.data);
  });
  state.mediaRecorder.addEventListener("stop", finishVideoRecording);
  state.mediaRecorder.start();

  const started = Date.now();
  state.recordTimer = window.setInterval(() => {
    const elapsed = Date.now() - started;
    const degrees = Math.min(360, (elapsed / 10000) * 360);
    els.shutter.style.setProperty("--record-progress", `${degrees}deg`);
    if (elapsed >= 10000) stopVideoRecording();
  }, 80);
}

function stopVideoRecording() {
  if (!state.isRecordingVideo) return;
  state.isRecordingVideo = false;
  els.shutter.classList.remove("recording");
  els.shutter.style.setProperty("--record-progress", "0deg");
  clearInterval(state.recordTimer);
  if (state.mediaRecorder?.state !== "inactive") state.mediaRecorder.stop();
}

function finishVideoRecording() {
  const blob = new Blob(state.recordChunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  showCapturedVideo(url);
  createScene("video", url);
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const type = file.type.startsWith("video") ? "video" : "photo";
  if (type === "video") showCapturedVideo(url);
  else showCapturedImage(url);
  createScene(type, url, file.name);
  event.target.value = "";
}

function showCapturedImage(url) {
  els.capturedVideo.classList.remove("visible");
  els.capturedMedia.src = url;
  els.capturedMedia.classList.add("visible");
}

function showCapturedVideo(url) {
  els.capturedMedia.classList.remove("visible");
  els.capturedVideo.src = url;
  els.capturedVideo.classList.add("visible");
}

function createScene(type, mediaUrl, fileName = "") {
  state.activeScene = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type,
    mediaUrl,
    fileName,
    createdAt: new Date().toISOString(),
    englishSummary: type === "video" ? "A person is buying fruit at a street stall." : "A busy Hong Kong street market with fruit and signboards.",
    cantoneseSummary: type === "video" ? "有個人喺街邊檔買緊生果。" : "呢度係一條好熱鬧嘅香港街市。",
    jyutpingSummary: type === "video" ? "jau5 go3 jan4 hai2 gaai1 bin1 dong3 maai5 gan2 sang1 gwo2." : "ni1 dou6 hai6 jat1 tiu4 hou2 jit6 naau6 ge3 hoeng1 gong2 gaai1 si5.",
    objects: mockObjects.slice(0, Math.max(1, Math.min(3, state.detailLevel))),
    attempts: [],
  };
  state.selectedObjectId = state.activeScene.objects[0]?.id;
  processCurrentScene();
}

function processCurrentScene(message = "Reading the scene...") {
  if (!state.activeScene) return;
  els.processing.querySelector("strong").textContent = message;
  els.processing.hidden = false;
  window.setTimeout(() => {
    els.processing.hidden = true;
    state.activeScene.objects = mockObjects.slice(0, Math.max(1, Math.min(3, state.detailLevel)));
    renderObjects(state.activeScene.objects);
    setSelectedObject(state.activeScene.objects[0]?.id || "fruit");
    showToast(state.activeScene.type === "video" ? "Video scene ready" : "Photo objects ready");
  }, 850);
}

function currentObjects() {
  return state.activeScene?.objects || mockObjects;
}

function renderObjects(objects) {
  els.objectLayer.innerHTML = "";
  objects.forEach((object) => {
    const card = document.createElement("button");
    card.className = "object-card";
    card.style.left = `${object.x}%`;
    card.style.top = `${object.y}%`;
    card.dataset.id = object.id;
    card.innerHTML = objectMarkup(object);
    card.addEventListener("click", () => setSelectedObject(object.id));
    els.objectLayer.appendChild(card);
  });
}

function objectMarkup(object) {
  if (state.language === "english") return `<b>${object.english}</b>`;
  if (state.language === "cantonese") return `<span>${object.cantonese}</span><small>${object.jyutping}</small>`;
  return `<b>${object.english}</b><span>${object.cantonese}</span><small>${object.jyutping}</small>`;
}

function setSelectedObject(id) {
  state.selectedObjectId = id;
  document.querySelectorAll(".object-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.id === id);
  });
  renderSelectedSheet();
}

function selectedObject() {
  return currentObjects().find((object) => object.id === state.selectedObjectId) || currentObjects()[0];
}

function renderSelectedSheet() {
  const object = selectedObject();
  if (!object) return;
  els.sceneSheet.hidden = false;
  els.sceneSheet.querySelector("h1").textContent = object.english;
  els.sceneSheet.querySelector(".sheet-cantonese").textContent = object.cantonese;
  els.sceneSheet.querySelector(".sheet-jyutping").textContent = object.jyutping;
  els.sceneSheet.querySelector(".sheet-english").textContent = object.description;
}

function playNative() {
  const object = selectedObject();
  if (!object) return;
  if (!window.speechSynthesis) {
    showToast("Native audio will use Cantonese TTS backend later.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(object.cantonese);
  utterance.lang = "zh-HK";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

async function recordRepeat() {
  if (state.repeatRecorder?.state === "recording") {
    state.repeatRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showToast("Recording unavailable in this browser.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.repeatChunks = [];
    state.repeatRecorder = new MediaRecorder(stream);
    state.repeatRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) state.repeatChunks.push(event.data);
    });
    state.repeatRecorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      scoreRepeatAttempt();
    });
    state.repeatRecorder.start();
    els.repeatButton.classList.add("recording");
    showToast("Recording repeat attempt...");
    window.setTimeout(() => {
      if (state.repeatRecorder?.state === "recording") state.repeatRecorder.stop();
    }, 3600);
  } catch {
    showToast("Microphone permission needed.");
  }
}

function scoreRepeatAttempt() {
  els.repeatButton.classList.remove("recording");
  const object = selectedObject();
  const base = 74 + Math.round(Math.random() * 18);
  const attempt = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    targetId: object.id,
    score: base,
    pronunciation: Math.max(60, base - 3),
    tone: Math.max(58, base - 7),
    fluency: Math.min(98, base + 2),
    createdAt: new Date().toISOString(),
  };
  if (state.activeScene) state.activeScene.attempts.push(attempt);
  const score = els.sceneSheet.querySelector(".score-row");
  score.hidden = false;
  score.querySelector("strong").textContent = `${attempt.score}/100 read-after score`;
  score.querySelector("span").textContent = `Pronunciation ${attempt.pronunciation}, tone ${attempt.tone}, fluency ${attempt.fluency}.`;
  showToast("Practice score added");
}

function saveActiveScene() {
  if (!state.activeScene) {
    showToast("Capture or upload a scene first.");
    return;
  }
  const exists = state.savedScenes.some((scene) => scene.id === state.activeScene.id);
  if (!exists) state.savedScenes.unshift(state.activeScene);
  persistSavedScenes();
  showToast("Saved for practice");
}

function showSaved() {
  renderSaved();
  els.savedSheet.hidden = false;
  els.savedNav.classList.add("active");
  els.cameraNav.classList.remove("active");
}

function hideSaved() {
  els.savedSheet.hidden = true;
  els.savedNav.classList.remove("active");
  els.cameraNav.classList.add("active");
}

function renderSaved() {
  if (!state.savedScenes.length) {
    els.savedList.innerHTML = `<div class="saved-item"><div></div><div><b>No saved scenes yet</b><span>Use the heart button after capturing a photo or video.</span></div></div>`;
    return;
  }
  els.savedList.innerHTML = "";
  state.savedScenes.forEach((scene) => {
    const item = document.createElement("button");
    item.className = "saved-item";
    const thumb = scene.type === "photo" ? `<img class="saved-thumb" src="${scene.mediaUrl}" alt="" />` : `<div class="saved-thumb"></div>`;
    item.innerHTML = `${thumb}<div><b>${scene.englishSummary}</b><span>${scene.cantoneseSummary}</span><small>${scene.objects.length} cards · ${scene.attempts.length} attempts</small></div>`;
    item.addEventListener("click", () => restoreScene(scene));
    els.savedList.appendChild(item);
  });
}

function restoreScene(scene) {
  state.activeScene = scene;
  state.selectedObjectId = scene.objects[0]?.id;
  if (scene.type === "photo") showCapturedImage(scene.mediaUrl);
  else showCapturedVideo(scene.mediaUrl);
  renderObjects(scene.objects);
  setSelectedObject(state.selectedObjectId);
  hideSaved();
}

function loadSavedScenes() {
  try {
    return JSON.parse(localStorage.getItem("cantonscene.savedScenes") || "[]");
  } catch {
    return [];
  }
}

function persistSavedScenes() {
  try {
    const serializable = state.savedScenes.slice(0, 20);
    localStorage.setItem("cantonscene.savedScenes", JSON.stringify(serializable));
  } catch {
    showToast("Saved in memory. Persistent storage is full.");
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}
