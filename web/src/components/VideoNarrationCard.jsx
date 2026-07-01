export default function VideoNarrationCard({ scene, score }) {
  if (!scene || scene.type !== "video" || scene.isPending) return null;

  return (
    <section className="video-narration-card" aria-label="Video narration">
      <small>{scene.analysisStatus === "failed" ? "Video analysis failed" : "Video scene narration"}</small>
      <p className="video-cantonese">{scene.cantoneseSummary || "粵語描述準備中。"}</p>
      {scene.jyutpingSummary ? <p className="video-jyutping">{scene.jyutpingSummary}</p> : null}
      <p className="video-english">{scene.englishSummary || "English narration is being prepared."}</p>
      {score?.targetType === "video_narration" ? (
        <div className="video-score-row">
          <strong>{score.score}/100 repeat score</strong>
          <span>
            Pronunciation {score.pronunciation}, tone {score.tone}, fluency {score.fluency}, completion {score.completion ?? "-"}.
          </span>
        </div>
      ) : null}
    </section>
  );
}
