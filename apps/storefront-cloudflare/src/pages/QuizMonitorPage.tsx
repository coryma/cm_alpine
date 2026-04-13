import { useEffect, useMemo, useState } from "react";
import type { QuizSession } from "../../shared/contracts";
import { fetchQuizSessions } from "../lib/api";
import { getQuizIconUrl, QUIZ_STEP_COUNT } from "../lib/healthQuiz";
import "./QuizMonitorPage.css";

interface QuizMonitorPageProps {
  onNavigate: (href: string) => void;
}

const HASH_COLORS = ["#2563eb", "#0f766e", "#9333ea", "#ea580c", "#db2777", "#0f172a", "#14b8a6"];
const POLL_INTERVAL_MS = 4000;

export function QuizMonitorPage({ onNavigate }: QuizMonitorPageProps) {
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
          error instanceof Error ? error.message : "問卷進度暫時無法載入。"
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
      .map((session) => normalizeSession(session))
      .sort((left, right) => right.sortTimestamp - left.sortTimestamp);
  }, [sessions]);

  const totalEventCount = rows.reduce((sum, session) => sum + session.icons.length, 0);

  return (
    <section className="quizMonitorPage">
      <header className="quizMonitorHeader">
        <div>
          <p className="quizMonitorHeader__eyebrow">進度看板</p>
          <h2>即時問卷進度</h2>
          <p>這裡會持續整理最近的作答 session 與已完成步驟，方便查看目前的填答狀況。</p>
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
                    error instanceof Error ? error.message : "問卷進度暫時無法載入。"
                  );
                })
                .finally(() => {
                  setIsRefreshing(false);
                });
            }}
            type="button"
          >
            {isRefreshing ? "同步中..." : "重新整理"}
          </button>
        </div>
      </header>

      <div className="quizMonitorSummary">
        <div className="quizMonitorSummaryCard">
          <strong>{totalEventCount}</strong>
          <span>已累積 icon</span>
        </div>
        <div className="quizMonitorSummaryCard">
          <strong>{rows.length}</strong>
          <span>目前 session</span>
        </div>
        <div className="quizMonitorSummaryCard">
          <strong>每 4 秒</strong>
          <span>自動更新</span>
        </div>
      </div>

      {errorMessage ? <div className="quizMonitorState quizMonitorState_error">{errorMessage}</div> : null}

      {isLoading ? <div className="quizMonitorState">正在載入問卷進度...</div> : null}

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
                {session.bundleName ? <p>{session.bundleName}</p> : <p>尚未完成推薦結果</p>}
                <button
                  className="quizTextButton"
                  onClick={() => onNavigate("/quiz")}
                  type="button"
                >
                  回到測驗頁
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && !rows.length ? (
        <div className="quizMonitorState">
          目前還沒有收到問卷進度事件。等前台使用者完成第一個步驟後，這裡就會出現對應 icon。
        </div>
      ) : null}
    </section>
  );
}

function normalizeSession(session: QuizSession) {
  const displayLabel = normalizeString(session.displayLabel) || "匿名";
  const icons = [...(session.steps || [])]
    .sort((left, right) => left.stepNumber - right.stepNumber)
    .map((step) => ({
      stepNumber: step.stepNumber,
      title: `第 ${step.stepNumber} 步 · ${normalizeString(step.optionLabel) || normalizeString(step.stepKey) || "已完成"}`,
      alt: normalizeString(step.optionLabel) || normalizeString(step.stepKey) || "問卷選擇",
      url: getQuizIconUrl(step.iconKey, step.optionLabel || displayLabel)
    }));

  return {
    ...session,
    displayLabel,
    avatarText: displayLabel.slice(0, 1).toUpperCase(),
    avatarColor: colorForText(displayLabel),
    statusText: session.isComplete ? "已完成完整問卷" : `目前完成 ${icons.length} 個步驟`,
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
