function cardContent(object, language) {
  if (language === "english") return <b>{object.english}</b>;
  if (language === "cantonese") {
    return (
      <>
        <span>{object.cantonese}</span>
        <small>{object.jyutping}</small>
      </>
    );
  }
  return (
    <>
      <b>{object.english}</b>
      <span>{object.cantonese}</span>
      <small>{object.jyutping}</small>
    </>
  );
}

export default function ObjectCard({ object, language, selected, vocabularySaved, onSelect, onToggleVocabulary }) {
  return (
    <div
      className={`object-card ${selected ? "selected" : ""}`}
      style={{ left: `${object.x}%`, top: `${object.y}%`, zIndex: selected ? 12 : 1 }}
    >
      <button className="object-card-select" onClick={() => onSelect(object.id)}>
        {cardContent(object, language)}
      </button>
      <button
        className={`object-vocab-button ${vocabularySaved ? "saved" : ""}`}
        aria-label={vocabularySaved ? `Remove ${object.english} from vocabulary` : `Add ${object.english} to vocabulary`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleVocabulary(object);
        }}
      >
        {vocabularySaved ? "✓" : "+"}
      </button>
    </div>
  );
}
