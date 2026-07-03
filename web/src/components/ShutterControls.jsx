export default function ShutterControls({
  recording,
  progressDegrees,
  onShutterDown,
  onShutterUp,
  onNative,
  onRepeat,
  nativePlaying,
}) {
  function handlePointerDown(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onShutterDown(event);
  }

  function handlePointerUp(event) {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onShutterUp(event);
  }

  function handlePointerCancel(event) {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onShutterUp(event);
  }

  function preventBrowserGesture(event) {
    event.preventDefault();
  }

  return (
    <>
      <button className="shutter-action native-action" aria-label="Play native audio" onClick={onNative}>
        <b>{nativePlaying ? "||" : "▶"}</b>
        <span>Listen</span>
      </button>
      <button
        className={`camera-shutter ${recording ? "recording" : ""}`}
        style={{ "--record-progress": `${progressDegrees}deg` }}
        aria-label="Tap for photo, hold for video"
        draggable="false"
        onContextMenu={preventBrowserGesture}
        onDragStart={preventBrowserGesture}
        onSelect={preventBrowserGesture}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
