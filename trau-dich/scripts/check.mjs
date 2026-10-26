import { readFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
let references = 0;
const errors = [];
async function verify(source, ref) {
  if (/^(?:#|https?:|data:)/.test(ref)) return;
  if (ref.startsWith("/"))
    errors.push(
      `Absolute URL incompatible with repository subpaths: ${source}: ${ref}`,
    );
  const target = path.resolve(path.dirname(source), ref.split(/[?#]/)[0]);
  try {
    await stat(target);
    references++;
  } catch {
    errors.push(`Missing asset: ${source}: ${ref}`);
  }
}
const htmlPath = path.join(root, "index.html");
const html = await readFile(htmlPath, "utf8");
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g))
  await verify(htmlPath, match[1]);
for (const folder of ["js", "css"]) {
  for (const file of await readdir(path.join(root, folder))) {
    const source = path.join(root, folder, file);
    const text = await readFile(source, "utf8");
    const pattern =
      folder === "js"
        ? /from ['"]([^'"]+)['"]/g
        : /url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g;
    for (const match of text.matchAll(pattern))
      await verify(source, match[1] || match[2] || match[3]);
  }
}
if (!html.includes('lang="de"'))
  errors.push("Missing German document language");
if (!html.includes('name="viewport"')) errors.push("Missing viewport metadata");
if (/<script[^>]+src="https?:/.test(html))
  errors.push("External script dependency");
if (
  html.includes('type="email"') ||
  html.includes('type="tel"') ||
  html.includes('type="text"')
)
  errors.push("Unexpected personal-data field");
await stat(path.join(root, ".nojekyll"));
const image = await stat(path.join(root, "assets/illustrations/world.webp"));
if (image.size > 2 * 1024 * 1024) errors.push("World asset exceeds 2 MiB");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: ${references} local references resolve; relative repository paths, German metadata, no external scripts or personal-data fields. World asset: ${Math.round(image.size / 1024)} KiB.`,
);
