export default function RightRail({
  collapsed,
  showSlider,
  detailLevel,
  onToggleCollapsed,
  onToggleSlider,
  onDetailChange,
  onFavorite,
}) {
  return (
    <aside className={`right-rail ${collapsed ? "collapsed" : ""} ${showSlider ? "show-slider" : ""}`} aria-label="Scene tools">
      <button className="rail-handle" aria-label="Toggle scene tools" onClick={onToggleCollapsed} />
      <div className="rail-buttons">
        <button className="detail-button" aria-label="Tune detail" onClick={onToggleSlider}>
          ↕
        </button>
        <button className="favorite-button" aria-label="Save scene" onClick={onFavorite}>
          ♡
        </button>
        <button className="settings-button" aria-label="Settings">
          ⚙
        </button>
      </div>
      <div className="detail-slider" aria-label="Detail level">
        <span>More</span>
        <input type="range" min="1" max="5" value={detailLevel} onChange={(event) => onDetailChange(Number(event.target.value))} />
        <span>Less</span>
      </div>
    </aside>
  );
}
