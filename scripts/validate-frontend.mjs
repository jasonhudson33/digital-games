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

// ── 4. No orphaned identifiers in client components ────────────────────────
// tsc does not check these .js files, so a refactor that deletes a declaration
// while leaving its uses behind produces a file that parses, typechecks, and
// throws the moment the component renders. This is the check that would have
// caught the useGameRoom migration deleting Qwirkle's `staged` state.
console.log("Orphaned identifiers:");
if (parser) {
  for (const f of appFiles.filter((x) => x.startsWith("components/"))) {
    const src = srcOf.get(f);
    let ast;
    try { ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] }); }
    catch { continue; }

    const declared = new Set();
    const used = new Map();
    (function walk(node, inKey) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach((n) => walk(n, inKey));
      const t = node.type;
      if (t === "ImportSpecifier" || t === "ImportDefaultSpecifier" || t === "ImportNamespaceSpecifier")
        declared.add(node.local.name);
      if (t === "VariableDeclarator" || t === "FunctionDeclaration" || t === "ClassDeclaration") {
        const id = node.id;
        if (id?.type === "Identifier") declared.add(id.name);
        // Patterns nest: const [a, ...rest] = x and const { a, ...rest } = y both
        // bind names that a naive elements/properties sweep misses.
        (function bind(pattern) {
          if (!pattern) return;
          if (pattern.type === "Identifier") declared.add(pattern.name);
          else if (pattern.type === "ArrayPattern") pattern.elements.forEach(bind);
          else if (pattern.type === "ObjectPattern") pattern.properties.forEach((pr) => bind(pr.value ?? pr.argument));
          else if (pattern.type === "RestElement") bind(pattern.argument);
          else if (pattern.type === "AssignmentPattern") bind(pattern.left);
        })(id);
      }
      // catch (caught) binds its parameter
      if (t === "CatchClause" && node.param?.type === "Identifier") declared.add(node.param.name);
      if (t === "FunctionDeclaration" || t === "FunctionExpression" || t === "ArrowFunctionExpression"
          || t === "ObjectMethod" || t === "ClassMethod")
        (node.params || []).forEach(function params(pp) {
          if (!pp) return;
          if (pp.type === "Identifier") declared.add(pp.name);
          else if (pp.type === "ObjectPattern") pp.properties.forEach((pr) => params(pr.value ?? pr.argument));
          else if (pp.type === "ArrayPattern") pp.elements.forEach(params);
          else if (pp.type === "AssignmentPattern") params(pp.left);
          else if (pp.type === "RestElement") params(pp.argument);
        });
      if (t === "Identifier" && !inKey) used.set(node.name, node.loc?.start.line ?? 0);

      for (const [k, v] of Object.entries(node)) {
        if (k === "loc" || k === "range") continue;
        const skipKey = ((t === "MemberExpression" || t === "OptionalMemberExpression") && k === "property" && !node.computed)
          || ((t === "ObjectProperty" || t === "ObjectMethod" || t === "ClassMethod") && k === "key" && !node.computed)
          || (t === "JSXAttribute" && k === "name")
          || (t === "JSXMemberExpression" && k === "property")
          || (t === "LabeledStatement" && k === "label")
          || (t === "BreakStatement" && k === "label")
          || (t === "ContinueStatement" && k === "label");
        walk(v, skipKey);
      }
    })(ast.program, false);

    const GLOBALS = new Set(["window","document","console","localStorage","navigator","crypto","Math","JSON",
      "Number","String","Boolean","Array","Object","Date","Set","Map","Promise","Error","undefined","null",
      "requestAnimationFrame","cancelAnimationFrame","setTimeout","clearTimeout","setInterval","clearInterval",
      "React","BroadcastChannel","fetch","process","globalThis","structuredClone","URL","Intl","isNaN","parseInt","parseFloat",
      "URLSearchParams","encodeURIComponent","decodeURIComponent","sessionStorage","TypeError","RangeError",
      "HTMLElement","HTMLInputElement","Element","Node","AbortController","IntersectionObserver","MutationObserver","ResizeObserver","queueMicrotask","performance"]);

    const orphans = [...used.keys()].filter((n) => !declared.has(n) && !GLOBALS.has(n) && !/^[A-Z_]+$/.test(n));
    if (orphans.length) fail(`${f} references undeclared: ${orphans.slice(0, 6).join(", ")}`);
  }
  console.log(`  scanned ${appFiles.filter((x) => x.startsWith("components/")).length} client components`);
} else {
  console.log("  (parser unavailable, skipped)");
}

// ── 5. Page files export only what Next allows ─────────────────────────────
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
