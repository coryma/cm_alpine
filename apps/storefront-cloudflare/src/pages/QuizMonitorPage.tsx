import { useEffect, useMemo, useState } from "react";
import type { QuizMonitorPageContent, QuizSession } from "../../shared/contracts";
import { fetchQuizSessions } from "../lib/api";
import { getQuizIconUrl, QUIZ_STEP_COUNT } from "../lib/sportsPersonalityQuiz";
import "./QuizMonitorPage.css";

interface QuizMonitorPageProps {
  onNavigate: (href: string) => void;
  page: QuizMonitorPageContent;
}

const HASH_COLORS = ["#2563eb", "#0f766e", "#9333ea", "#ea580c", "#db2777", "#0f172a", "#14b8a6"];
const POLL_INTERVAL_MS = 4000;

export function QuizMonitorPage({ onNavigate, page }: QuizMonitorPageProps) {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    let pollTimer: number | undefined;

    async function load(showLoading: boolean) {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const payload = await fetchQuizSessions(50);
        if (!active) {
          return;
        }

        setSessions(payload);
        setErrorMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : page.loadErrorMessage
        );
      } finally {
        if (!active) {
          return;
        }

        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    void load(true);

    pollTimer = window.setInterval(() => {
      void load(false);
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
    };
  }, []);

    const rows = useMemo(() => {
    return [...sessions]
      .map((session) => normalizeSession(session, page))
      .sort((left, right) => right.sortTimestamp - left.sortTimestamp);
  }, [page, sessions]);

  const totalEventCount = rows.reduce((sum, session) => sum + session.icons.length, 0);

  return (
    <section className="quizMonitorPage">
      <header className="quizMonitorHeader">
        <div>
          <p className="quizMonitorHeader__eyebrow">{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>

        <div>
          <button
            className="quizMonitorRefresh"
            disabled={isLoading || isRefreshing}
            onClick={() => {
              setIsRefreshing(true);
              fetchQuizSessions(50)
                .then((payload) => {
                  setSessions(payload);
                  setErrorMessage("");
                })
                .catch((error) => {
                  setErrorMessage(
                    error instanceof Error ? error.message : page.loadErrorMessage
                  );
                })
                .finally(() => {
                  setIsRefreshing(false);
                });
            }}
            type="button"
          >
            {isRefreshing ? page.refreshBusyLabel : page.refreshIdleLabel}
          </button>
        </div>
      </header>

      <div className="quizMonitorSummary">
        <div className="quizMonitorSummaryCard">
          <strong>{totalEventCount}</strong>
          <span>{page.totalIconsLabel}</span>
        </div>
        <div className="quizMonitorSummaryCard">
          <strong>{rows.length}</strong>
          <span>{page.totalSessionsLabel}</span>
        </div>
        <div className="quizMonitorSummaryCard">
          <strong>{page.autoRefreshValue}</strong>
          <span>{page.autoRefreshLabel}</span>
        </div>
      </div>

      {errorMessage ? <div className="quizMonitorState quizMonitorState_error">{errorMessage}</div> : null}

      {isLoading ? <div className="quizMonitorState">{page.loadingLabel}</div> : null}

      {!isLoading && rows.length ? (
        <div className="quizMonitorList">
          {rows.map((session) => (
            <article className="quizMonitorSession" key={session.sessionKey}>
              <div className="quizMonitorSession__identity">
                <span
                  className="quizMonitorSession__avatar"
                  style={{ background: session.avatarColor }}
                >
                  {session.avatarText}
                </span>
                <div className="quizMonitorSession__copy">
                  <strong>{session.displayLabel}</strong>
                  <p>{session.statusText}</p>
                </div>
              </div>

              <div className="quizMonitorSession__icons">
                {session.icons.map((icon) => (
                  <span className="quizMonitorSession__icon" key={`${session.sessionKey}-${icon.stepNumber}`} title={icon.title}>
                    <img alt={icon.alt} loading="lazy" src={icon.url} />
                  </span>
                ))}
              </div>

              <div className="quizMonitorSession__meta">
                <span className="quizMonitorProgress">{session.progressLabel}</span>
                {session.bundleName ? <p>{session.bundleName}</p> : <p>{page.incompleteResultLabel}</p>}
                <button
                  className="quizTextButton"
                  onClick={() => onNavigate("/quiz")}
                  type="button"
                >
                  {page.backToQuizLabel}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && !rows.length ? (
        <div className="quizMonitorState">{page.emptyLabel}</div>
      ) : null}
    </section>
  );
}

function normalizeSession(session: QuizSession, page: QuizMonitorPageContent) {
  const displayLabel = normalizeString(session.displayLabel) || page.anonymousLabel;
  const completedStepLabel = page.completedStepFallbackLabel;
  const optionAltFallback = page.optionAltFallback;
  const icons = [...(session.steps || [])]
    .sort((left, right) => left.stepNumber - right.stepNumber)
    .map((step) => ({
      stepNumber: step.stepNumber,
      title: applyTemplate(page.stepTitleTemplate, {
        stepNumber: step.stepNumber,
        label:
          normalizeString(step.optionLabel) ||
          normalizeString(step.stepKey) ||
          completedStepLabel
      }),
      alt: normalizeString(step.optionLabel) || normalizeString(step.stepKey) || optionAltFallback,
      url: getQuizIconUrl(step.iconKey, step.optionLabel || displayLabel)
    }));

  return {
    ...session,
    displayLabel,
    avatarText: displayLabel.slice(0, 1).toUpperCase(),
    avatarColor: colorForText(displayLabel),
    statusText: session.isComplete
      ? page.completedSessionLabel
      : applyTemplate(page.sessionProgressTemplate, { count: icons.length }),
    progressLabel: `${icons.length} / ${QUIZ_STEP_COUNT}`,
    bundleName: normalizeString(session.bundleName),
    icons,
    sortTimestamp: session.lastEventAt ? new Date(session.lastEventAt).getTime() : 0
  };
}

function colorForText(value: string) {
  const text = normalizeString(value) || "quiz";
  const index =
    Array.from(text).reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    HASH_COLORS.length;
  return HASH_COLORS[index];
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function applyTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
