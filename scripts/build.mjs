/**
 * Bundle the extension: src/app.js + src/lib/*.ts → win98-newtab/newtab.js.
 * Output stays a single classic <script> (IIFE), so newtab.html is untouched.
 * The built file is the only thing Chrome ever loads.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await build({
    entryPoints: [join(root, "src/app.js")],
    bundle: true,
    format: "iife",
    target: ["chrome110"],
    charset: "utf8",
    outfile: join(root, "win98-newtab/newtab.js"),
    logLevel: "info",
});

console.log("→ bundled win98-newtab/newtab.js");