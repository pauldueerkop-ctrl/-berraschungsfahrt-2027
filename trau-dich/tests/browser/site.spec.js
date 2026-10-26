import { test, expect } from "playwright/test";
const answers = ["Sehr wahrscheinlich", "Eher ja", "Eher nein", "Nein"];
const labels = ["Bis 100 €", "100–200 €", "200–300 €", "Über 300 €"];
const endpoint = "https://formspree.io/f/myeeepoe";
let requests;

test.beforeEach(async ({ context, page }) => {
  requests = [];
  // Fail closed: no test can contact a third party, even if a test-specific mock breaks.
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const appOrigin = new URL(
      test.info().project.use.baseURL ||
        process.env.PREVIEW_URL ||
        "http://127.0.0.1:3000",
    ).origin;
    if (url.origin !== appOrigin) return route.abort("blockedbyclient");
    return route.continue();
  });
  await page.route(endpoint, async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"ok":true}',
    });
  });
  await page.goto("./");
  await expect(page.locator("#experience")).toHaveAttribute(
    "data-ready",
    "true",
  );
});
async function pick(page, level, answer) {
  await page.locator(`.budget-stop[data-level="${level}"]`).click();
  if (answer !== undefined)
    await page.getByRole("radio", { name: answer, exact: true }).check();
}
async function complete(page, values = answers) {
  for (let i = 0; i < 4; i++) await pick(page, i, values[i]);
}

