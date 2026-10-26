/** Browser-native integration runner; usable without Node or an installed Playwright browser.
 * A fetch guard is injected BEFORE the application module in every isolated srcdoc frame.
 * It never falls through to native fetch, so no Formspree request can leave these tests.
 */
const rootURL = new URL("../../", import.meta.url).href;
const source = await fetch(new URL("index.html", rootURL)).then((r) =>
  r.text(),
);
const frame = document.querySelector("#test-frame");
const summary = document.querySelector("#summary");
const resultList = document.querySelector("#results");
const report = document.querySelector("#report");
const sizeSelect = document.querySelector("#preview-size");
const runButton = document.querySelector("#run");
const answers = ["Sehr wahrscheinlich", "Eher ja", "Eher nein", "Nein"];
const labels = ["Bis 100 €", "100–200 €", "200–300 €", "Über 300 €"];
const records = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const $ = (selector) => frame.contentDocument.querySelector(selector);
const $$ = (selector) => [...frame.contentDocument.querySelectorAll(selector)];
const assert = (value, text) => {
  if (!value) throw new Error(text);
};
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const equal = (actual, expected, text) =>
  assert(
    JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected)),
    `${text}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`,
  );
async function until(predicate, text, timeout = 4000) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeout)
      throw new Error(`Timeout: ${text}`);
    await wait(15);
  }
}
function guardScript(scenario, reduced) {
  return `
  window.__testNetwork = { scenario: ${JSON.stringify(scenario)}, calls: [], release: null };
  window.fetch = async (url, options = {}) => {
    const state = window.__testNetwork;
    state.calls.push({ url: String(url), method: options.method, payload: JSON.parse(options.body || 'null'), credentials: options.credentials });
    const ok = () => new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
    if (state.scenario === 'network') throw new TypeError('Simulated disconnected network');
    if (state.scenario === 'slow' || state.scenario === 'hang') return new Promise((resolve, reject) => {
      state.release = () => resolve(ok());
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')), {once:true});
    });
    if (state.scenario === 'invalid') return new Response('<html>not a confirmation</html>', {status:200});
    if (state.scenario.startsWith('http-')) return new Response('{"errors":[{"message":"simulated"}]}', {status:Number(state.scenario.slice(5))});
    return ok();
  };
  ${reduced ? `const realMatchMedia = window.matchMedia.bind(window); window.matchMedia = q => q === '(prefers-reduced-motion: reduce)' ? {matches:true,media:q,addEventListener(){},removeEventListener(){}} : realMatchMedia(q);` : ""}
  `;
}
async function load({
  width = 1440,
  height = 900,
  scenario = "success",
  reduced = false,
  subpath = false,
} = {}) {
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  const available =
    document.querySelector("#frame-wrap").clientWidth || innerWidth - 40;
  const scale = Math.min(1, available / width);
  frame.style.transform = `scale(${scale})`;
  frame.dataset.viewport = `${width}x${height}`;
  const base = subpath ? new URL("repo-test/", rootURL).href : rootURL;
  const html = source.replace(
    "<head>",
    `<head><base href="${base}"><script>${guardScript(scenario, reduced)}<\/script>`,
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Testframe did not load")),
      15000,
    );
    frame.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    frame.srcdoc = html;
  });
  await until(
    () => $("#experience")?.dataset.ready === "true",
    "app initialization",
  );
  await frame.contentDocument.fonts.ready;
  return frame.contentWindow.__testNetwork;
}
function pick(level, answer) {
  $(`.budget-stop[data-level="${level}"]`).click();
  if (answer !== undefined)
    $$('input[name="readiness"]')
      .find((r) => r.value === answer)
      .click();
}
function fill(values = answers) {
  values.forEach((answer, index) => pick(index, answer));
}
const submit = () => $("#budget-form").requestSubmit();
async function test(name, body) {
  const start = performance.now();
  let outcome = { name, status: "passed" };
  try {
    await body();
  } catch (error) {
    outcome = { name, status: "failed", error: error.message };
  }
  outcome.ms = Math.round(performance.now() - start);
  records.push(outcome);
  const row = document.createElement("li");
  row.className = outcome.status === "passed" ? "pass" : "fail";
  row.textContent = `${outcome.status === "passed" ? "✓" : "✗"} ${name}${outcome.error ? ": " + outcome.error : ""}`;
  resultList.append(row);
  const passed = records.filter((r) => r.status === "passed").length;
  summary.textContent = `${passed}/${records.length} erfolgreich · Testlauf läuft …`;
  report.value = JSON.stringify(
    {
      date: new Date().toISOString(),
      userAgent: navigator.userAgent,
      tests: records,
    },
    null,
    2,
  );
}

