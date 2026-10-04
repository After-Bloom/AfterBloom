// Thresholds for hosted (embedding) matching. Tuned against data/match-eval.json; keep in sync with the eval run.
export const MATCH = {
  /** cosine at or above which a hosted match is trusted without asking (never for RED, which always asks) */
  autoAbove: 0.74,
  /** the best hosted match must beat the runner-up by this much to auto-select */
  margin: 0.03,
  /** cosine at or above which a hosted match is offered under "Did you mean...?" */
  maybeAbove: 0.52,
  /** hosted score for the self-harm symptom at which the crisis screen is offered. Low on purpose: it only shows help numbers. */
  selfHarmAbove: 0.55,
  /** hosted result is dropped when the off-topic score is within this of the best symptom score */
  offTopicSlack: 0.02,
  maxMaybe: 4,
  timeoutMs: 4500,
  maxChars: 300,
};
