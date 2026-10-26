import test from "node:test";
import assert from "node:assert/strict";
import { submitSurvey, SubmissionError } from "../js/submit.js";
import { buildPayload } from "../js/survey.js";
const payload = buildPayload([
  "Sehr wahrscheinlich",
  "Eher ja",
  "Eher nein",
  "Nein",
]);
const success = () =>
  new Response(JSON.stringify({ ok: true, next: "/thanks" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

test("POST sends only the requested anonymous fields as JSON; cookies omitted", async () => {
  let calls = 0;
  const result = await submitSurvey(payload, {
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://formspree.io/f/myeeepoe");
      assert.equal(options.method, "POST");
      assert.equal(options.credentials, "omit");
      assert.deepEqual(options.headers, {
        Accept: "application/json",
        "Content-Type": "application/json",
      });
      assert.deepEqual(JSON.parse(options.body), payload);
      assert.ok(options.signal instanceof AbortSignal);
      return success();
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, true);
});
for (const status of [400, 401, 403, 404, 422, 429, 500, 503]) {
  test(`HTTP ${status}: rejects without retries`, async () => {
    let calls = 0;
    await assert.rejects(
      submitSurvey(payload, {
        fetchImpl: async () => {
          calls++;
          return new Response('{"errors":[{"message":"error"}]}', { status });
        },
      }),
      (error) => error instanceof SubmissionError && error.kind === "server",
    );
    assert.equal(calls, 1);
  });
}
test("Network error preserves a helpful German error", async () => {
  await assert.rejects(
    submitSurvey(payload, {
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    }),
    (error) =>
      error.kind === "network" && /Antworten sind noch da/.test(error.message),
  );
});
for (const body of [
  "<!doctype html>Not JSON",
  "",
  "null",
  '{"ok":false}',
  '{"errors":[{"message":"rejected"}]}',
]) {
  test(`Unconfirmed response ${body.slice(0, 30)}: cannot become success`, async () => {
    await assert.rejects(
      submitSurvey(payload, {
        fetchImpl: async () => new Response(body, { status: 200 }),
      }),
      (error) => error.kind === "unconfirmed",
    );
  });
}
test("Timeout aborts the request and warns about uncertain delivery; no automatic retry", async () => {
  let calls = 0;
  await assert.rejects(
    submitSurvey(payload, {
      timeoutMs: 8,
      fetchImpl: async (_, { signal }) => {
        calls++;
        return new Promise((resolve, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          ),
        );
      },
    }),
    (error) =>
      error.kind === "timeout" && /schon übermittelt/.test(error.message),
  );
  assert.equal(calls, 1);
});
test("Slow request resolves only when the server confirms", async () => {
  let confirmed = false;
  let complete;
  const promise = submitSurvey(payload, {
    fetchImpl: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  }).then(() => {
    confirmed = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 12));
  assert.equal(confirmed, false);
  complete(success());
  await promise;
  assert.equal(confirmed, true);
});
