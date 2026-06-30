export default function SavedSheet({ scenes, trialEmail, saveLimit, onClose, onRestore }) {
  return (
    <section className="saved-sheet">
      <header>
        <div>
          <small>Web trial · {scenes.length}/{saveLimit} saved</small>
          <strong>Practice again</strong>
          <em>{trialEmail}</em>
        </div>
        <button className="saved-close" aria-label="Close saved scenes" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="saved-list">
        {scenes.length ? (
          scenes.map((scene) => (
            <button className="saved-item" key={scene.id} onClick={() => onRestore(scene)}>
              {scene.type === "photo" ? <img className="saved-thumb" src={scene.mediaUrl} alt="" /> : <div className="saved-thumb" />}
              <div>
                <b>{scene.englishSummary}</b>
                <span>{scene.cantoneseSummary || "Cantonese expression pending"}</span>
                <small>
                  {scene.objects.length} cards · {scene.attempts.length} attempts
                </small>
              </div>
            </button>
          ))
        ) : (
          <div className="saved-item">
            <div />
            <div>
              <b>No saved scenes yet</b>
              <span>Use the heart button after capturing a photo or video. Web trial storage is limited to 3 saved scenes.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
