import { useEffect, useMemo, useRef, useState } from "react";
import { cleanupTemporaryMedia, createScene, generateSceneAudio, getEmailFromAuthSession, getSignedMediaUrl } from "./api.js";
import { getDailyDemoScene } from "./mockData.js";
import {
  clearTemporaryVideoMedia,
  loadSavedScenes,
  loadTemporaryVideoMedia,
  loadTrialEmail,
  loadTrialUserId,
  loadTrialUsage,
  loadVocabularyItems,
  persistSavedScenes,
  persistTrialEmail,
  persistTrialUserId,
  persistTrialUsage,
  persistVocabularyItems,
  trackTemporaryVideoMedia,
  untrackTemporaryVideoMedia,
} from "./storage.js";
import LanguageTabs from "./components/LanguageTabs.jsx";
import ObjectCard from "./components/ObjectCard.jsx";
import RightRail from "./components/RightRail.jsx";
import ShutterControls from "./components/ShutterControls.jsx";
import BottomNav from "./components/BottomNav.jsx";
import SceneSheet from "./components/SceneSheet.jsx";
import VideoNarrationCard from "./components/VideoNarrationCard.jsx";
import SavedSheet from "./components/SavedSheet.jsx";
import TrialIdentitySheet from "./components/TrialIdentitySheet.jsx";
import CostDashboard from "./components/CostDashboard.jsx";
import VocabularySheet from "./components/VocabularySheet.jsx";

