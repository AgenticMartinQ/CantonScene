export default function BottomNav({ active, onUpload, onCamera, onSaved }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <button onClick={onUpload}>Upload</button>
      <button className={active === "camera" ? "active" : ""} onClick={onCamera}>
        Camera
      </button>
      <button className={active === "saved" ? "active" : ""} onClick={onSaved}>
        Saved
      </button>
    </nav>
  );
}
