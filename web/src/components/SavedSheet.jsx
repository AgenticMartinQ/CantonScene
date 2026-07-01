export default function SavedSheet({ scenes, trialEmail, saveLimit, onClose, onRestore, onDelete }) {
  return (
    <section className="saved-sheet">
      <header>
        <div>
          <small>Library</small>
          <strong>Saved</strong>
          <em>{trialEmail}</em>
        </div>
        <button className="saved-close" aria-label="Close saved scenes" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="saved-segment" aria-label="Saved library filters">
        <button className="active">All</button>
        <button>Photos</button>
        <button>Videos</button>
      </div>
      <div className="saved-count">
        {scenes.length} {scenes.length === 1 ? "scene" : "scenes"} · {scenes.length}/{saveLimit} web trial saved
      </div>
      <div className="saved-grid">
        {scenes.length ? (
          scenes.map((scene) => (
            <button className="saved-tile" key={scene.id} onClick={() => onRestore(scene)}>
              {scene.type === "photo" ? <img className="saved-photo" src={scene.mediaUrl} alt="" /> : <video className="saved-photo" src={scene.mediaUrl} muted playsInline />}
              <span
                className="saved-delete"
                role="button"
                tabIndex={0}
                aria-label="Delete saved scene"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete(scene.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete(scene.id);
                }}
              >
                ×
              </span>
              <div className="saved-badge">{scene.type === "video" ? "▶" : `${scene.objects.length}`}</div>
              <div className="saved-overlay">
                <b>{scene.cantoneseSummary || scene.englishSummary || "Saved scene"}</b>
                <span>{scene.objects.length} cards · {scene.attempts.length} attempts</span>
              </div>
            </button>
          ))
        ) : (
          <div className="saved-empty">
            <b>No saved scenes yet</b>
            <span>Tap the heart after analyzing a photo or video.</span>
          </div>
        )}
      </div>
    </section>
  );
}