for (let level = 0; level < 4; level++) {
  for (const answer of answers) {
    test(`Budget ${level + 1}: ${answer} is preserved across arbitrary changes`, async ({
      page,
    }) => {
      await pick(page, level, answer);
      for (const other of [3, 0, 2, 1]) await pick(page, other);
      await pick(page, level);
      await expect(
        page.getByRole("radio", { name: answer, exact: true }),
      ).toBeChecked();
      await expect(page.locator("#budget-value")).toHaveText(labels[level]);
      await expect(page.locator("#answer-progress")).toHaveText(
        "1 von 4 Budgets bewertet",
      );
      expect(requests).toEqual([]);
    });
  }
}
test("Independent answers can be changed and are mapped to the exact POST fields", async ({
  page,
}) => {
  await complete(page, ["Nein", "Sehr wahrscheinlich", "Eher nein", "Eher ja"]);
  await pick(page, 2, "Sehr wahrscheinlich");
  await page
    .getByRole("button", { name: "Stimmungsbild abschicken", exact: true })
    .click();
  await expect(page.locator("#success-panel")).toBeVisible();
  expect(requests).toEqual([
    {
      veranstaltung: "Überraschungsfahrt 2027",
      budget_bis_100: "Nein",
      budget_100_200: "Sehr wahrscheinlich",
      budget_200_300: "Sehr wahrscheinlich",
      budget_ueber_300: "Eher ja",
    },
  ]);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#success-summary")).toContainText(
    "Sehr wahrscheinlich",
  );
});
for (let missing = 0; missing < 4; missing++) {
  test(`Missing budget ${missing + 1} blocks submission and focuses the answer`, async ({
    page,
  }) => {
    for (let i = 0; i < 4; i++)
      if (i !== missing) await pick(page, i, answers[i]);
    await page.locator("#submit-button").click();
    await expect(page.locator("#budget-slider")).toHaveValue(String(missing));
    await expect(page.locator("#form-message")).toContainText(labels[missing]);
    await expect(
      page.getByRole("radio", { name: "Sehr wahrscheinlich", exact: true }),
    ).toBeFocused();
    expect(requests).toEqual([]);
  });
}
test("Slow response shows pending state, locks input, and suppresses repeated submissions", async ({
  page,
}) => {
  let release;
  let count = 0;
  await page.route(endpoint, async (route) => {
    count++;
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"ok":true}',
    });
  });
  await complete(page);
  await page.locator("#submit-button").click();
  await expect(page.locator("#submit-button")).toBeDisabled();
  await expect(page.locator("#budget-slider")).toBeDisabled();
  await expect(page.locator("#success-panel")).toBeHidden();
  await page.locator("#budget-form").evaluate((form) => {
    for (let i = 0; i < 10; i++) form.requestSubmit();
  });
  expect(count).toBe(1);
  release();
  await expect(page.locator("#success-panel")).toBeVisible();
});
test("Network failure is retryable without losing the answers", async ({
  page,
}) => {
  await page.route(endpoint, (route) => route.abort("internetdisconnected"));
  await complete(page);
  await page.locator("#submit-button").click();
  await expect(page.locator("#form-message")).toContainText("Verbindung");
  await expect(page.locator("#success-panel")).toBeHidden();
  await expect(page.locator("#answer-progress")).toHaveText(
    "4 von 4 Budgets bewertet",
  );
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"ok":true}',
    }),
  );
  await page.locator("#submit-button").click();
  await expect(page.locator("#success-panel")).toBeVisible();
});
for (const status of [403, 422, 429, 500]) {
  test(`Server failure ${status} never shows success`, async ({ page }) => {
    await page.route(endpoint, (route) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: '{"errors":[{"message":"blocked"}]}',
      }),
    );
    await complete(page);
    await page.locator("#submit-button").click();
    await expect(page.locator("#form-message")).toBeVisible();
    await expect(page.locator("#submit-button")).toBeEnabled();
    await expect(page.locator("#success-panel")).toBeHidden();
  });
}
test("Malformed successful response does not trigger the thank-you panel", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<h1>Unconfirmed</h1>",
    }),
  );
  await complete(page);
  await page.locator("#submit-button").click();
  await expect(page.locator("#form-message")).toContainText("Bestätigung");
  await expect(page.locator("#success-panel")).toBeHidden();
});
test("Native range keyboard, Home and End, and radio keyboard interaction", async ({
  page,
}) => {
  const slider = page.getByRole("slider", { name: "Budgetstufe", exact: true });
  await slider.focus();
  for (let level = 1; level < 4; level++) {
    await slider.press("ArrowRight");
    await expect(slider).toHaveValue(String(level));
  }
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  await slider.press("End");
  await expect(slider).toHaveValue("3");
  const radio = page.getByRole("radio", {
    name: "Sehr wahrscheinlich",
    exact: true,
  });
  await radio.focus();
  await radio.press("Space");
  await radio.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Eher ja", exact: true }),
  ).toBeChecked();
});
test("Slider supports real mouse dragging", async ({ page }) => {
  const box = await page.locator("#budget-slider").boundingBox();
  await page.mouse.move(box.x + 12, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.locator("#budget-slider")).toHaveValue("3");
});
test("Touch selection and slider tapping at phone size", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    baseURL: process.env.PREVIEW_URL || "http://127.0.0.1:3000",
  });
  await context.route("https://formspree.io/**", (route) => route.abort());
  const page = await context.newPage();
  await page.goto("./");
  await page.locator('.budget-stop[data-level="2"]').tap();
  await page.getByRole("radio", { name: "Eher ja", exact: true }).tap();
  await expect(
    page.getByRole("radio", { name: "Eher ja", exact: true }),
  ).toBeChecked();
  await page.locator("#budget-slider").scrollIntoViewIfNeeded();
  const box = await page.locator("#budget-slider").boundingBox();
  await page.touchscreen.tap(box.x + box.width - 13, box.y + box.height / 2);
  await expect(page.locator("#budget-slider")).toHaveValue("3");
  await context.close();
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
  test(`Layout ${width}×${height}: no horizontal overflow, controls remain reachable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await expect(page.locator("h1")).toBeVisible();
    for (const level of [0, 3]) {
      await pick(page, level);
      const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    }
    await page.locator("#submit-button").scrollIntoViewIfNeeded();
    await expect(page.locator("#submit-button")).toBeInViewport();
    if (width >= 1024 && height >= 720)
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(height + 1);
  });
}
test("Camera eases between levels; motion can be paused", async ({ page }) => {
  const initial = Number(await page.locator("#world-svg").getAttribute("data-scale"));
  await pick(page, 3);
  await expect
    .poll(async () =>
      Number(await page.locator("#world-svg").getAttribute("data-scale")),
    )
    .toBeCloseTo(0.86, 2);
  const finalScale = Number(await page.locator("#world-svg").getAttribute("data-scale"));
  expect(initial / finalScale).toBeGreaterThan(3.5);
  await page.locator("#motion-toggle").click();
  const vehicle = page.locator('[data-route="woodland"]');
  const transform = await vehicle.getAttribute("transform");
  await page.waitForTimeout(180);
  expect(await vehicle.getAttribute("transform")).toBe(transform);
});
test("Comic effects follow the vehicles and freeze with the pause control", async ({ page }) => {
  await pick(page, 3);
  const trail = page.locator('[data-trail-route="air-west"] .contrail-line').first();
  await expect(trail).toHaveAttribute("d", /^M.+L/);
  const firstTrail = await trail.getAttribute("d");
  await expect.poll(() => trail.getAttribute("d")).not.toBe(firstTrail);
  const horn = page.locator('[data-route="woodland"] .comic-honk');
  await expect.poll(async () => Number(await horn.getAttribute("opacity")), { timeout: 8000 }).toBeGreaterThan(.5);
  await page.locator("#motion-toggle").click();
  const scene = await page.locator("#vehicles").innerHTML();
  const frozenTrail = await trail.getAttribute("d");
  await page.waitForTimeout(250);
  expect(await page.locator("#vehicles").innerHTML()).toBe(scene);
  expect(await trail.getAttribute("d")).toBe(frozenTrail);
  // Cartoon characters stay readable in the widest view, including on phones.
  const width = (await page.locator('[data-route="woodland"] .vehicle-sprite').boundingBox()).width;
  expect(width).toBeGreaterThan(35);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await page.locator('[data-route="woodland"] .vehicle-sprite').boundingBox()).width).toBeGreaterThan(22);
  expect(requests).toEqual([]);
});
test("Reduced motion removes camera tweening and ambient animations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await pick(page, 3);
  await expect(page.locator("#world-svg")).toHaveAttribute(
    "data-scale",
    "0.8600",
  );
  await expect(page.locator("#motion-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const duration = await page
    .locator(".ambient-cloud")
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
});
test("Info dialog supports Escape and returns focus", async ({ page }) => {
  const trigger = page.getByRole("button", {
    name: "Mehr dazu, was im Budget enthalten ist",
  });
  await trigger.click();
  await expect(page.locator("#budget-details")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#budget-details")).toBeHidden();
  await expect(trigger).toBeFocused();
});
test("A repository subpath resolves all assets and modules", async ({
  page,
}) => {
  const failures = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.goto("./repo-test/");
  await expect(page.locator("#experience")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await complete(page);
  expect(failures).toEqual([]);
});
test("No cookies, localStorage, or sessionStorage are written", async ({
  page,
  context,
}) => {
  await complete(page);
  expect(await context.cookies()).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});
