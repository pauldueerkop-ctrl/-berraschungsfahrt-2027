import { FORM_ENDPOINT } from "./survey.js";

export class SubmissionError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "SubmissionError";
    this.kind = kind;
  }
}

/** A single explicit POST. No retries, analytics, or background transmission. */
export async function submitSurvey(
  payload,
  { fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "omit",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const message =
        response.status === 429
          ? "Gerade ist viel los. Deine Antworten sind noch da. Bitte versuch es in einer Minute erneut."
          : "Das Absenden hat nicht geklappt. Deine Antworten sind noch da. Bitte versuch es noch einmal.";
      throw new SubmissionError("server", message);
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new SubmissionError(
        "unconfirmed",
        "Es kam keine eindeutige Bestätigung an. Bitte prüfe deine Verbindung, bevor du es erneut versuchst.",
      );
    }
    if (
      !result ||
      typeof result !== "object" ||
      result.ok === false ||
      result.errors?.length
    ) {
      throw new SubmissionError(
        "unconfirmed",
        "Dein Stimmungsbild konnte nicht bestätigt werden. Bitte versuch es noch einmal.",
      );
    }
    return result;
  } catch (error) {
    if (error instanceof SubmissionError) throw error;
    if (controller.signal.aborted) {
      throw new SubmissionError(
        "timeout",
        "Noch keine Bestätigung angekommen. Deine Antworten könnten schon übermittelt sein. Prüfe bitte deine Verbindung, bevor du erneut abschickst.",
      );
    }
    throw new SubmissionError(
      "network",
      "Die Verbindung ist abgebrochen. Deine Antworten sind noch da. Bitte prüfe dein Internet und versuch es erneut.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
