export default function RightRail({
  collapsed,
  showSlider,
  detailLevel,
  onToggleCollapsed,
  onToggleSlider,
  onDetailPreview,
  onDetailCommit,
  onFavorite,
  favoriteActive,
  onSettings,
}) {
  function commitDetail(event) {
    onDetailCommit(Number(event.currentTarget.value));
  }

  function adjustDetail(delta) {
    const nextDetail = Math.max(1, Math.min(5, detailLevel + delta));
    onDetailPreview(nextDetail);
  }

  return (
    <aside className={`right-rail ${collapsed ? "collapsed" : ""} ${showSlider ? "show-slider" : ""}`} aria-label="Scene tools">
      <button className="rail-handle" aria-label="Toggle scene tools" onClick={onToggleCollapsed} />
      <div className="rail-buttons">
        <button className="detail-button" aria-label="Tune detail" onClick={onToggleSlider}>
          ↕
        </button>
        <button
          className={`favorite-button ${favoriteActive ? "active" : ""}`}
          aria-label={favoriteActive ? "Scene saved" : "Save scene"}
          style={favoriteActive ? { color: "var(--red)" } : undefined}
          onClick={onFavorite}
        >
          {favoriteActive ? "♥" : "♡"}
        </button>
        <button className="settings-button" aria-label="Settings" onClick={onSettings}>
          ⚙
        </button>
      </div>
      <div className="detail-slider" aria-label="Detail level">
        <button className="detail-step" aria-label="More detail" onClick={() => adjustDetail(1)}>
          +
        </button>
        <input
          type="range"
          min="1"
          max="5"
          value={detailLevel}
          onChange={(event) => onDetailPreview(Number(event.target.value))}
          onPointerUp={commitDetail}
          onTouchEnd={commitDetail}
          onKeyUp={commitDetail}
        />
        <button className="detail-step" aria-label="Less detail" onClick={() => adjustDetail(-1)}>
          -
        </button>
      </div>
    </aside>
  );
}
