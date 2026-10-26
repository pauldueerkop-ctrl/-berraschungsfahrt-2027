import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const external = process.env.PREVIEW_URL;
const baseURL = external || "http://127.0.0.1:3000";
let server;
if (!external) {
  server = spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: root,
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(baseURL)).ok) break;
    } catch {}
    if (attempt === 59)
      throw new Error("Der lokale Server wurde nicht bereit.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : {}),
  });
  await mkdir(new URL("../docs/screenshots/", import.meta.url), {
    recursive: true,
  });
  const variants = [
    { name: "desktop-100", width: 1440, height: 900, level: 0 },
    { name: "desktop-200", width: 1440, height: 900, level: 1 },
    { name: "desktop-300", width: 1440, height: 900, level: 2 },
    { name: "desktop-weit", width: 1440, height: 900, level: 3 },
    { name: "smartphone", width: 390, height: 844, level: 1 },
    { name: "tablet", width: 768, height: 1024, level: 2 },
    { name: "laptop", width: 1280, height: 720, level: 0 },
  ];
  for (const variant of variants) {
    const page = await browser.newPage({
      viewport: { width: variant.width, height: variant.height },
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    // No network path to Formspree or other third parties, even during screenshots.
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === new URL(baseURL).origin
        ? route.continue()
        : route.abort("blockedbyclient"),
    );
    await page.goto(baseURL);
    await page.locator('[data-ready="true"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator(`.budget-stop[data-level="${variant.level}"]`).click();
    await page.evaluate(() => scrollTo(0, 0));
    const destination = fileURLToPath(
      new URL(`../docs/screenshots/${variant.name}.png`, import.meta.url),
    );
    await page.screenshot({
      path: destination,
      fullPage: true,
      animations: "disabled",
    });
    console.log(destination);
    await page.close();
  }
} finally {
  await browser?.close();
  server?.kill();
}
