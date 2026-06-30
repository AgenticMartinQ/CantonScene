import { useState } from "react";

export default function TrialIdentitySheet({ reason = "save", onSubmit, onClose }) {
  const [email, setEmail] = useState("");

  function submit(event) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
    onSubmit(normalized);
  }

  return (
    <section className="trial-sheet">
      <button className="sheet-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <small>Web trial</small>
      <h1>
        {reason === "camera" ? "Register to capture" : reason === "upload" ? "Register to upload" : "Save up to 3 scenes"}
      </h1>
      <p>
        {reason === "camera"
          ? "Enter your email once this session to use the camera shutter."
          : reason === "upload"
            ? "Enter your email once this session to analyze an uploaded photo or video."
          : "Enter your email to keep a small trial library in this browser."}
      </p>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit">Continue</button>
      </form>
    </section>
  );
}
