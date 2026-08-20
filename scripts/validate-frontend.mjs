/**
 * Front-end checks that `tsc --noEmit` cannot see.
 *
 * Written because a stray brace in app/globals.css silently merged one rule
 * into another — valid enough that nothing complained, wrong enough that a
 * hover target picked up `display: flex` and a real selector disappeared.
 *
 *   node scripts/validate-frontend.mjs
 *
 *   1. every stylesheet parses (postcss)
 *   2. every module parses as JSX
 *   3. modules using client-only APIs declare "use client"
 *   4. route files export only what the App Router allows
 */
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

let failures = 0;
const fail = (m) => { failures++; console.log("  FAIL " + m); };

// ── 1. CSS parses ──────────────────────────────────────────────────────────
console.log("CSS parse:");
const cssFiles = [];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory()) walk(p); else if(e.name.endsWith(".css")) cssFiles.push(p);}})("app");
for (const f of cssFiles) {
  try { postcss.parse(fs.readFileSync(f,"utf8"), { from: f }); }
  catch (e) { fail(`${f}: ${e.reason} (line ${e.line})`); }
}
console.log(`  parsed ${cssFiles.length} stylesheets`);

// ── 2. JSX parses ──────────────────────────────────────────────────────────
console.log("JSX/JS parse:");
let parser = null;
try {
  const mod = await import("../node_modules/next/dist/compiled/babel/parser.js");
  parser = mod.default ?? mod;
} catch (e) { console.log("  parser load failed: " + e.message); }

const jsFiles = [];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory()){ if(!/^(node_modules|\.next.*|\.git|_tmp|monopoly|mafia-main|seven-up)$/.test(e.name)) walk(p);} else if(/\.(js|mjs)$/.test(e.name)) jsFiles.push(p);}})(".");
const appFiles = jsFiles.filter(f => /^(app|components|lib)\//.test(f));
if (parser) {
  for (const f of appFiles) {
    try { parser.parse(fs.readFileSync(f,"utf8"), { sourceType:"module", plugins:["jsx"] }); }
    catch (e) { fail(`${f}: ${e.message}`); }
  }
  console.log(`  parsed ${appFiles.length} modules`);
} else {
  console.log("  (parser unavailable, skipped)");
}

// ── 3. React Server Component boundaries ───────────────────────────────────
console.log("RSC boundaries:");
const CLIENT_API = /\b(useState|useEffect|useMemo|useRef|useCallback|useRouter|usePathname|localStorage|sessionStorage|window\.|document\.)/;
const isClient = (src) => /^["']use client["']/m.test(src.split("\n").slice(0,3).join("\n"));

const srcOf = new Map();
for (const f of appFiles) srcOf.set(f, fs.readFileSync(f,"utf8"));

function resolve(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.normalize(path.join(path.dirname(fromFile), spec));
  for (const cand of [base, base + ".js", base + ".mjs", path.join(base,"index.js")]) {
    if (srcOf.has(cand)) return cand;
  }
  return null;
}

for (const [f, src] of srcOf) {
  const clientHere = isClient(src);
  // a module that uses client APIs must declare "use client" (or be imported only by ones that do)
  if (!clientHere && CLIENT_API.test(src.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,""))) {
    // allowed if it is never reachable from a server component... but simplest: flag it
    fail(`${f} uses client-only APIs without "use client"`);
  }
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
    const target = resolve(f, m[1]);
    if (!target) continue;
    if (!clientHere && isClient(srcOf.get(target))) {
      // server importing a client component is legal (it becomes a boundary) — fine
    }
  }
}
console.log(`  checked ${srcOf.size} modules`);

// ── 4. Page files export only what Next allows ─────────────────────────────
console.log("Route exports:");
const ALLOWED = new Set(["default","metadata","generateMetadata","viewport","generateViewport","config","revalidate","dynamic","dynamicParams","fetchCache","runtime","preferredRegion","maxDuration","generateStaticParams","experimental_ppr","alt","size","contentType"]);
for (const f of appFiles.filter(f => /^app\/.*\/(page|layout|loading|error|not-found|manifest)\.js$/.test(f) || /^app\/(page|layout|loading|error|not-found|manifest)\.js$/.test(f))) {
  const src = srcOf.get(f);
  for (const m of src.matchAll(/^export\s+(?:const|function|async function)\s+(\w+)/gm)) {
    if (!ALLOWED.has(m[1])) fail(`${f} exports "${m[1]}" — Next only allows a fixed set from route files`);
  }
  if (/^export\s+default/m.test(src) === false && !f.endsWith("manifest.js")) fail(`${f} has no default export`);
}
console.log("  checked route modules");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} PROBLEM(S)`);
process.exit(failures ? 1 : 0);
