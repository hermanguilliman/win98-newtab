/**
 * Build pipeline: src/ → win98-newtab/newtab.js (IIFE), then inject
 * SHA-256 short hashes into newtab.html ?v= params so the browser
 * always serves the latest files without manual cache-bust bumps.
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* 1. Bundle src/ into the single Chrome-loaded script */
await build({
    entryPoints: [join(root, "src/app.js")],
    bundle: true,
    format: "iife",
    target: ["chrome110"],
    charset: "utf8",
    outfile: join(root, "win98-newtab/newtab.js"),
    logLevel: "info",
});

/* 2. Compute short hashes for cache-bust */
async function fileHash(filePath) {
    const data = await readFile(filePath);
    return createHash("sha256").update(data).digest("hex").slice(0, 8);
}

const cssHash = await fileHash(join(root, "win98-newtab/win98.css"));
const jsHash  = await fileHash(join(root, "win98-newtab/newtab.js"));

/* 3. Inject hashes into newtab.html (?v=<hash>) */
const htmlPath = join(root, "win98-newtab/newtab.html");
let html = await readFile(htmlPath, "utf8");

const origHtml = html;
html = html.replace(/win98\.css\?v=\w+/, `win98.css?v=${cssHash}`);
html = html.replace(/newtab\.js\?v=\w+/, `newtab.js?v=${jsHash}`);

if (html !== origHtml) {
    await writeFile(htmlPath, html, "utf8");
    console.log(`→ cache-bust: win98.css?v=${cssHash}  newtab.js?v=${jsHash}`);
} else {
    console.log("→ newtab.html cache params already up to date");
}