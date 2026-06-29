export default function LanguageTabs({ language, onChange }) {
  return (
    <div className="language-tabs" aria-label="Language display">
      <button className={language === "english" ? "active" : ""} onClick={() => onChange("english")}>
        English
      </button>
      <button className={language === "cantonese" ? "active" : ""} onClick={() => onChange("cantonese")}>
        粵語
      </button>
      <button className={language === "both" ? "active" : ""} onClick={() => onChange("both")}>
        Both
      </button>
    </div>
  );
}