async function run() {
  runButton.disabled = true;
  sizeSelect.disabled = true;
  records.length = 0;
  resultList.replaceChildren();
  await test("Initial state: 4 budgets, 4 choices, no preselected answer or request", async () => {
    const network = await load();
    equal($$(".budget-stop").length, 4, "Budget count");
    equal($$('input[name="readiness"]').length, 4, "Answer count");
    equal($$("input:checked").length, 0, "No default answer");
    equal(network.calls.length, 0, "No request");
  });
  for (let level = 0; level < 4; level++) {
    for (const answer of answers) {
      await test(`Budget ${level + 1} / ${answer}: selection and retention`, async () => {
        const network = await load();
        pick(level, answer);
        [3, 0, 2, 1, level].forEach((index) => pick(index));
        equal($("input:checked")?.value, answer, "Retained answer");
        equal($("#budget-value").textContent, labels[level], "Label");
        equal(
          $("#answer-progress").textContent,
          "1 von 4 Budgets bewertet",
          "Progress",
        );
        equal(network.calls.length, 0, "No request on selection");
      });
    }
  }
  await test("160 arbitrary budget/answer changes remain independent", async () => {
    await load();
    const expected = Array(4).fill(null);
    let seed = 831;
    for (let i = 0; i < 160; i++) {
      seed = (seed * 16807) % 2147483647;
      const level = seed % 4;
      const answer = answers[Math.floor(seed / 4) % 4];
      pick(level, answer);
      expected[level] = answer;
      for (let visit = 0; visit < 4; visit++) {
        pick(visit);
        equal(
          $("input:checked")?.value || null,
          expected[visit],
          "Independent response",
        );
      }
    }
  });
  for (let mask = 0; mask < 15; mask++) {
    await test(`Incomplete pattern ${mask}: blocked POST and first missing budget focused`, async () => {
      const network = await load();
      for (let i = 0; i < 4; i++) if (mask & (1 << i)) pick(i, answers[i]);
      submit();
      const first = [0, 1, 2, 3].find((i) => !(mask & (1 << i)));
      equal($("#budget-slider").value, String(first), "First missing");
      equal(network.calls.length, 0, "No POST");
      assert(!$("#form-message").hidden, "Missing-answer notice visible");
      assert(
        frame.contentDocument.activeElement.name === "readiness",
        "Answer focus",
      );
    });
  }
  await test("Success: exact JSON payload, summary, focus and no navigation", async () => {
    const network = await load();
    fill();
    submit();
    await until(() => !$("#success-panel").hidden, "successful submission");
    equal(network.calls.length, 1, "Single request");
    equal(
      network.calls[0],
      {
        url: "https://formspree.io/f/myeeepoe",
        method: "POST",
        credentials: "omit",
        payload: {
          veranstaltung: "Überraschungsfahrt 2027",
          budget_bis_100: answers[0],
          budget_100_200: answers[1],
          budget_200_300: answers[2],
          budget_ueber_300: answers[3],
        },
      },
      "Exact request",
    );
    equal($$(".summary-line").length, 4, "Summary count");
    equal(
      frame.contentDocument.activeElement.id,
      "success-panel",
      "Success focus",
    );
    equal(frame.contentWindow.location.href, "about:srcdoc", "No redirect");
    for (let i = 0; i < 8; i++) submit();
    equal(network.calls.length, 1, "No repeat after success");
  });
  await test("Slow response: locked controls, hint, no premature success, double-submit guard", async () => {
    const network = await load({ scenario: "slow" });
    fill();
    for (let i = 0; i < 12; i++) submit();
    equal(network.calls.length, 1, "Only one in-flight POST");
    assert(
      $("#submit-button").disabled && $("#budget-slider").disabled,
      "Controls locked",
    );
    assert($("#success-panel").hidden, "No premature success");
    assert(!$(".spinner").hidden, "Spinner visible");
    await until(() => !$("#form-message").hidden, "Slow network hint", 7500);
    assert($("#form-message").textContent.includes("länger"), "Helpful hint");
    network.release();
    await until(
      () => !$("#success-panel").hidden,
      "Success after confirmation",
    );
  });
  await test("Network failure: error, preserved answers and successful manual retry", async () => {
    const network = await load({ scenario: "network" });
    fill();
    submit();
    await until(() => !$("#form-message").hidden, "Network error");
    assert(
      $("#form-message").textContent.includes("Verbindung"),
      "Readable error",
    );
    assert(
      !$("#submit-button").disabled && $("#success-panel").hidden,
      "Retry available",
    );
    equal(
      $("#answer-progress").textContent,
      "4 von 4 Budgets bewertet",
      "Answers preserved",
    );
    network.scenario = "success";
    submit();
    await until(() => !$("#success-panel").hidden, "Retry success");
    equal(network.calls.length, 2, "One explicit retry");
  });
  for (const status of [400, 403, 422, 429, 500, 503]) {
    await test(`Server HTTP ${status}: error without false success`, async () => {
      await load({ scenario: `http-${status}` });
      fill();
      submit();
      await until(() => !$("#form-message").hidden, "Server error");
      assert(
        $("#success-panel").hidden && !$("#submit-button").disabled,
        "Retryable error",
      );
      if (status === 429)
        assert(
          $("#form-message").textContent.includes("Minute"),
          "Rate-limit guidance",
        );
    });
  }
  await test("HTTP 200 with malformed response is not accepted as success", async () => {
    await load({ scenario: "invalid" });
    fill();
    submit();
    await until(() => !$("#form-message").hidden, "Unconfirmed error");
    assert($("#success-panel").hidden, "No false success");
  });
  await test("Real 20-second timeout: abort, preserved data, uncertain-delivery notice", async () => {
    const network = await load({ scenario: "hang" });
    fill();
    submit();
    await until(
      () => !$("#submit-button").disabled,
      "Timed-out request unlocks",
      22000,
    );
    assert(
      $("#form-message").textContent.includes("schon übermittelt"),
      "Uncertain delivery disclosed",
    );
    equal(network.calls.length, 1, "No automatic retry");
    assert($("#success-panel").hidden, "No false success");
  });
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [390, 844],
    [430, 932],
    [680, 900],
    [768, 1024],
    [820, 1180],
    [1024, 768],
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [2560, 1080],
  ]) {
    await test(`Viewport ${width}×${height}: overflow, control bounds and desktop height`, async () => {
      await load({ width, height });
      const doc = frame.contentDocument;
      for (const level of [0, 3]) {
        pick(level);
        assert(
          doc.documentElement.scrollWidth <= width + 1,
          `Horizontal overflow: ${doc.documentElement.scrollWidth}`,
        );
        for (const control of [
          ...$$(".budget-stop"),
          ...$$(".answer-content"),
          $("#submit-button"),
        ]) {
          const rect = control.getBoundingClientRect();
          assert(
            rect.left >= 0 && rect.right <= width + 1,
            `Control outside viewport: ${rect.left},${rect.right}`,
          );
          assert(rect.height >= 39, "Control target too small");
        }
      }
      if (width >= 1024 && height >= 768)
        assert(
          doc.documentElement.scrollHeight <= height + 1,
          `Desktop scroll height: ${doc.documentElement.scrollHeight}`,
        );
      $("#submit-button").scrollIntoView({ block: "center" });
      const rect = $("#submit-button").getBoundingClientRect();
      const hit = doc.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      assert(
        hit?.closest("#submit-button"),
        "Submit button is reachable, not covered",
      );
    });
  }
  await test("Camera transitions continuously and rapid changes settle at latest level", async () => {
    await load();
    const start = Number($("#world-svg").dataset.scale);
    pick(3);
    await wait(180);
    const middle = Number($("#world-svg").dataset.scale);
    assert(middle < start && middle > 0.96, "Intermediate camera transform");
    pick(2);
    pick(0);
    pick(1);
    pick(3);
    await until(
      () => $("#world-svg").dataset.scale === "0.9600",
      "Final camera scale",
      2500,
    );
    equal(
      $$(".vehicle").filter((x) => x.style.display !== "none").length,
      8,
      "Eight active routes",
    );
  });
  await test("Animation pause and resume controls moving vehicles", async () => {
    await load();
    $("#motion-toggle").click();
    const old = $('[data-route="woodland"]').getAttribute("transform");
    await wait(180);
    equal(
      $('[data-route="woodland"]').getAttribute("transform"),
      old,
      "Paused position",
    );
    $("#motion-toggle").click();
    await wait(180);
    assert(
      $('[data-route="woodland"]').getAttribute("transform") !== old,
      "Motion resumed",
    );
  });
  await test("Reduced-motion JS policy: immediate camera and paused vehicles", async () => {
    await load({ reduced: true });
    pick(3);
    equal($("#world-svg").dataset.scale, "0.9600", "No camera tween");
    equal(
      $("#motion-toggle").getAttribute("aria-pressed"),
      "true",
      "Starts paused",
    );
    assert(
      $("#experience").classList.contains("motion-paused"),
      "Ambient pause class",
    );
  });
  await test("Dialogs: native modal, content and focus restoration", async () => {
    await load();
    const trigger = $('[data-open-dialog="budget-details"]');
    trigger.click();
    assert($("#budget-details").open, "Dialog is open");
    assert(
      $("#budget-details").textContent.includes("besonderes Essen"),
      "Budget exception explained",
    );
    $("#budget-details .dialog-close").click();
    assert(!$("#budget-details").open, "Dialog closed");
    await until(
      () => frame.contentDocument.activeElement === trigger,
      "Dialog focus return",
    );
    assert(frame.contentDocument.activeElement === trigger, "Focus restored");
  });
  await test("Repository-subpath deployment resolves the modules and image", async () => {
    await load({ subpath: true });
    fill();
    equal(
      $("#answer-progress").textContent,
      "4 von 4 Budgets bewertet",
      "Modules loaded",
    );
    const image = new frame.contentWindow.Image();
    image.src = new URL("repo-test/assets/illustrations/world.webp", rootURL);
    await image.decode();
    assert(image.naturalWidth >= 1500, "Illustration loaded");
  });
  await test("No cookies or browser storage written by answering", async () => {
    await load();
    const before = [
      frame.contentDocument.cookie,
      frame.contentWindow.localStorage.length,
      frame.contentWindow.sessionStorage.length,
    ];
    fill();
    equal(
      [
        frame.contentDocument.cookie,
        frame.contentWindow.localStorage.length,
        frame.contentWindow.sessionStorage.length,
      ],
      before,
      "No storage changes",
    );
  });
  const failures = records.filter((r) => r.status === "failed");
  summary.textContent = `${records.length - failures.length}/${records.length} erfolgreich · ${failures.length} fehlgeschlagen`;
  summary.dataset.done = "true";
  summary.dataset.failed = String(failures.length);
  report.value = JSON.stringify(
    {
      date: new Date().toISOString(),
      userAgent: navigator.userAgent,
      passed: records.length - failures.length,
      failed: failures.length,
      tests: records,
    },
    null,
    2,
  );
  runButton.disabled = false;
  sizeSelect.disabled = false;
  await load();
}
runButton.addEventListener("click", run);
sizeSelect.addEventListener("change", async () => {
  const [width, height] = sizeSelect.value.split("x").map(Number);
  await load({ width, height });
});
const preview = new URLSearchParams(location.search).get("preview");
if (preview) {
  document.body.classList.add("preview");
  document.querySelector("#frame-wrap").style.width =
    `${Math.min(Number(preview.split("x")[0]), innerWidth - 40)}px`;
  sizeSelect.value = preview;
  const [width, height] = preview.split("x").map(Number);
  await load({ width, height });
} else if (new URLSearchParams(location.search).has("run")) await run();
else await load();