const WEB_TRIAL_SAVE_LIMIT = 3;
const WEB_TRIAL_MEDIA_LIMIT = 5;
const TRIAL_SAVE_LIMIT_MESSAGE = "Web trial can save up to 3 scenes. Please register on mobile Apps version to continue.";
const TRIAL_MEDIA_LIMIT_MESSAGE = "Web trial includes up to 5 photos and 5 videos. Please register on mobile Apps version to continue.";
const DEV_UNLIMITED_EMAILS = new Set(["martinqiao.ai@gmail.com"]);
const PHOTO_AI_MAX_EDGE = 1280;
const PHOTO_AI_JPEG_QUALITY = 0.78;
const VIDEO_FRAME_COUNT = 5;
const VIDEO_FRAME_MAX_EDGE = 448;
const VIDEO_FRAME_JPEG_QUALITY = 0.58;
const CAMERA_ZOOM_LEVELS = [0.5, 1, 4];
const processingCopy = {
  upload: {
    title: "Uploading...",
    photo: "Sending the photo for analysis.",
    video: "Sending the video clip and sampled frames.",
  },
  objects: {
    title: "Finding objects...",
    photo: "Looking for useful learning cards in the photo.",
    video: "Reading the key frames for the main scene.",
  },
  cantonese: {
    title: "Generating Cantonese pronunciations...",
    photo: "Creating natural Hong Kong Cantonese and Jyutping.",
    video: "Writing natural Cantonese narration and Jyutping.",
  },
  audio: {
    title: "Preparing audio...",
    photo: "Preparing the scene.",
    video: "Generating Cantonese narration audio.",
  },
};
const processingStageOrder = {
  photo: ["upload", "objects", "cantonese"],
  video: ["upload", "objects", "cantonese", "audio"],
};
const clockFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export default function App() {
  const phoneRef = useRef(null);
  const feedRef = useRef(null);
  const capturedImageRef = useRef(null);
  const uploadRef = useRef(null);
  const streamRef = useRef(null);
  const pendingUploadRef = useRef(null);
  const pendingVocabularyObjectRef = useRef(null);
  const pressTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordFrameTimerRef = useRef(null);
  const recordVideoFramesRef = useRef([]);
  const repeatRecorderRef = useRef(null);
  const repeatStartedAtRef = useRef(0);
  const nativeAudioRef = useRef(null);
  const nativeTargetRef = useRef("");
  const authReturnHandledRef = useRef(false);
  const processingTimersRef = useRef([]);

  const [language, setLanguage] = useState("both");
  const [statusTime, setStatusTime] = useState(() => clockFormatter.format(new Date()));
  const [detailLevel, setDetailLevel] = useState(3);
  const [dailyDemoScene, setDailyDemoScene] = useState(() => getDailyDemoScene());
  const [activeScene, setActiveScene] = useState(() => getDailyDemoScene());
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [trialEmail, setTrialEmail] = useState(() => loadTrialEmail());
  const [trialUserId, setTrialUserId] = useState(() => loadTrialUserId());
  const [savedScenes, setSavedScenes] = useState(() => loadSavedScenes(loadTrialEmail(), loadTrialUserId()));
  const [vocabularyItems, setVocabularyItems] = useState(() => loadVocabularyItems(loadTrialEmail(), loadTrialUserId()));
  const [trialUsage, setTrialUsage] = useState(() => loadTrialUsage(loadTrialEmail()));
  const [capturedMedia, setCapturedMedia] = useState(() => ({ type: "photo", url: getDailyDemoScene().mediaUrl, fit: "cover" }));
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("upload");
  const [toast, setToast] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [sceneSheetOpen, setSceneSheetOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [sliderOpen, setSliderOpen] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedZoom, setSelectedZoom] = useState(1);
  const [recordProgress, setRecordProgress] = useState(0);
  const [currentMediaBlob, setCurrentMediaBlob] = useState(null);
  const [latestScore, setLatestScore] = useState(null);
  const [nativePlaying, setNativePlaying] = useState(false);
  const [videoPreviewFailed, setVideoPreviewFailed] = useState(false);
  const [trialSheetOpen, setTrialSheetOpen] = useState(false);
  const [pendingIdentityAction, setPendingIdentityAction] = useState(null);
  const [photoFrame, setPhotoFrame] = useState(null);

  const cameraLive = cameraReady && !capturedMedia;
  const sourceObjects = activeScene?.isDemo
    ? dailyDemoScene.objects
    : activeScene?.isPending
      ? []
      : activeScene?.type === "video"
        ? []
        : activeScene?.objects || [];
  const objects = sourceObjects.slice(0, Math.min(sourceObjects.length, detailLevel));
  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) || null,
    [objects, selectedObjectId],
  );
  const displayObjects = useMemo(
    () => (cameraLive ? [] : objects.map((object) => mapObjectToPhotoFrame(object, capturedMedia, photoFrame))),
    [cameraLive, objects, capturedMedia, photoFrame],
  );
  const activeSceneSaved = Boolean(activeScene?.id && savedScenes.some((scene) => scene.id === activeScene.id));
  const adminUser = isDeveloperUnlimited(trialEmail);

  useEffect(() => {
    return () => {
      stopCameraStream({ updateState: false });
    };
  }, []);

  useEffect(() => {
    const updateAppViewportHeight = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-viewport-height", `${Math.round(viewportHeight)}px`);
    };
    updateAppViewportHeight();
    window.visualViewport?.addEventListener("resize", updateAppViewportHeight);
    window.visualViewport?.addEventListener("scroll", updateAppViewportHeight);
    window.addEventListener("resize", updateAppViewportHeight);
    window.addEventListener("orientationchange", updateAppViewportHeight);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateAppViewportHeight);
      window.visualViewport?.removeEventListener("scroll", updateAppViewportHeight);
      window.removeEventListener("resize", updateAppViewportHeight);
      window.removeEventListener("orientationchange", updateAppViewportHeight);
    };
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => refreshCameraDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, []);

  useEffect(() => {
    const updateStatusTime = () => setStatusTime(clockFormatter.format(new Date()));
    updateStatusTime();
    const timer = window.setInterval(updateStatusTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authReturnHandledRef.current) return;
    const authReturn = readSupabaseAuthReturn();
    if (!authReturn) return;
    authReturnHandledRef.current = true;
    let cancelled = false;

    async function completeEmailLinkSignIn() {
      try {
        const result = await getEmailFromAuthSession(authReturn);
        if (cancelled) return;
        setTrialIdentity(result);
        setToast(`Email verified for ${result.email}`);
      } catch (error) {
        console.warn(error);
        if (!cancelled) setToast("Email link could not be verified. Please request a new link.");
      } finally {
        if (!cancelled) clearSupabaseAuthReturn();
      }
    }

    completeEmailLinkSignIn();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDemoScene = getDailyDemoScene();
      if (nextDemoScene.id === dailyDemoScene.id) return;
      setDailyDemoScene(nextDemoScene);
      setActiveScene((scene) => {
        if (scene && !scene.isDemo) return scene;
        setCapturedMedia({ type: "photo", url: nextDemoScene.mediaUrl, fit: "cover" });
        setSelectedObjectId(null);
        setSceneSheetOpen(false);
        return nextDemoScene;
      });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [dailyDemoScene.id]);

  useEffect(() => {
    persistSavedScenes(trialEmail, savedScenes, trialUserId);
  }, [savedScenes, trialEmail, trialUserId]);

  useEffect(() => {
    persistVocabularyItems(trialEmail, vocabularyItems, trialUserId);
  }, [trialEmail, trialUserId, vocabularyItems]);

  useEffect(() => {
    persistTrialUsage(trialEmail, trialUsage);
  }, [trialUsage, trialEmail]);

  useEffect(() => {
    const cleanupUnsavedVideos = () => {
      const savedPaths = new Set(loadSavedScenes(loadTrialEmail(), loadTrialUserId()).map((scene) => scene.storagePath).filter(Boolean));
      const pathsToPurge = loadTemporaryVideoMedia()
        .map((item) => item.storagePath)
        .filter((path) => path && !savedPaths.has(path));
      if (!pathsToPurge.length) return;
      cleanupTemporaryMedia(pathsToPurge);
      clearTemporaryVideoMedia();
    };
    window.addEventListener("pagehide", cleanupUnsavedVideos);
    window.addEventListener("beforeunload", cleanupUnsavedVideos);
    return () => {
      window.removeEventListener("pagehide", cleanupUnsavedVideos);
      window.removeEventListener("beforeunload", cleanupUnsavedVideos);
    };
  }, []);

  useEffect(() => {
    if (!trialEmail || !savedScenes.some((scene) => shouldRepairMediaUrl(scene))) return;
    let cancelled = false;

    async function repairSavedMediaUrls() {
      const repairedScenes = await Promise.all(
        savedScenes.map(async (scene) => {
          if (!shouldRepairMediaUrl(scene)) return scene;
          try {
            const { mediaUrl } = await getSignedMediaUrl(scene.storagePath, { trialEmail, trialUserId });
            return { ...scene, mediaUrl };
          } catch (error) {
            console.warn(error);
            return scene;
          }
        }),
      );
      if (!cancelled) setSavedScenes(repairedScenes);
    }

    repairSavedMediaUrls();
    return () => {
      cancelled = true;
    };
  }, [savedScenes, trialEmail, trialUserId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    stopNativePlayback();
  }, [activeScene?.id, selectedObjectId]);

  useEffect(() => () => clearProcessingTimers(), []);

  useEffect(() => {
    updatePhotoFrame();
    window.addEventListener("resize", updatePhotoFrame);
    return () => window.removeEventListener("resize", updatePhotoFrame);
  }, [capturedMedia]);

  function updatePhotoFrame() {
    const img = capturedImageRef.current;
    const phone = phoneRef.current;
    if (!img || !phone || capturedMedia?.type !== "photo" || capturedMedia.fit !== "contain" || !img.naturalWidth || !img.naturalHeight) {
      setPhotoFrame(null);
      return;
    }

    const phoneRect = phone.getBoundingClientRect();
    const containerWidth = phoneRect.width;
    const containerHeight = phoneRect.height;
    const scale = Math.min(containerWidth / img.naturalWidth, containerHeight / img.naturalHeight);
    const renderedWidth = img.naturalWidth * scale;
    const renderedHeight = img.naturalHeight * scale;
    setPhotoFrame({
      left: ((containerWidth - renderedWidth) / 2 / containerWidth) * 100,
      top: ((containerHeight - renderedHeight) / 2 / containerHeight) * 100,
      width: (renderedWidth / containerWidth) * 100,
      height: (renderedHeight / containerHeight) * 100,
    });
  }

  function mapObjectToPhotoFrame(object, media, frame) {
    const mapped =
      media?.type !== "photo" || media.fit !== "contain" || !frame
        ? object
        : {
            ...object,
            x: frame.left + (Number(object.x || 0) / 100) * frame.width,
            y: frame.top + (Number(object.y || 0) / 100) * frame.height,
          };

    return clampObjectCardPosition(mapped);
  }

  function clampObjectCardPosition(object) {
    const y = clamp(Number(object.y || 0), 12, 74);
    const maxX = y >= 28 && y <= 64 ? 58 : 74;
    return {
      ...object,
      x: clamp(Number(object.x || 0), 24, maxX),
      y,
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clearSceneForProcessing(type, mediaUrl, fileName = "") {
    setActiveScene({
      id: `pending-${Date.now()}`,
      type,
      mediaUrl,
      fileName,
      isPending: true,
      objects: [],
      attempts: [],
    });
    setSelectedObjectId(null);
    setSceneSheetOpen(false);
    setLatestScore(null);
  }

  function shouldRepairMediaUrl(scene) {
    return Boolean(scene?.storagePath && (!scene.mediaUrl || scene.mediaUrl.startsWith("blob:")));
  }

  function profileStepsWithModels(profile, mediaType) {
    const models = profile.models || {};
    const modelForStep = {
      scene_understanding: mediaType === "video" ? models.video_understanding : models.photo_object_detection,
      gemini_scene_understanding: mediaType === "video" ? models.video_understanding : models.photo_object_detection,
      cantonese_localization_qa: models.cantonese_localization_qa || "",
      openai_tts_audio: `${models.cantonese_tts_scene || ""} / ${models.cantonese_tts_object || ""}`.trim(),
      defer_tts_audio: models.cantonese_tts_scene || "",
    };
    return (profile.steps || []).map((step) => ({
      ...step,
      model: modelForStep[step.name] || "",
    }));
  }

  function loadImageForResize(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Photo could not be resized"));
      };
      image.src = url;
    });
  }

  async function optimizePhotoForAI(file) {
    const image = await loadImageForResize(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, PHOTO_AI_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_AI_JPEG_QUALITY));
    if (!blob) return { blob: file, fileName: file.name, resized: false };

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return { blob, fileName: `${baseName}-ai.jpg`, resized: scale !== 1 || file.type !== "image/jpeg" };
  }

  function waitForMediaEvent(element, eventName, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error(`${eventName} timed out`));
      }, timeoutMs);
      function cleanup() {
        window.clearTimeout(timeout);
        element.removeEventListener(eventName, onEvent);
        element.removeEventListener("error", onError);
      }
      function onEvent() {
        cleanup();
        resolve();
      }
      function onError() {
        cleanup();
        reject(new Error("Video could not be read"));
      }
      element.addEventListener(eventName, onEvent, { once: true });
      element.addEventListener("error", onError, { once: true });
    });
  }

  async function seekVideo(video, time) {
    const seeked = waitForMediaEvent(video, "seeked", 5000);
    video.currentTime = time;
    await seeked;
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  async function sampleVideoFramesForAI(file) {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    try {
      await waitForMediaEvent(video, "loadedmetadata", 10000);
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(video.duration, 10) : 10;
      const frameCount = Math.max(4, Math.min(VIDEO_FRAME_COUNT, Math.ceil(duration)));
      const sourceWidth = video.videoWidth || 720;
      const sourceHeight = video.videoHeight || 1280;
      const scale = Math.min(1, VIDEO_FRAME_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      const frames = [];

      for (let index = 0; index < frameCount; index += 1) {
        const time = Math.min(duration - 0.05, Math.max(0, ((index + 0.5) / frameCount) * duration));
        await seekVideo(video, time);
        context.drawImage(video, 0, 0, width, height);
        const blob = await canvasToJpegBlob(canvas, VIDEO_FRAME_JPEG_QUALITY);
        if (blob) frames.push({ blob, fileName: `video-frame-${index + 1}.jpg` });
      }

      return frames;
    } finally {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }
  }

  function isHeicFile(file) {
    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    return type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
  }

  async function convertHeicToJpeg(file) {
    let blob;
    try {
      const { heicTo } = await import("heic-to");
      blob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.9,
      });
    } catch (primaryError) {
      console.warn("Primary HEIC conversion failed", primaryError);
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      blob = Array.isArray(converted) ? converted[0] : converted;
    }
    if (!blob) throw new Error("HEIC conversion failed");
    const baseName = file.name.replace(/\.[^.]+$/, "") || "iphone-photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  }

  async function refreshCameraDevices(activeStream = streamRef.current) {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput" && isBackCameraDevice(device));
      setCameraDevices(videoDevices);
      const activeDeviceId = activeStream?.getVideoTracks?.()[0]?.getSettings?.().deviceId || "";
      if (activeDeviceId) setSelectedCameraId(activeDeviceId);
    } catch (error) {
      console.warn(error);
    }
  }

  function isBackCameraDevice(device) {
    const label = String(device.label || "").toLowerCase();
    if (!label) return true;
    if (label.includes("front") || label.includes("user") || label.includes("facetime")) return false;
    return label.includes("back") || label.includes("rear") || label.includes("environment") || label.includes("wide") || label.includes("tele") || label.includes("camera");
  }

  function zoomLabel(level) {
    return level === 0.5 ? ".5" : level === 1 ? "1" : `${level}`;
  }

  function deviceScoreForZoom(device, zoomLevel) {
    const label = String(device.label || "").toLowerCase();
    if (zoomLevel === 0.5 && (label.includes("ultra") || label.includes("0.5") || label.includes("0,5"))) return 0;
    if (zoomLevel === 1 && label.includes("wide") && !label.includes("ultra")) return 0;
    if (zoomLevel >= 2 && (label.includes("tele") || label.includes(`${zoomLevel}x`) || label.includes(`${zoomLevel}×`))) return 0;
    if (label.includes("back") || label.includes("rear")) return 1;
    return 2;
  }

  function backCameraForZoom(zoomLevel) {
    if (!cameraDevices.length) return "";
    return [...cameraDevices].sort((a, b) => deviceScoreForZoom(a, zoomLevel) - deviceScoreForZoom(b, zoomLevel))[0]?.deviceId || "";
  }

  async function applyCameraZoom(zoomLevel) {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track?.getCapabilities || !track?.applyConstraints) return false;
    const capabilities = track.getCapabilities();
    if (!capabilities.zoom) return false;
    const min = Number(capabilities.zoom.min ?? 1);
    const max = Number(capabilities.zoom.max ?? zoomLevel);
    const zoom = Math.max(min, Math.min(max, zoomLevel));
    try {
      await track.applyConstraints({ advanced: [{ zoom }] });
      return true;
    } catch (error) {
      console.warn(error);
      return false;
    }
  }

  async function startCamera(deviceId = selectedCameraId, zoomLevel = selectedZoom) {
    if (cameraStarting) return false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast("Camera unavailable here. Upload still works.");
      return false;
    }

    setCameraStarting(true);
    try {
      stopCameraStream();
      const videoConstraints = {
        width: { ideal: 720 },
        height: { ideal: 1280 },
        frameRate: { ideal: 24, max: 30 },
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
      };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = stream;
      if (!feedRef.current) return false;
      feedRef.current.srcObject = stream;
      await feedRef.current.play();
      await refreshCameraDevices(stream);
      await applyCameraZoom(zoomLevel);
      const ready = Boolean(feedRef.current.videoWidth);
      setCameraReady(ready);
      if (ready) setCapturedMedia(null);
      return true;
    } catch (error) {
      if (deviceId) {
        console.warn(error);
        setSelectedCameraId("");
        setCameraStarting(false);
        return startCamera("", zoomLevel);
      }
      setCameraReady(false);
      setToast("Camera permission needed. Upload still works.");
      return false;
    } finally {
      setCameraStarting(false);
    }
  }

  function stopCameraStream({ updateState = true } = {}) {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (feedRef.current) {
      feedRef.current.pause();
      feedRef.current.srcObject = null;
      feedRef.current.removeAttribute("src");
      feedRef.current.load();
    }
    if (updateState) setCameraReady(false);
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith("video") ? "video" : "photo";
    let displayFile = file;
    let aiMediaBlob = file;
    let aiFileName = file.name;

    if (type === "photo") {
      setToast(isHeicFile(file) ? "Converting iPhone photo..." : "Optimizing photo for AI...");
      try {
        if (isHeicFile(file)) {
          displayFile = await convertHeicToJpeg(file);
        }
        const optimized = await optimizePhotoForAI(displayFile);
        aiMediaBlob = optimized.blob;
        aiFileName = optimized.fileName;
      } catch (error) {
        console.warn(error);
        setToast(isHeicFile(file) ? `HEIC conversion failed: ${error.message || "Try JPG export."}` : "Please upload JPG, PNG, or WebP.");
        event.target.value = "";
        return;
      }
    }

    const url = URL.createObjectURL(displayFile);

    if (!trialEmail) {
      pendingUploadRef.current = { file: aiMediaBlob, type, url, fileName: aiFileName };
      setPendingIdentityAction("upload");
      setToast("Enter email to analyze this upload.");
      setTrialSheetOpen(true);
      event.target.value = "";
      return;
    }
    setCapturedMedia({ type, url, fit: type === "photo" || type === "video" ? "contain" : "cover" });
    stopCameraStream();
    clearSceneForProcessing(type, url, aiFileName);
    setToast(type === "video" ? "Preparing video..." : "Preparing photo...");
    createSceneFromMedia(type, aiMediaBlob, url, aiFileName);
    event.target.value = "";
  }

  async function startShutterPress(event) {
    event.preventDefault();
    if (!trialEmail) {
      setPendingIdentityAction("camera");
      setTrialSheetOpen(true);
      return;
    }
    if (pressTimerRef.current || recordingVideo) return;
    if (!cameraLive) {
      setToast(cameraStarting ? "Camera starting..." : "Starting camera...");
      await startCamera();
      return;
    }
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
      if (!canUseMediaGeneration("photo")) return;
      takePhoto();
    }
  }

  function takePhoto() {
    const video = feedRef.current;
    if (!cameraLive || !isCameraReady()) {
      setToast("Camera readying. Tap shutter again after the live view appears.");
      startCamera();
      return;
    }
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        stopCameraStream();
        setToast("Photo capture failed. Please try again.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ type: "photo", url, fit: "contain" });
      stopCameraStream();
      clearSceneForProcessing("photo", url, "capture.jpg");
      createSceneFromMedia("photo", blob, url, "capture.jpg");
    }, "image/jpeg", 0.86);
  }

  async function changeCameraZoom(zoomLevel) {
    if (zoomLevel === selectedZoom && cameraLive) return;
    setSelectedZoom(zoomLevel);
    if (!cameraLive) return;
    setToast("Switching lens...");
    const zoomApplied = await applyCameraZoom(zoomLevel);
    const nextDeviceId = backCameraForZoom(zoomLevel) || selectedCameraId;
    if (!zoomApplied || (nextDeviceId && nextDeviceId !== selectedCameraId)) {
      setSelectedCameraId(nextDeviceId);
      await startCamera(nextDeviceId, zoomLevel);
    }
  }

  function startVideoRecording() {
    pressTimerRef.current = null;
    const stream = streamRef.current;
    if (!cameraLive || !isCameraReady()) {
      setToast("Camera readying. Hold shutter again after the live view appears.");
      startCamera();
      return;
    }
    if (!stream || !window.MediaRecorder) {
      setToast("Video recording unavailable. Try Upload.");
      return;
    }
    if (!canUseMediaGeneration("video")) return;
    recordChunksRef.current = [];
    recordVideoFramesRef.current = [];
    setRecordingVideo(true);
    const recorder = new MediaRecorder(stream, preferredVideoRecorderOptions());
    mediaRecorderRef.current = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) recordChunksRef.current.push(event.data);
    });
    recorder.addEventListener("stop", finishVideoRecording);
    recorder.start(250);
    captureRecordingFrame();
    recordFrameTimerRef.current = window.setInterval(captureRecordingFrame, 1100);

    const started = Date.now();
    recordTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setRecordProgress(Math.min(360, (elapsed / 10000) * 360));
      if (elapsed >= 10000) stopVideoRecording();
    }, 80);
  }

  function isCameraReady() {
    const video = feedRef.current;
    return Boolean(cameraReady && streamRef.current?.active && video?.srcObject && video.videoWidth && video.videoHeight);
  }

  function markCameraReady() {
    const video = feedRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return;
    setCameraReady(true);
  }

  function stopVideoRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecordingVideo(false);
    setRecordProgress(0);
    setToast("Finishing video...");
    window.clearInterval(recordTimerRef.current);
    window.clearInterval(recordFrameTimerRef.current);
    recorder.stop();
  }

  function finishVideoRecording() {
    window.clearInterval(recordFrameTimerRef.current);
    const mimeType = mediaRecorderRef.current?.mimeType || "video/webm";
    const blob = new Blob(recordChunksRef.current, { type: mimeType });
    if (!blob.size) {
      setToast("Video recording was empty. Please try again.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("quicktime") ? "mov" : "webm";
    const posterUrl = videoFramePosterUrl(recordVideoFramesRef.current);
    setVideoPreviewFailed(false);
    setCapturedMedia({ type: "video", url, fit: "contain", posterUrl });
    stopCameraStream();
    clearSceneForProcessing("video", url, `capture.${extension}`);
    createSceneFromMedia("video", blob, url, `capture.${extension}`, {
      videoFrames: recordVideoFramesRef.current,
      posterUrl,
    });
  }

  function preferredVideoRecorderOptions() {
    const candidates = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"];
    const mimeType = candidates.find((candidate) => window.MediaRecorder?.isTypeSupported?.(candidate));
    return {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 450_000,
    };
  }

  function videoFramePosterUrl(frames = []) {
    const frame = frames.find((item) => item?.blob);
    return frame ? URL.createObjectURL(frame.blob) : "";
  }

  async function captureRecordingFrame() {
    if (recordVideoFramesRef.current.length >= VIDEO_FRAME_COUNT) return;
    const frame = await captureVideoFrameFromFeed(`video-frame-${recordVideoFramesRef.current.length + 1}.jpg`);
    if (frame) recordVideoFramesRef.current = [...recordVideoFramesRef.current, frame];
  }

  function captureVideoFrameFromFeed(fileName) {
    const video = feedRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return Promise.resolve(null);
    const scale = Math.min(1, VIDEO_FRAME_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);
    return canvasToJpegBlob(canvas, VIDEO_FRAME_JPEG_QUALITY).then((blob) => (blob ? { blob, fileName } : null));
  }

  async function createSceneFromMedia(type, mediaBlob, mediaUrl, fileName = "", options = {}) {
    if (options.countUsage !== false) {
      if (!canUseMediaGeneration(type, options.usageOverride)) return;
      incrementMediaUsage(type, options.usageOverride);
    }
    await processSceneFromMedia(type, mediaBlob, mediaUrl, fileName, options);
  }

  async function processSceneFromMedia(type, mediaBlob, mediaUrl, fileName = "", options = {}) {
    let aiMediaBlob = mediaBlob;
    let aiFileName = fileName;
    let videoFrames = Array.isArray(options.videoFrames) ? options.videoFrames.filter(Boolean) : [];

    if (type === "photo" && !fileName.endsWith("-ai.jpg")) {
      try {
        const optimized = await optimizePhotoForAI(mediaBlob);
        aiMediaBlob = optimized.blob;
        aiFileName = optimized.fileName;
      } catch (error) {
        console.warn(error);
      }
    }

    if (type === "video" && !videoFrames.length) {
      try {
        setToast("Sampling video key frames...");
        videoFrames = await sampleVideoFramesForAI(mediaBlob);
      } catch (error) {
        console.warn(error);
        setToast("Video frames could not be sampled. Trying analysis anyway...");
      }
    }

    setCurrentMediaBlob({ type, mediaBlob: aiMediaBlob, mediaUrl, fileName: aiFileName });
    try {
      setProcessing(true);
      startProcessingStages(type);
      const identity = options.identityOverride || {};
      setToast("Uploading...");
      const scene = await createScene({
        type,
        mediaBlob: aiMediaBlob,
        fileName: aiFileName,
        detailLevel,
        videoFrames,
        trialEmail: identity.email || trialEmail,
        trialUserId: identity.userId || trialUserId,
      });
      if (scene.processingProfile) {
        console.table(profileStepsWithModels(scene.processingProfile, type));
        console.info("CantonScene processing profile", scene.processingProfile);
      }
      const posterUrl = options.posterUrl || "";
      const nextScene = { ...scene, mediaUrl: scene.mediaUrl || mediaUrl, fileName, previewUrl: mediaUrl, posterUrl, attempts: [] };
      setVideoPreviewFailed(false);
      setCapturedMedia({ type, url: mediaUrl, fit: type === "photo" || type === "video" ? "contain" : "cover", posterUrl });
      setCurrentMediaBlob({ type, mediaBlob: aiMediaBlob, mediaUrl, fileName: aiFileName });
      if (type === "video") trackTemporaryVideoMedia(nextScene);
      setActiveScene(nextScene);
      setSelectedObjectId(null);
      setSceneSheetOpen(false);
      setLatestScore(null);
      setToast(type === "video" ? "Video scene ready. Audio is preparing..." : "Photo objects ready");
      if (type === "video" && scene.audioStatus === "pending") {
        hydrateDeferredSceneAudio(scene.id);
      }
    } catch (error) {
      console.warn(error);
      if (type === "video") {
        setToast(isPayloadTooLargeError(error) ? "Video clip is too large. Try a shorter hold." : "Video analysis failed. Please try again.");
        createFailedVideoScene(mediaUrl, fileName);
      } else {
        setToast("Photo analysis failed. Please try again.");
        createMockScene(type, mediaUrl, fileName);
      }
    } finally {
      clearProcessingTimers();
      setProcessing(false);
    }
  }

  function clearProcessingTimers() {
    processingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    processingTimersRef.current = [];
  }

  function startProcessingStages(type) {
    clearProcessingTimers();
    setProcessingStage("upload");
    const stages = [
      [900, "objects"],
      [3800, "cantonese"],
    ];
    if (type === "video") stages.push([7000, "audio"]);
    processingTimersRef.current = stages.map(([delay, stage]) => window.setTimeout(() => setProcessingStage(stage), delay));
  }

  function processingStepsFor(type = "photo") {
    const stages = processingStageOrder[type === "video" ? "video" : "photo"];
    const activeIndex = Math.max(0, stages.indexOf(processingStage));
    return stages.map((stage, index) => ({
      id: stage,
      title: processingCopy[stage].title,
      state: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
    }));
  }

  async function hydrateDeferredSceneAudio(sceneId) {
    if (!sceneId) return;
    try {
      setToast("Preparing audio...");
      const audio = await generateSceneAudio(sceneId);
      setActiveScene((scene) => {
        if (!scene || scene.id !== sceneId) return scene;
        return {
          ...scene,
          cantoneseAudioUrl: audio.cantoneseAudioUrl || scene.cantoneseAudioUrl || "",
          audioStatus: audio.audioStatus || scene.audioStatus,
          audioError: audio.audioError || "",
        };
      });
      if (audio.cantoneseAudioUrl) setToast("Video narration audio ready");
    } catch (error) {
      console.warn(error);
      setActiveScene((scene) => (scene && scene.id === sceneId ? { ...scene, audioStatus: "failed", audioError: "Cantonese TTS generation failed." } : scene));
    }
  }

  function isPayloadTooLargeError(error) {
    return String(error?.message || error).includes("413");
  }

  function createFailedVideoScene(mediaUrl, fileName = "") {
    const scene = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: "video",
      mediaUrl,
      fileName,
      createdAt: new Date().toISOString(),
      englishSummary: "Video analysis failed. Please try uploading the clip again.",
      cantoneseSummary: "影片分析失敗，請再上載一次。",
      jyutpingSummary: "jing2 pin2 fan1 sik1 sat1 baai6, cing2 zoi3 soeng5 zoi3 jat1 ci3.",
      objects: [],
      attempts: [],
      analysisStatus: "failed",
    };
    setCapturedMedia({ type: "video", url: mediaUrl, fit: "contain" });
    setActiveScene(scene);
    setSelectedObjectId(null);
    setSceneSheetOpen(false);
    setLatestScore(null);
  }

  function createMockScene(type, mediaUrl, fileName = "") {
    const demoObjects = dailyDemoScene.objects.slice(0, Math.max(1, Math.min(dailyDemoScene.objects.length, detailLevel)));
    const scene = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type,
      mediaUrl,
      fileName,
      createdAt: new Date().toISOString(),
      englishSummary: type === "video" ? "A person is buying fruit at a street stall." : dailyDemoScene.englishSummary,
      cantoneseSummary: type === "video" ? "有個人喺街邊檔買緊生果。" : dailyDemoScene.cantoneseSummary,
      jyutpingSummary: type === "video" ? "jau5 go3 jan4 hai2 gaai1 bin1 dong3 maai5 gan2 sang1 gwo2." : dailyDemoScene.jyutpingSummary,
      objects: type === "photo" ? [] : demoObjects,
      attempts: [],
    };
    setCapturedMedia({ type, url: mediaUrl, fit: type === "photo" && fileName ? "contain" : "cover" });
    setActiveScene(scene);
    setSelectedObjectId(null);
    setSceneSheetOpen(false);
    setLatestScore(null);
  }

  async function regenerateWithDetail(nextDetail) {
    setDetailLevel(nextDetail);
    if (activeScene?.objects?.length >= nextDetail) {
      setSliderOpen(false);
      return;
    }
    if (!currentMediaBlob) {
      setActiveScene((scene) =>
        scene
          ? {
              ...scene,
              objects: (scene.isDemo ? dailyDemoScene.objects : scene.objects || []).slice(
                0,
                Math.max(
                  1,
                  Math.min(
                    (scene.isDemo ? dailyDemoScene.objects.length : scene.objects?.length) || 0,
                    nextDetail,
                  ),
                ),
              ),
            }
          : scene,
      );
      setSliderOpen(false);
      return;
    }
    await createSceneFromMedia(
      currentMediaBlob.type,
      currentMediaBlob.mediaBlob,
      currentMediaBlob.mediaUrl,
      currentMediaBlob.fileName,
      { countUsage: false },
    );
    setSliderOpen(false);
  }

  function loadSpeechVoices() {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        resolve(voices);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
      window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 900);
    });
  }

  function findCantoneseVoice(voices) {
    return voices.find((voice) => {
      const lang = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      return lang === "zh-hk" || lang.includes("yue") || name.includes("cantonese") || name.includes("hong kong");
    });
  }

  function stopNativePlayback() {
    if (nativeAudioRef.current) {
      nativeAudioRef.current.pause();
      nativeAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    nativeTargetRef.current = "";
    setNativePlaying(false);
  }

  async function playCantoneseAudio({ text = "", audioUrl = "", targetPrefix = "native", emptyMessage = "Choose a word first." } = {}) {
    const listenText = String(text || "");
    const targetKey = audioUrl ? `${targetPrefix}:audio:${audioUrl}` : `${targetPrefix}:speech:${listenText}`;

    if (!listenText && !audioUrl) {
      setToast(emptyMessage);
      return;
    }

    if (audioUrl) {
      window.speechSynthesis?.cancel();
      const currentAudio = nativeAudioRef.current;
      if (currentAudio && nativeTargetRef.current === targetKey) {
        if (currentAudio.paused) {
          try {
            await currentAudio.play();
            setNativePlaying(true);
          } catch {
            setToast("Tap again to play native audio.");
          }
        } else {
          currentAudio.pause();
          setNativePlaying(false);
        }
        return;
      }
      if (currentAudio) {
        currentAudio.pause();
      }
      const audio = new Audio(audioUrl);
      nativeAudioRef.current = audio;
      nativeTargetRef.current = targetKey;
      audio.addEventListener("ended", () => setNativePlaying(false), { once: true });
      audio.addEventListener("pause", () => {
        if (!audio.ended) setNativePlaying(false);
      });
      audio.addEventListener("play", () => setNativePlaying(true));
      try {
        await audio.play();
      } catch {
        setNativePlaying(false);
        setToast("Tap again to play native audio.");
      }
      return;
    }

    if (nativeTargetRef.current === targetKey && window.speechSynthesis?.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setNativePlaying(true);
      } else {
        window.speechSynthesis.pause();
        setNativePlaying(false);
      }
      return;
    }

    if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
        nativeAudioRef.current = null;
    }

    if (!window.speechSynthesis) {
      setToast("Native audio will use Cantonese TTS backend later.");
      return;
    }
    const voices = await loadSpeechVoices();
    const cantoneseVoice = findCantoneseVoice(voices);
    if (!cantoneseVoice) {
      setToast("Cantonese voice is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(listenText);
    nativeTargetRef.current = targetKey;
    utterance.voice = cantoneseVoice;
    utterance.lang = "zh-HK";
    utterance.rate = 0.82;
    utterance.onend = () => setNativePlaying(false);
    utterance.onerror = () => setNativePlaying(false);
    window.speechSynthesis.speak(utterance);
    setNativePlaying(true);
  }

  async function playNative() {
    const listenText = activeScene?.type === "video"
      ? activeScene?.cantoneseSummary
      : selectedObject?.cantonese || activeScene?.cantoneseSummary;
    const audioUrl = activeScene?.type === "video"
      ? activeScene?.cantoneseAudioUrl
      : selectedObject?.audioUrl || activeScene?.cantoneseAudioUrl;
    await playCantoneseAudio({
      text: listenText,
      audioUrl,
      targetPrefix: "native",
      emptyMessage: activeScene?.type === "video" ? "Narration audio is not ready yet." : "Choose an object first.",
    });
  }

  async function playDailyFocusName() {
    const text = dailyDemoScene.focusCantonese || dailyDemoScene.focus;
    if (!text) return;
    if (!window.speechSynthesis) {
      setToast("Cantonese voice is not available in this browser.");
      return;
    }
    const voices = await loadSpeechVoices();
    const cantoneseVoice = findCantoneseVoice(voices);
    if (!cantoneseVoice) {
      setToast("Cantonese voice is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = cantoneseVoice;
    utterance.lang = "zh-HK";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  async function recordRepeat() {
    if (repeatRecorderRef.current?.state === "recording") {
      repeatRecorderRef.current.stop();
      return;
    }
    if (activeScene?.type === "video" && !activeScene?.cantoneseSummary) {
      setToast("Narration is not ready yet.");
      return;
    }
    if (activeScene?.type !== "video" && !selectedObject) {
      setToast("Choose an object first.");
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
      recorder.addEventListener("stop", async () => {
        stream.getTracks().forEach((track) => track.stop());
        const recordingMs = Date.now() - repeatStartedAtRef.current;
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        await scoreRepeatAttempt({ recordingMs, audioBlob });
      });
      repeatStartedAtRef.current = Date.now();
      recorder.start();
      setToast(activeScene?.type === "video" ? "Reading narration..." : "Recording repeat attempt...");
      window.setTimeout(() => {
        if (repeatRecorderRef.current?.state === "recording") repeatRecorderRef.current.stop();
      }, activeScene?.type === "video" ? 9000 : 3600);
    } catch {
      setToast("Microphone permission needed.");
    }
  }

  async function scoreRepeatAttempt({ recordingMs = 0, audioBlob = null } = {}) {
    if (activeScene?.type === "video") {
      await scoreVideoNarrationAttempt({ recordingMs, audioBlob });
      return;
    }
    if (!selectedObject) return;
    const scoring = repeatScoreBreakdown(selectedObject.cantonese || selectedObject.english, recordingMs, { strictCompletion: false });
    const attempt = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      targetId: selectedObject.id,
      targetType: "object",
      score: scoring.score,
      pronunciation: scoring.pronunciation,
      tone: scoring.tone,
      fluency: scoring.fluency,
      completion: scoring.completion,
      createdAt: new Date().toISOString(),
    };
    setLatestScore(attempt);
    setActiveScene((scene) => (scene ? { ...scene, attempts: [...scene.attempts, attempt] } : scene));
    setToast("Practice score added");
  }

  async function scoreVideoNarrationAttempt({ recordingMs = 0, audioBlob = null } = {}) {
    const targetText = activeScene?.cantoneseSummary || "";
    if (!targetText) return;
    const scoring = repeatScoreBreakdown(targetText, recordingMs, { strictCompletion: true });
    const attempt = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      targetId: activeScene.id,
      targetType: "video_narration",
      reference: activeScene.cantoneseAudioUrl ? "generated_tts_narration" : "cantonese_text",
      recordingMs,
      recordingBytes: audioBlob?.size || 0,
      score: scoring.score,
      pronunciation: scoring.pronunciation,
      tone: scoring.tone,
      fluency: scoring.fluency,
      completion: scoring.completion,
      createdAt: new Date().toISOString(),
    };
    setLatestScore(attempt);
    setActiveScene((scene) => (scene ? { ...scene, attempts: [...(scene.attempts || []), attempt] } : scene));
    setToast("Narration repeat score added");
  }

  function repeatScoreBreakdown(targetText = "", recordingMs = 0, options = {}) {
    const length = Array.from(String(targetText || "").replace(/\s+/g, "")).length;
    const expectedMs = Math.max(options.strictCompletion ? 3600 : 1400, length * (options.strictCompletion ? 360 : 240));
    const completionRatio = recordingMs > 0 ? Math.min(1, recordingMs / expectedMs) : 0;
    const completion = Math.round(Math.max(0, Math.min(1, completionRatio)) * 100);
    const timingCloseness = recordingMs > 0 ? Math.min(recordingMs, expectedMs) / Math.max(recordingMs, expectedMs) : 0.55;
    const variance = Math.round(Math.random() * 5);
    let pronunciation = Math.round(64 + timingCloseness * 27 + variance);
    let tone = Math.round(60 + timingCloseness * 26 + variance);
    let fluency = Math.round(62 + timingCloseness * 30 + variance);

    if (options.strictCompletion && completion < 70) {
      pronunciation = Math.min(pronunciation, Math.max(42, completion + 18));
      tone = Math.min(tone, Math.max(40, completion + 12));
      fluency = Math.min(fluency, Math.max(38, completion + 8));
    }

    const score = Math.round(pronunciation * 0.24 + tone * 0.18 + fluency * 0.23 + completion * 0.35);
    const completionCap = options.strictCompletion && completion < 60 ? completion + 16 : 100;
    return {
      score: Math.max(35, Math.min(96, Math.min(score, completionCap))),
      pronunciation: Math.max(35, Math.min(98, pronunciation)),
      tone: Math.max(35, Math.min(98, tone)),
      fluency: Math.max(35, Math.min(98, fluency)),
      completion,
    };
  }

  function vocabularyIdForObject(object) {
    return [object?.english, object?.cantonese, object?.jyutping].map((value) => String(value || "").trim().toLowerCase()).join("|");
  }

  function vocabularyItemFromObject(object, scene = activeScene) {
    const sceneType = scene?.type === "video" ? "video" : "photo";
    return {
      id: vocabularyIdForObject(object),
      english: object?.english || "",
      cantonese: object?.cantonese || "",
      jyutping: object?.jyutping || "",
      audioUrl: object?.audioUrl || "",
      sourceType: sceneType,
      sourceLabel: scene?.isDemo ? "Today’s demo" : sceneType === "video" ? "Video" : "Photo",
      sourceSceneId: scene?.id || "",
      sourceObjectId: object?.id || "",
      createdAt: new Date().toISOString(),
    };
  }

  function objectSavedToVocabulary(object) {
    const vocabularyId = vocabularyIdForObject(object);
    return Boolean(vocabularyId && vocabularyItems.some((item) => item.id === vocabularyId));
  }

  function toggleObjectVocabulary(object, options = {}) {
    if (!object) return;
    if (!trialEmail && !trialUserId && !options.identityReady) {
      pendingVocabularyObjectRef.current = object;
      setPendingIdentityAction("vocabulary");
      setTrialSheetOpen(true);
      return;
    }

    const item = vocabularyItemFromObject(object);
    setVocabularyItems((items) => {
      if (items.some((existing) => existing.id === item.id)) {
        setToast("Removed from Vocabulary");
        return items.filter((existing) => existing.id !== item.id);
      }
      setToast("Added to Vocabulary");
      return [item, ...items];
    });
  }

  async function playVocabularyItem(item) {
    await playCantoneseAudio({
      text: item?.cantonese || item?.english || "",
      audioUrl: item?.audioUrl || "",
      targetPrefix: `vocabulary:${item?.id || ""}`,
      emptyMessage: "Vocabulary audio is not ready yet.",
    });
  }

  function practiceVocabularyItem(item) {
    const matchingObject = objects.find((object) => vocabularyIdForObject(object) === item.id || object.id === item.sourceObjectId);
    if (matchingObject) {
      setSelectedObjectId(matchingObject.id);
      setSceneSheetOpen(true);
      setVocabularyOpen(false);
      setLatestScore(null);
      setToast("Use Repeat to practice this word.");
      return;
    }
    setToast("Open the source scene to practice with Repeat.");
  }

  function deleteVocabularyItem(itemId) {
    setVocabularyItems((items) => items.filter((item) => item.id !== itemId));
    setToast("Removed from Vocabulary");
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
    const ownedScene = savedSceneForCurrentOwner(activeScene);
    if (savedScenes.some((scene) => scene.id === ownedScene.id)) {
      if (activeScene.type === "video") trackTemporaryVideoMedia(activeScene);
      setSavedScenes((scenes) => scenes.filter((scene) => scene.id !== activeScene.id));
      setToast("Removed from Saved");
      return;
    }
    if (!isDeveloperUnlimited() && savedScenes.length >= WEB_TRIAL_SAVE_LIMIT) {
      setToast(TRIAL_SAVE_LIMIT_MESSAGE);
      return;
    }
    setSavedScenes((scenes) => {
      return [ownedScene, ...scenes];
    });
    untrackTemporaryVideoMedia(activeScene);
    setToast("Saved for practice");
  }

  function setTrialIdentity(identity) {
    const email = typeof identity === "string" ? identity : identity?.email || "";
    const userId = typeof identity === "string" ? "" : identity?.userId || "";
    persistTrialEmail(email);
    persistTrialUserId(userId);
    setTrialEmail(email);
    setTrialUserId(userId);
    const scenesForEmail = loadSavedScenes(email, userId);
    const vocabularyForEmail = loadVocabularyItems(email, userId);
    const usageForEmail = loadTrialUsage(email);
    setTrialUsage(usageForEmail);
    setTrialSheetOpen(false);
    if (pendingIdentityAction === "favorite" && activeScene) {
      const ownedScene = savedSceneForOwner(activeScene, email, userId);
      if (scenesForEmail.some((scene) => scene.id === ownedScene.id)) {
        if (activeScene.type === "video") trackTemporaryVideoMedia(activeScene);
        setSavedScenes(scenesForEmail.filter((scene) => scene.id !== ownedScene.id));
        setToast("Removed from Saved");
      } else if (!isDeveloperUnlimited(email) && scenesForEmail.length >= WEB_TRIAL_SAVE_LIMIT) {
        setSavedScenes(scenesForEmail);
        setToast(TRIAL_SAVE_LIMIT_MESSAGE);
      } else {
        untrackTemporaryVideoMedia(activeScene);
        setSavedScenes([ownedScene, ...scenesForEmail]);
        setToast("Saved for practice");
      }
      setVocabularyItems(vocabularyForEmail);
    } else if (pendingIdentityAction === "vocabulary" && pendingVocabularyObjectRef.current) {
      const pendingVocabularyItem = vocabularyItemFromObject(pendingVocabularyObjectRef.current);
      pendingVocabularyObjectRef.current = null;
      setSavedScenes(scenesForEmail);
      if (vocabularyForEmail.some((item) => item.id === pendingVocabularyItem.id)) {
        setVocabularyItems(vocabularyForEmail.filter((item) => item.id !== pendingVocabularyItem.id));
        setToast("Removed from Vocabulary");
      } else {
        setVocabularyItems([pendingVocabularyItem, ...vocabularyForEmail]);
        setToast("Added to Vocabulary");
      }
    } else {
      setSavedScenes(scenesForEmail);
      setVocabularyItems(vocabularyForEmail);
      if (pendingIdentityAction === "camera" && isMediaLimitReached("photo", usageForEmail) && isMediaLimitReached("video", usageForEmail)) {
        setToast(TRIAL_MEDIA_LIMIT_MESSAGE);
      } else if (pendingIdentityAction === "upload" && pendingUploadRef.current) {
        const pending = pendingUploadRef.current;
        if (isMediaLimitReached(pending.type, usageForEmail)) {
          pendingUploadRef.current = null;
          setToast(TRIAL_MEDIA_LIMIT_MESSAGE);
        } else {
          pendingUploadRef.current = null;
          setCapturedMedia({ type: pending.type, url: pending.url, fit: pending.type === "photo" || pending.type === "video" ? "contain" : "cover" });
          clearSceneForProcessing(pending.type, pending.url, pending.fileName);
          setToast(pending.type === "video" ? "Preparing video..." : "Preparing photo...");
          createSceneFromMedia(pending.type, pending.file, pending.url, pending.fileName, { usageOverride: usageForEmail, identityOverride: { email, userId } });
        }
      } else if (pendingIdentityAction === "camera") {
        setToast("Email saved. Tap or hold shutter again.");
      } else if (!isDeveloperUnlimited(email) && scenesForEmail.length >= WEB_TRIAL_SAVE_LIMIT) {
        setToast(TRIAL_SAVE_LIMIT_MESSAGE);
      } else {
        setToast(`Trial library ready for ${email}`);
      }
    }
    setPendingIdentityAction(null);
  }

  function readSupabaseAuthReturn() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    const accessToken = hash.get("access_token") || search.get("access_token") || "";
    const tokenHash = search.get("token_hash") || hash.get("token_hash") || "";
    const type = search.get("type") || hash.get("type") || "";
    if (!accessToken && !tokenHash) return null;
    return { accessToken, tokenHash, type };
  }

  function clearSupabaseAuthReturn() {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  function isMediaLimitReached(type, usageOverride = null) {
    if (isDeveloperUnlimited()) return false;
    const usage = usageOverride || trialUsage;
    return Number(usage[type] || 0) >= WEB_TRIAL_MEDIA_LIMIT;
  }

  function isDeveloperUnlimited(email = trialEmail) {
    return DEV_UNLIMITED_EMAILS.has(String(email || "").trim().toLowerCase());
  }

  function canUseMediaGeneration(type, usageOverride = null) {
    if (isMediaLimitReached(type, usageOverride)) {
      setToast(TRIAL_MEDIA_LIMIT_MESSAGE);
      return false;
    }
    return true;
  }

  function incrementMediaUsage(type, usageOverride = null) {
    if (usageOverride) {
      setTrialUsage({
        ...usageOverride,
        [type]: Number(usageOverride[type] || 0) + 1,
      });
      return;
    }

    setTrialUsage((usage) => ({
      ...usage,
      [type]: Number(usage[type] || 0) + 1,
    }));
  }

  function savedSceneForCurrentOwner(scene) {
    return savedSceneForOwner(scene, trialEmail, trialUserId);
  }

  function savedSceneForOwner(scene, email = "", userId = "") {
    if (!scene || scene.isDemo || !scene.storagePath) return scene;
    return {
      ...scene,
      trialEmail: scene.trialEmail || String(email || "").trim().toLowerCase(),
      userId: scene.userId || userId || "",
    };
  }

  function restoreScene(scene) {
    stopCameraStream();
    setActiveScene(scene);
    const displayUrl = scene.previewUrl?.startsWith("blob:") ? scene.previewUrl : scene.mediaUrl;
    setVideoPreviewFailed(false);
    setCapturedMedia({ type: scene.type, url: displayUrl, fit: scene.type === "photo" || scene.type === "video" ? "contain" : "cover", posterUrl: scene.posterUrl || "" });
    setSelectedObjectId(null);
    setSavedOpen(false);
    setSceneSheetOpen(false);
    setLatestScore(null);
  }

  function restoreDailyDemoScene() {
    stopCameraStream();
    setActiveScene(dailyDemoScene);
    setCapturedMedia({ type: "photo", url: dailyDemoScene.mediaUrl, fit: "cover" });
    setSelectedObjectId(null);
    setSceneSheetOpen(false);
    setSavedOpen(false);
    setCostOpen(false);
    setVocabularyOpen(false);
    setSliderOpen(false);
    if (!processing) setCurrentMediaBlob(null);
    setLatestScore(null);
    setToast(processing ? "Today’s demo scene. Upload is still processing." : "Today’s demo scene");
  }

  function deleteSavedScene(sceneId) {
    const scene = savedScenes.find((item) => item.id === sceneId);
    if (scene?.type === "video") trackTemporaryVideoMedia(scene);
    setSavedScenes((scenes) => scenes.filter((scene) => scene.id !== sceneId));
    setToast("Deleted from Saved");
  }

  return (
    <main className="app-shell">
      <section
        className={`phone-app ${capturedMedia?.type === "video" ? "video-mode" : ""} ${cameraLive ? "camera-live" : ""}`}
        aria-label="CantonScene MVP"
        ref={phoneRef}
      >
        <video className="camera-feed" ref={feedRef} playsInline muted onLoadedMetadata={markCameraReady} onCanPlay={markCameraReady} />
        {capturedMedia?.type === "photo" && capturedMedia.fit === "contain" ? <img className="captured-media-backdrop" src={capturedMedia.url} alt="" /> : null}
        {capturedMedia?.type === "video" && capturedMedia.fit === "contain" ? (
          capturedMedia.posterUrl ? (
            <img className="captured-media-backdrop" src={capturedMedia.posterUrl} alt="" />
          ) : (
            <video className="captured-media-backdrop" src={capturedMedia.url} muted playsInline preload="metadata" />
          )
        ) : null}
        {capturedMedia?.type === "photo" ? (
          <img
            key={capturedMedia.url}
            className={`captured-media visible ${capturedMedia.fit === "contain" ? "fit-contain" : "fit-cover"}`}
            src={capturedMedia.url}
            alt=""
            ref={capturedImageRef}
            onLoad={updatePhotoFrame}
          />
        ) : null}
        {capturedMedia?.type === "video" ? (
          <>
            {capturedMedia.posterUrl && videoPreviewFailed ? (
              <img className={`captured-video-poster visible ${capturedMedia.fit === "contain" ? "fit-contain" : "fit-cover"}`} src={capturedMedia.posterUrl} alt="" />
            ) : null}
            <video
              className={`captured-video visible ${capturedMedia.fit === "contain" ? "fit-contain" : "fit-cover"} ${videoPreviewFailed ? "is-hidden" : ""}`}
              src={capturedMedia.url}
              poster={capturedMedia.posterUrl || undefined}
              playsInline
              controls
              preload="metadata"
              onError={() => setVideoPreviewFailed(true)}
              onLoadedData={() => setVideoPreviewFailed(false)}
            />
          </>
        ) : null}
        <div className="camera-fallback" />
        <div className="camera-scrim" />

        <header className="app-status">
          <span>{statusTime}</span>
          <strong>CantonScene</strong>
          <span>5G</span>
        </header>

        <section className="top-card">
          <div className="top-card-copy">
            <small>Scene of Today Selected For You to Learn</small>
            <strong>{dailyDemoScene.focusCantonese ? `${dailyDemoScene.focusCantonese} ${dailyDemoScene.focus}` : dailyDemoScene.focus}</strong>
          </div>
          <div className="top-card-actions">
            <button className="focus-audio-button" aria-label="Play today’s scene name" onClick={playDailyFocusName}>
              ▶
            </button>
            <button className="profile-button" aria-label="Back to today’s demo scene" onClick={restoreDailyDemoScene}>
              ⌂
            </button>
          </div>
        </section>

        {cameraLive ? (
          <div className="lens-picker" role="radiogroup" aria-label="Choose rear camera zoom">
            {CAMERA_ZOOM_LEVELS.map((zoomLevel) => {
              const active = zoomLevel === selectedZoom;
              return (
                <button
                  key={zoomLevel}
                  className={active ? "active" : ""}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Use ${zoomLabel(zoomLevel)} rear lens`}
                  onClick={() => changeCameraZoom(zoomLevel)}
                >
                  {zoomLabel(zoomLevel)}
                </button>
              );
            })}
          </div>
        ) : null}

        <LanguageTabs language={language} onChange={setLanguage} />

        <section className="object-layer" aria-live="polite">
          {displayObjects.map((object) => (
            <ObjectCard
              key={object.id}
              object={object}
              language={language}
              selected={object.id === selectedObjectId}
              vocabularySaved={objectSavedToVocabulary(object)}
              onSelect={(id) => {
                setSelectedObjectId(id);
                setSceneSheetOpen(true);
                setLatestScore(null);
              }}
              onToggleVocabulary={toggleObjectVocabulary}
            />
          ))}
        </section>

        <VideoNarrationCard scene={activeScene} score={latestScore} />

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
          favoriteActive={activeSceneSaved}
          onSettings={() => {
            stopCameraStream();
            setSavedOpen(false);
            if (adminUser) {
              setVocabularyOpen(false);
              setCostOpen(true);
            } else {
              if (!trialEmail && !trialUserId) {
                setPendingIdentityAction("vocabulary");
                setTrialSheetOpen(true);
                return;
              }
              setCostOpen(false);
              setVocabularyOpen(true);
            }
          }}
          settingsIcon={adminUser ? "⚙" : "字"}
          settingsLabel={adminUser ? "Open AI cost dashboard" : "Open vocabulary"}
        />

        <ShutterControls
          recording={recordingVideo}
          progressDegrees={recordProgress}
          onShutterDown={startShutterPress}
          onShutterUp={endShutterPress}
          onNative={playNative}
          onRepeat={recordRepeat}
          nativePlaying={nativePlaying}
        />

        <BottomNav
          active={savedOpen ? "saved" : "camera"}
          onUpload={() => {
            stopCameraStream();
            setSavedOpen(false);
            setCostOpen(false);
            setVocabularyOpen(false);
            setToast("Choose a photo or video.");
            uploadRef.current?.click();
          }}
          onCamera={async () => {
            setSavedOpen(false);
            setCostOpen(false);
            setVocabularyOpen(false);
            if (cameraLive) {
              setToast("Camera live view ready");
              return;
            }
            setToast(cameraStarting ? "Camera starting..." : "Starting camera...");
            await startCamera();
          }}
          onSaved={() => {
            stopCameraStream();
            if (!trialEmail) {
              setPendingIdentityAction("saved");
              setTrialSheetOpen(true);
              return;
            }
            setCostOpen(false);
            setVocabularyOpen(false);
            setSavedOpen(true);
          }}
        />

        <input ref={uploadRef} className="upload-input" type="file" accept="image/*,video/*" hidden onChange={handleUpload} />

        {processing ? (
          <section className="processing-panel">
            <div className="spinner" />
            <strong>{processingCopy[processingStage]?.title || processingCopy.upload.title}</strong>
            <span>
              {processingCopy[processingStage]?.[currentMediaBlob?.type || "photo"] || "Preparing the scene."}
            </span>
            <div className="processing-steps" aria-label="Processing steps">
              {processingStepsFor(currentMediaBlob?.type).map((step) => (
                <div className={`processing-step ${step.state}`} key={step.id}>
                  <i />
                  <b>{step.title}</b>
                </div>
              ))}
            </div>
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
            onDelete={deleteSavedScene}
          />
        ) : null}

        {costOpen ? <CostDashboard adminEmail={trialEmail} onClose={() => setCostOpen(false)} /> : null}

        {vocabularyOpen ? (
          <VocabularySheet
            items={vocabularyItems}
            trialEmail={trialEmail}
            onClose={() => setVocabularyOpen(false)}
            onPlay={playVocabularyItem}
            onPractice={practiceVocabularyItem}
            onDelete={deleteVocabularyItem}
          />
        ) : null}

        {trialSheetOpen ? (
          <TrialIdentitySheet
            reason={pendingIdentityAction === "camera" ? "camera" : pendingIdentityAction === "upload" ? "upload" : pendingIdentityAction === "vocabulary" ? "vocabulary" : "save"}
            bypassEmails={DEV_UNLIMITED_EMAILS}
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
