export default function SceneSheet({ object, score, onClose }) {
  if (!object) return null;

  return (
    <section className="scene-sheet">
      <button className="sheet-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <h1>
        {object.english}
        <span>{object.description}</span>
      </h1>
      <p className="sheet-cantonese">{object.cantonese}</p>
      <p className="sheet-jyutping">{object.jyutping}</p>
      {score ? (
        <div className="score-row">
          <strong>{score.score}/100 read-after score</strong>
          <span>
            Pronunciation {score.pronunciation}, tone {score.tone}, fluency {score.fluency}.
          </span>
        </div>
      ) : null}
    </section>
  );
}
