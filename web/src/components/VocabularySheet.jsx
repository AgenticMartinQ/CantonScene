import { useMemo, useState } from "react";

const filterLabels = {
  all: "All",
  photo: "Photos",
  video: "Videos",
  practiced: "Practiced",
};

function itemMatchesFilter(item, filter) {
  if (filter === "all") return true;
  if (filter === "practiced") return Boolean(item.practicedAt || item.latestScore);
  return item.sourceType === filter;
}

export default function VocabularySheet({ items, trialEmail, showAdminCost = false, onClose, onOpenCost, onPlay, onPractice, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!itemMatchesFilter(item, filter)) return false;
      if (!normalizedQuery) return true;
      return [item.english, item.cantonese, item.jyutping, item.sourceLabel].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });
  }, [filter, items, query]);

  return (
    <section className="vocabulary-sheet">
      <header>
        <div>
          <small>Practice bank</small>
          <strong>Vocabulary</strong>
          <em>{trialEmail}</em>
        </div>
        <div className="vocabulary-header-actions">
          {showAdminCost ? (
            <button className="vocabulary-admin-cost" onClick={onOpenCost}>
              AI cost
            </button>
          ) : null}
          <button className="saved-close" aria-label="Close vocabulary" onClick={onClose}>
            ×
          </button>
        </div>
      </header>

      <label className="vocabulary-search">
        <span>Search vocabulary</span>
        <input value={query} placeholder="English, Cantonese, Jyutping" onChange={(event) => setQuery(event.target.value)} />
      </label>

      <div className="saved-segment" aria-label="Vocabulary filters">
        {["all", "photo", "video", "practiced"].map((item) => (
          <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            {filterLabels[item]}
          </button>
        ))}
      </div>

      <div className="saved-count">
        {filteredItems.length} {filteredItems.length === 1 ? "word" : "words"} · {items.length}/100 saved
      </div>

      <div className="vocabulary-list">
        {filteredItems.length ? (
          filteredItems.map((item) => (
            <article className="vocabulary-card" key={item.id}>
              <div className="vocabulary-copy">
                <small>{item.sourceLabel || (item.sourceType === "video" ? "Video" : "Photo")}</small>
                <strong>{item.cantonese || item.english}</strong>
                <span>{item.english}</span>
                <em>{item.jyutping}</em>
                {item.latestScore ? <b>{item.latestScore} latest practice score</b> : null}
              </div>
              <div className="vocabulary-actions">
                <button aria-label={`Play ${item.english}`} onClick={() => onPlay(item)}>
                  ▶
                </button>
                <button aria-label={`Practice ${item.english}`} onClick={() => onPractice(item)}>
                  Repeat
                </button>
                <button aria-label={`Remove ${item.english}`} onClick={() => onDelete(item.id)}>
                  ×
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="saved-empty">
            <b>{items.length ? "No matching vocabulary" : "No vocabulary yet"}</b>
            <span>{items.length ? "Try another filter or search term." : "Tap + on an object card to build your word bank."}</span>
          </div>
        )}
      </div>
    </section>
  );
}
