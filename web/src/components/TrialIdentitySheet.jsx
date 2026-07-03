import { useState } from "react";
import { requestEmailOtp, verifyEmailOtp } from "../api.js";

export default function TrialIdentitySheet({ reason = "save", bypassEmails = new Set(), onSubmit, onClose }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    setError("");

    if (step === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        setError("Enter a valid email address.");
        return;
      }
      if (bypassEmails.has(normalized)) {
        onSubmit(normalized);
        return;
      }
      setLoading(true);
      try {
        await requestEmailOtp(normalized);
        setEmail(normalized);
        setStep("code");
      } catch {
        setError("Could not send verification code. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const normalizedToken = token.trim().replace(/\s+/g, "");
    if (normalizedToken.length < 4) {
      setError("Enter the verification code from your email.");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyEmailOtp(normalized, normalizedToken);
      onSubmit({ email: result.email || normalized, userId: result.userId || "" });
    } catch {
      setError("That code did not work. Please check the email and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    const normalized = email.trim().toLowerCase();
    if (!normalized || loading) return;
    setError("");
    setLoading(true);
    try {
      await requestEmailOtp(normalized);
      setError("A new code has been sent.");
    } catch {
      setError("Could not resend the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const canBypassEmail = bypassEmails.has(normalizedEmail);

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
        {step === "code"
          ? `Enter the verification code sent to ${email}, or open the verification link in this browser.`
          : reason === "camera"
            ? "Verify your email once this session to use the camera shutter."
            : reason === "upload"
              ? "Verify your email once this session to analyze an uploaded photo or video."
              : "Verify your email to keep a small trial library in this browser."}
      </p>
      <form onSubmit={submit}>
        {step === "email" ? (
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            disabled={loading}
            onChange={(event) => setEmail(event.target.value)}
          />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            placeholder="Verification code"
            value={token}
            autoComplete="one-time-code"
            disabled={loading}
            onChange={(event) => setToken(event.target.value)}
          />
        )}
        {error ? <em className="trial-error">{error}</em> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : step === "email" ? (canBypassEmail ? "Continue" : "Send code") : "Verify"}
        </button>
        {step === "code" ? (
          <button className="trial-link-button" type="button" disabled={loading} onClick={resendCode}>
            Resend code
          </button>
        ) : null}
      </form>
    </section>
  );
}
