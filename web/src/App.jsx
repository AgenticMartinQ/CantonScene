import { useEffect, useMemo, useRef, useState } from "react";
import { createScene } from "./api.js";
import { mockObjects } from "./mockData.js";
import {
  loadSavedScenes,
  loadTrialEmail,
  loadTrialUsage,
  persistSavedScenes,
  persistTrialEmail,
  persistTrialUsage,
} from "./storage.js";
import LanguageTabs from "./components/LanguageTabs.jsx";
import ObjectCard from "./components/ObjectCard.jsx";
import RightRail from "./components/RightRail.jsx";
import ShutterControls from "./components/ShutterControls.jsx";
import BottomNav from "./components/BottomNav.jsx";
import SceneSheet from "./components/SceneSheet.jsx";
import SavedSheet from "./components/SavedSheet.jsx";
import TrialIdentitySheet from "./components/TrialIdentitySheet.jsx";

const WEB_TRIAL_SAVE_LIMIT = 3;
const WEB_TRIAL_RECOGNITION_LIMIT = 3;
const TRIAL_LIMIT_MESSAGE = "This trial user has reached the camera trial limits.";

export default function App() {
  const feedRef = useRef(null);
  const uploadRef = useRef(null);
  const streamRef = useRef(null);
  const pendingUploadRef = useRef(null);
  const pressTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const repeatRecorderRef = useRef(null);

  const [language, setLanguage] = useState("both");
  const [detailLevel, setDetailLevel] = useState(3);
  const [activeScene, setActiveScene] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState("fruit");
  const [trialEmail, setTrialEmail] = useState(() => loadTrialEmail());
  const [savedScenes, setSavedScenes] = useState(() => loadSavedScenes(loadTrialEmail()));
  const [trialUsage, setTrialUsage] = useState(() => loadTrialUsage(loadTrialEmail()));
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);
  const [sceneSheetOpen, setSceneSheetOpen] = useState(true);
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [sliderOpen, setSliderOpen] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [currentMediaBlob, setCurrentMediaBlob] = useState(null);
  const [latestScore, setLatestScore] = useState(null);
  const [trialSheetOpen, setTrialSheetOpen] = useState(false);
  const [pendingIdentityAction, setPendingIdentityAction] = useState(null);

  const objects = activeScene?.objects?.length ? activeScene.objects : mockObjects;
  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) || objects[0],
    [objects, selectedObjectId],
  );

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    persistSavedScenes(trialEmail, savedScenes);
  }, [savedScenes, trialEmail]);

  useEffect(() => {
    persistTrialUsage(trialEmail, trialUsage);
  }, [trialUsage, trialEmail]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast("Camera unavailable here. Upload still works.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      feedRef.current.srcObject = stream;
      await feedRef.current.play();
    } catch {
      setToast("Camera permission needed. Upload still works.");
    }
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "photo";
    if (!trialEmail) {
      pendingUploadRef.current = { file, type, url, fileName: file.name };
      setPendingIdentityAction("upload");
      setTrialSheetOpen(true);
      event.target.value = "";
      return;
    }
    setCapturedMedia({ type, url });
    createSceneFromMedia(type, file, url, file.name);
    event.target.value = "";
  }

  function startShutterPress(event) {
    event.preventDefault();
    if (!trialEmail) {
      setPendingIdentityAction("camera");
      setTrialSheetOpen(true);
      return;
    }
    if (pressTimerRef.current || recordingVideo) return;
    pressTimerRef.current = window.setTimeout(() => startVideoRecording(), 420);
  }

  function endShutterPress() {
    if (recordingVideo) {
      stopVideoRecording();
      return;
    }
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      takePhoto();
    }
  }

  function takePhoto() {
    const video = feedRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!video.videoWidth) {
      const url = "/assets/hong-kong-camera-bg.png";
      setCapturedMedia({ type: "photo", url });
      createMockScene("photo", url);
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ type: "photo", url });
      createSceneFromMedia("photo", blob, url, "capture.jpg");
    }, "image/jpeg", 0.86);
  }

  function startVideoRecording() {
    pressTimerRef.current = null;
    const stream = streamRef.current;
    if (!stream || !window.MediaRecorder) {
      setToast("Video recording unavailable. Try Upload.");
      return;
    }
    recordChunksRef.current = [];
    setRecordingVideo(true);
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) recordChunksRef.current.push(event.data);
    });
    recorder.addEventListener("stop", finishVideoRecording);
    recorder.start();

    const started = Date.now();
    recordTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setRecordProgress(Math.min(360, (elapsed / 10000) * 360));
      if (elapsed >= 10000) stopVideoRecording();
    }, 80);
  }

  function stopVideoRecording() {
    setRecordingVideo(false);
    setRecordProgress(0);
    window.clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current.stop();
  }

  function finishVideoRecording() {
    const blob = new Blob(recordChunksRef.current, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    setCapturedMedia({ type: "video", url });
    createSceneFromMedia("video", blob, url, "capture.webm");
  }

  async function createSceneFromMedia(type, mediaBlob, mediaUrl, fileName = "", options = {}) {
    if (!canUseRecognition(options.usageOverride)) return;
    incrementRecognitionCount(options.usageOverride);
    setCurrentMediaBlob({ type, mediaBlob, mediaUrl, fileName });
    try {
      setProcessing(true);
      const scene = await createScene({ type, mediaBlob, fileName, detailLevel });
      const nextScene = { ...scene, mediaUrl, fileName, attempts: [] };
      setActiveScene(nextScene);
      setSelectedObjectId(nextScene.objects[0]?.id);
      setSceneSheetOpen(true);
      setLatestScore(null);
      setToast(type === "video" ? "Video scene ready" : "Photo objects ready");
    } catch (error) {
      console.warn(error);
      setToast("Backend unavailable. Using demo scene.");
      createMockScene(type, mediaUrl, fileName);
    } finally {
      setProcessing(false);
    }
  }

  function createMockScene(type, mediaUrl, fileName = "") {
    const scene = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type,
      mediaUrl,
      fileName,
      createdAt: new Date().toISOString(),
      englishSummary: type === "video" ? "A person is buying fruit at a street stall." : "A busy Hong Kong street market with fruit and signboards.",
      cantoneseSummary: type === "video" ? "有個人喺街邊檔買緊生果。" : "呢度係一條好熱鬧嘅香港街市。",
      jyutpingSummary: type === "video" ? "jau5 go3 jan4 hai2 gaai1 bin1 dong3 maai5 gan2 sang1 gwo2." : "ni1 dou6 hai6 jat1 tiu4 hou2 jit6 naau6 ge3 hoeng1 gong2 gaai1 si5.",
      objects: mockObjects.slice(0, Math.max(1, Math.min(3, detailLevel))),
      attempts: [],
    };
    setActiveScene(scene);
    setSelectedObjectId(scene.objects[0]?.id);
    setSceneSheetOpen(true);
    setLatestScore(null);
  }

  async function regenerateWithDetail(nextDetail) {
    setDetailLevel(nextDetail);
    if (!currentMediaBlob) {
      setActiveScene((scene) =>
        scene ? { ...scene, objects: mockObjects.slice(0, Math.max(1, Math.min(3, nextDetail))) } : scene,
      );
      setSliderOpen(false);
      return;
    }
    await createSceneFromMedia(
      currentMediaBlob.type,
      currentMediaBlob.mediaBlob,
      currentMediaBlob.mediaUrl,
      currentMediaBlob.fileName,
    );
    setSliderOpen(false);
  }

  function playNative() {
    if (!selectedObject) return;
    if (!window.speechSynthesis) {
      setToast("Native audio will use Cantonese TTS backend later.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selectedObject.cantonese);
    utterance.lang = "zh-HK";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  async function recordRepeat() {
    if (repeatRecorderRef.current?.state === "recording") {
      repeatRecorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setToast("Recording unavailable in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const recorder = new MediaRecorder(stream);
      repeatRecorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        scoreRepeatAttempt();
      });
      recorder.start();
      setToast("Recording repeat attempt...");
      window.setTimeout(() => {
        if (repeatRecorderRef.current?.state === "recording") repeatRecorderRef.current.stop();
      }, 3600);
    } catch {
      setToast("Microphone permission needed.");
    }
  }

  function scoreRepeatAttempt() {
    if (!selectedObject) return;
    const base = 74 + Math.round(Math.random() * 18);
    const attempt = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      targetId: selectedObject.id,
      score: base,
      pronunciation: Math.max(60, base - 3),
      tone: Math.max(58, base - 7),
      fluency: Math.min(98, base + 2),
      createdAt: new Date().toISOString(),
    };
    setLatestScore(attempt);
    setActiveScene((scene) => (scene ? { ...scene, attempts: [...scene.attempts, attempt] } : scene));
    setToast("Practice score added");
  }

  function saveActiveScene() {
    if (!activeScene) {
      setToast("Capture or upload a scene first.");
      return;
    }
    if (!trialEmail) {
      setPendingIdentityAction("favorite");
      setTrialSheetOpen(true);
      return;
    }
    if (savedScenes.some((scene) => scene.id === activeScene.id)) {
      setToast("Already saved");
      return;
    }
    if (savedScenes.length >= WEB_TRIAL_SAVE_LIMIT) {
      setToast(TRIAL_LIMIT_MESSAGE);
      return;
    }
    setSavedScenes((scenes) => {
      return [activeScene, ...scenes];
    });
    setToast("Saved for practice");
  }

  function setTrialIdentity(email) {
    persistTrialEmail(email);
    setTrialEmail(email);
    const scenesForEmail = loadSavedScenes(email);
    const usageForEmail = loadTrialUsage(email);
    setTrialUsage(usageForEmail);
    setTrialSheetOpen(false);
    if (pendingIdentityAction === "favorite" && activeScene) {
      if (scenesForEmail.some((scene) => scene.id === activeScene.id)) {
        setSavedScenes(scenesForEmail);
        setToast("Already saved");
      } else if (scenesForEmail.length >= WEB_TRIAL_SAVE_LIMIT) {
        setSavedScenes(scenesForEmail);
        setToast(TRIAL_LIMIT_MESSAGE);
      } else {
        setSavedScenes([activeScene, ...scenesForEmail]);
        setToast("Saved for practice");
      }
    } else {
      setSavedScenes(scenesForEmail);
      if ((pendingIdentityAction === "camera" || pendingIdentityAction === "upload") && Number(usageForEmail.recognitions || 0) >= WEB_TRIAL_RECOGNITION_LIMIT) {
        setToast(TRIAL_LIMIT_MESSAGE);
      } else if (pendingIdentityAction === "upload" && pendingUploadRef.current) {
        const pending = pendingUploadRef.current;
        pendingUploadRef.current = null;
        setCapturedMedia({ type: pending.type, url: pending.url });
        createSceneFromMedia(pending.type, pending.file, pending.url, pending.fileName, { usageOverride: usageForEmail });
      } else if (pendingIdentityAction === "camera") {
        setToast("Email saved. Tap or hold shutter again.");
      } else if (scenesForEmail.length >= WEB_TRIAL_SAVE_LIMIT) {
        setToast(TRIAL_LIMIT_MESSAGE);
      } else {
        setToast(`Trial library ready for ${email}`);
      }
    }
    setPendingIdentityAction(null);
  }

  function canUseRecognition(usageOverride = null) {
    const usage = usageOverride || trialUsage;
    const used = Number(usage.recognitions || 0);
    if (used >= WEB_TRIAL_RECOGNITION_LIMIT) {
      setToast(TRIAL_LIMIT_MESSAGE);
      return false;
    }
    return true;
  }

  function incrementRecognitionCount(usageOverride = null) {
    if (usageOverride) {
      setTrialUsage({
        recognitions: Number(usageOverride.recognitions || 0) + 1,
      });
      return;
    }

    setTrialUsage((usage) => ({
      recognitions: Number(usage.recognitions || 0) + 1,
    }));
  }

  function restoreScene(scene) {
    setActiveScene(scene);
    setCapturedMedia({ type: scene.type, url: scene.mediaUrl });
    setSelectedObjectId(scene.objects[0]?.id);
    setSavedOpen(false);
    setSceneSheetOpen(true);
    setLatestScore(null);
  }

  return (
    <main className="app-shell">
      <section className="phone-app" aria-label="CantonScene MVP">
        <video className="camera-feed" ref={feedRef} playsInline muted />
        {capturedMedia?.type === "photo" ? <img className="captured-media visible" src={capturedMedia.url} alt="" /> : null}
        {capturedMedia?.type === "video" ? <video className="captured-video visible" src={capturedMedia.url} playsInline controls /> : null}
        <div className="camera-fallback" />
        <div className="camera-scrim" />

        <header className="app-status">
          <span>9:41</span>
          <strong>CantonScene</strong>
          <span>5G</span>
        </header>

        <section className="top-card">
          <div>
            <small>Today’s focus</small>
            <strong>Street Cantonese</strong>
          </div>
          <button className="profile-button" aria-label="Profile">
            ◐
          </button>
        </section>

        <LanguageTabs language={language} onChange={setLanguage} />

        <section className="object-layer" aria-live="polite">
          {objects.map((object) => (
            <ObjectCard
              key={object.id}
              object={object}
              language={language}
              selected={object.id === selectedObjectId}
              onSelect={(id) => {
                setSelectedObjectId(id);
                setSceneSheetOpen(true);
                setLatestScore(null);
              }}
            />
          ))}
        </section>

        <RightRail
          collapsed={railCollapsed}
          showSlider={sliderOpen}
          detailLevel={detailLevel}
          onToggleCollapsed={() => {
            setRailCollapsed((value) => !value);
            setSliderOpen(false);
          }}
          onToggleSlider={() => setSliderOpen((value) => !value)}
          onDetailPreview={setDetailLevel}
          onDetailCommit={regenerateWithDetail}
          onFavorite={saveActiveScene}
        />

        <ShutterControls
          recording={recordingVideo}
          progressDegrees={recordProgress}
          onShutterDown={startShutterPress}
          onShutterUp={endShutterPress}
          onNative={playNative}
          onRepeat={recordRepeat}
        />

        <BottomNav
          active={savedOpen ? "saved" : "camera"}
          onUpload={() => uploadRef.current.click()}
          onCamera={() => {
            setSavedOpen(false);
            setToast("Camera mode");
          }}
          onSaved={() => {
            if (!trialEmail) {
              setPendingIdentityAction("saved");
              setTrialSheetOpen(true);
              return;
            }
            setSavedOpen(true);
          }}
        />

        <input ref={uploadRef} className="upload-input" type="file" accept="image/*,video/*" hidden onChange={handleUpload} />

        {processing ? (
          <section className="processing-panel">
            <div className="spinner" />
            <strong>Reading the scene...</strong>
            <span>Detecting objects and preparing English-first learning cards.</span>
          </section>
        ) : null}

        {sceneSheetOpen ? <SceneSheet object={selectedObject} score={latestScore} onClose={() => setSceneSheetOpen(false)} /> : null}

        {savedOpen ? (
          <SavedSheet
            scenes={savedScenes}
            trialEmail={trialEmail}
            saveLimit={WEB_TRIAL_SAVE_LIMIT}
            onClose={() => setSavedOpen(false)}
            onRestore={restoreScene}
          />
        ) : null}

        {trialSheetOpen ? (
          <TrialIdentitySheet
            reason={pendingIdentityAction === "camera" ? "camera" : pendingIdentityAction === "upload" ? "upload" : "save"}
            onSubmit={setTrialIdentity}
            onClose={() => {
              setTrialSheetOpen(false);
              setPendingIdentityAction(null);
            }}
          />
        ) : null}

        {toast ? <div className="toast">{toast}</div> : null}
      </section>
    </main>
  );
}
