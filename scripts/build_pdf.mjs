// Build the résumé PDF that the footer link downloads. Headless Chrome prints the
// page over CDP, and @media print shows only the .print-sheet block. The PDF has
// no browser header or footer (no date, URL, or page numbers), unlike a print
// from the browser dialog. It needs no dependencies: Node 22+ (global WebSocket)
// and an installed Chrome.
//
// Usage (needs the site on a local server):
//   python3 -m http.server 4173 -d dist &
//   node scripts/build_pdf.mjs [--url http://localhost:4173/] [--out dist/drew-watkins-resume.pdf]
//
// The exit code is 1 if the page does not load or the PDF is not 1 or 2 pages.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const URL_ = arg("--url", "http://localhost:4173/");
const OUT = arg("--out", "dist/drew-watkins-resume.pdf");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, tries, what) {
  for (let i = 0; i < tries; i += 1) {
    try { const v = await fn(); if (v) return v; } catch {}
    await sleep(150);
  }
  throw new Error(what);
}

// The server can start in the same CI step, so wait until it answers.
await retry(async () => (await fetch(URL_)).ok, 60, `no answer from ${URL_}`);

const profile = mkdtempSync(join(tmpdir(), "drew-pdf-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: "ignore" });

try {
  const target = await retry(async () => {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    return list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  }, 200, "Chrome did not start");
  const ws = new WebSocket(target);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let seq = 0;
  const waiting = new Map();
  ws.addEventListener("message", (m) => {
    const msg = JSON.parse(m.data);
    if (!msg.id || !waiting.has(msg.id)) return;
    const { resolve, reject } = waiting.get(msg.id);
    waiting.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: URL_ });
  await retry(() => evaluate(`document.readyState === "complete"`), 100, "page did not load");
  // The headshot (if the sheet has one) and the web fonts must be in place before the print.
  await evaluate(`document.fonts.ready.then(() => true)`);
  const hasPhoto = await evaluate(`Boolean(document.querySelector(".ps-photo img"))`);
  const photo = hasPhoto
    ? await retry(() => evaluate(`(() => { const i = document.querySelector(".ps-photo img"); return i.complete && i.naturalWidth > 0; })()`), 60, "headshot did not load")
    : "none";

  const pdf = await send("Page.printToPDF", {
    printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, generateDocumentOutline: false,
  });
  const bytes = Buffer.from(pdf.data, "base64");
  const pages = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  writeFileSync(OUT, bytes);
  console.log(`wrote ${OUT}: ${pages} page(s), ${(bytes.length / 1024).toFixed(0)} KB, headshot=${photo}`);
  if (pages < 1 || pages > 2) { console.error(`expected 1 or 2 pages, got ${pages}`); process.exitCode = 1; }
  ws.close();
} catch (err) {
  console.error(`build_pdf: ${err.message}`);
  process.exitCode = 1;
} finally {
  // Chrome writes a profile of 20 to 60 MB. Delete it after Chrome exits.
  await new Promise((r) => { chrome.once("exit", r); chrome.kill(); });
  rmSync(profile, { recursive: true, force: true });
}
