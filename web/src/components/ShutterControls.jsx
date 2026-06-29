export default function ShutterControls({
  recording,
  progressDegrees,
  onShutterDown,
  onShutterUp,
  onNative,
  onRepeat,
}) {
  return (
    <>
      <button className="shutter-action native-action" aria-label="Play native audio" onClick={onNative}>
        <b>▶</b>
        <span>Native</span>
      </button>
      <button
        className={`camera-shutter ${recording ? "recording" : ""}`}
        style={{ "--record-progress": `${progressDegrees}deg` }}
        aria-label="Tap for photo, hold for video"
        onPointerDown={onShutterDown}
        onPointerUp={onShutterUp}
        onPointerLeave={onShutterUp}
        onPointerCancel={onShutterUp}
      >
        <i />
      </button>
      <button className="shutter-action repeat-action" aria-label="Record repeat attempt" onClick={onRepeat}>
        <b>●</b>
        <span>Repeat</span>
      </button>
    </>
  );
}
