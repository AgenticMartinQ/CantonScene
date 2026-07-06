import { useEffect, useState } from "react";
import { getCostDashboard } from "../api.js";

function money(value) {
  if (value == null) return "n/a";
  if (Number(value) === 0) return "$0.000000";
  return `$${Number(value).toFixed(6)}`;
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function labelTask(taskType) {
  return String(taskType || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CostDashboard({ adminEmail = "", onClose }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCostDashboard({ adminEmail })
      .then((nextDashboard) => {
        if (!cancelled) setDashboard(nextDashboard);
      })
      .catch((nextError) => {
        if (!cancelled) setError(nextError.message || "Cost dashboard unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [adminEmail]);

  const summary = dashboard?.summary;
  const tasks = summary?.byTask || [];
  const recentRuns = dashboard?.recentRuns || [];

  return (
    <section className="cost-sheet" aria-label="AI cost dashboard">
      <button className="saved-close" aria-label="Close cost dashboard" onClick={onClose}>
        ×
      </button>
      <header>
        <div>
          <small>AI spend monitor</small>
          <strong>{summary ? money(summary.totalCostUsd) : "Loading..."}</strong>
          <em>{summary ? `${summary.runs} model runs tracked` : "Reading model usage"}</em>
        </div>
      </header>

      {error ? <p className="cost-error">{error}</p> : null}
      {dashboard?.migrationRequired ? (
        <p className="cost-error">Cost database migration is pending. Run {dashboard.migrationFile} in Supabase SQL Editor.</p>
      ) : null}

      {tasks.length ? (
        <div className="cost-grid">
          {tasks.map((task) => (
            <article className="cost-card" key={task.taskType}>
              <span>{labelTask(task.taskType)}</span>
              <b>{money(task.costUsd)}</b>
              <small>
                {number(task.inputTokens)} in · {number(task.outputTokens)} out
              </small>
            </article>
          ))}
        </div>
      ) : null}

      <div className="cost-runs">
        {recentRuns.slice(0, 10).map((run) => (
          <article className="cost-run" key={run.id}>
            <div>
              <b>{labelTask(run.taskType)}</b>
              <span>
                {run.provider} · {run.model}
              </span>
            </div>
            <div>
              <b>{money(run.costUsd)}</b>
              <span>
                {number(run.inputTokens)} / {number(run.outputTokens)} tokens
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
