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

export default function ObjectCard({ object, language, selected, onSelect }) {
  return (
    <button
      className={`object-card ${selected ? "selected" : ""}`}
      style={{ left: `${object.x}%`, top: `${object.y}%`, zIndex: selected ? 12 : 1 }}
      onClick={() => onSelect(object.id)}
    >
      {cardContent(object, language)}
    </button>
  );
}
