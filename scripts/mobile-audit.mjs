/**
 * Drives every game in an emulated phone and reports what breaks there.
 *
 *   npm run dev            (or `next start`) in another terminal, then
 *   npm run audit:mobile
 *   npm run audit:mobile -- --games uno,scum --viewport 320x568 --shots /tmp/shots
 *
 * Options
 *   --base URL       server to test            (default http://localhost:3000, or $BASE_URL)
 *   --games a,b      slugs to test             (default: every game in lib/games.js)
 *   --viewport WxH   repeatable                (default 390x844, 320x568, 844x390)
 *   --shots DIR      save a screenshot per game/viewport/stage
 *   --verbose        list every warning instead of counting them
 *
 * For each game it loads the lobby, creates a room, adds computer players and
 * starts the game, then checks both screens. Exit code is 1 when any FAIL is
 * found. WARN lines are known-hard design limits (tiny card corners, board
 * cells) and never fail the run.
 *
 *   FAIL  page scrolls sideways (document wider than the viewport)
 *   FAIL  uncaught page error, or a React error boundary on screen
 *   FAIL  text field under 16px — iOS Safari zooms the page on focus
 *   FAIL  a card hand (.tbl-fan) scrolls sideways, has a card outside its box,
 *         or leaves under 24px of a card showing (platform/card-hands)
 *   FAIL  a game does not show the landing entry, lobby, game bar or Rules
 *         dialog (scripts/layout-check.mjs lists games not yet migrated)
 *   WARN  readable text under 9px, tap targets under 24px
 *
 * Mafia needs Supabase keys; without them only its lobby is checked.
 * Uses WebKit, the engine behind every iOS browser. One-time setup:
 *   npx playwright install webkit
 */
import fs from "node:fs";
import path from "node:path";
import { webkit } from "playwright";
import { checkLayout } from "./layout-check.mjs";

const args = process.argv.slice(2);
const opt = (name) => {
  const out = [];
  args.forEach((a, i) => { if (a === `--${name}` && args[i + 1]) out.push(args[i + 1]); });
  return out;
};
const flag = (name) => args.includes(`--${name}`);

const base = (opt("base")[0] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const verbose = flag("verbose");
const shotsDir = opt("shots")[0];
const viewports = (opt("viewport").length ? opt("viewport") : ["390x844", "320x568", "844x390"])
  .map((v) => { const [w, h] = v.split("x").map(Number); return { w, h, name: v }; });

const catalogue = fs.readFileSync(new URL("../lib/games.js", import.meta.url), "utf8");
const allSlugs = [...catalogue.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const slugs = opt("games")[0]?.split(",") ?? allSlugs;

// 9px is the floor for the dense map/board labels (Risk territories, Monopoly
// spaces, card corners); everything else is held to 10px by the stylesheets.
const MIN_TEXT = 9;

const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const CREATE = /create (a )?(room|vineyard)|deal me in|deal cards|new game/i;
const ADD = /add (computer|bot|cpu|player|clockwork)/i;
const START = /^(start|begin|deal|open the market|play against)/i;
// Secret Hitler needs five seats; everything else starts with fewer.
const COMPUTERS = { "secret-hitler": 5 };
const START_OVERRIDE = {};

/** Runs in the page. Returns the numbers every check below reads. */
function inspect(MIN_TEXT) {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const name = (el) => (el.innerText || el.getAttribute("aria-label") || el.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 24);
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""}`;

  const wide = [];
  const tinyText = {};
  const smallTargets = [];
  const smallInputs = [];

  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;

    if (r.right > vw + 2 || r.left < -2) {
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) {
        if (["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(p).overflowX)) { clipped = true; break; }
        p = p.parentElement;
      }
      if (!clipped) wide.push(`${label(el)} right=${Math.round(r.right)}`);
    }

    // Monopoly keeps the whole 40-space board on screen by design (pinch to
    // zoom), so its space and owner names are inherently small.
    if (el.closest(".monopoly-page .board")) continue;

    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const size = parseFloat(cs.fontSize);
    if (ownText && size > 0 && size < MIN_TEXT) {
      const key = label(el);
      tinyText[key] = Math.min(tinyText[key] ?? 99, +size.toFixed(1));
    }

    // Sequence's 10x10 board is 34px-wide cells by construction; checkboxes are
    // activated through their label.
    if (el.matches("button, a[href], [role=button], input, select, textarea") && !el.closest(".skip-link")
        && !el.matches(".sequence-space, input[type=checkbox], input[type=radio]")) {
      if ((r.height < 24 || r.width < 24) && !el.matches("input[type=hidden]")) smallTargets.push(`${name(el) || label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (el.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]), select, textarea") && size < 16) {
        smallInputs.push(`${name(el) || el.type} ${size}px`);
      }
    }
  }

  // Card hands (platform/card-hands): fit the box, never scroll, keep a finger-sized strip of every card.
  const hands = [...document.querySelectorAll(".tbl-fan")].map((hand) => {
    const box = hand.getBoundingClientRect();
    const cards = [...hand.children].filter((c) => c.getBoundingClientRect().width);
    const rows = new Map();
    for (const c of cards) {
      // offsetTop is layout, so a lifted (hovered or selected) card stays on its row.
      const r = c.getBoundingClientRect();
      const key = c.offsetTop + c.offsetHeight;
      (rows.get(key) ?? rows.set(key, []).get(key)).push(r);
    }
    let narrowest = Infinity;
    for (const row of rows.values()) {
      row.sort((a, b) => a.left - b.left);
      for (let i = 0; i < row.length - 1; i++) narrowest = Math.min(narrowest, row[i + 1].left - row[i].left);
    }
    const outside = cards.filter((c) => { const r = c.getBoundingClientRect(); return r.right > box.right + 1 || r.left < box.left - 1; }).length;
    const cs = getComputedStyle(hand);
    return {
      name: label(hand), n: cards.length, rows: rows.size, width: Math.round(box.width), narrowest: narrowest === Infinity ? null : Math.round(narrowest),
      scrolls: ["auto", "scroll"].includes(cs.overflowX) && hand.scrollWidth > hand.clientWidth + 1, outside,
    };
  });

  const parts = [...new Set([...document.querySelectorAll("[data-layout]")].map((el) => el.dataset.layout))];
  const boundary = /something broke|application error/i.test(document.body.innerText);
  return { vw, sw, wide: wide.slice(0, 5), tinyText, smallTargets, smallInputs, boundary, parts, hands };
}

let failures = 0;
const fail = (m) => { failures++; console.log(`    FAIL ${m}`); };
const warn = (m) => console.log(`    warn ${m}`);

function report(stage, r, errors, seen) {
  for (const part of r.parts) seen?.add(part);
  if (r.sw > r.vw + 1) fail(`${stage}: page is ${r.sw}px wide in a ${r.vw}px viewport (${r.wide.join("; ")})`);
  if (r.boundary) fail(`${stage}: error boundary on screen`);
  for (const e of errors.splice(0)) fail(`${stage}: ${e}`);
  if (r.smallInputs.length) fail(`${stage}: text fields under 16px (iOS zooms on focus): ${r.smallInputs.join(", ")}`);

  for (const h of r.hands) {
    const where = `${stage}: hand ${h.name} (${h.n} cards, ${h.rows} row${h.rows > 1 ? "s" : ""}, ${h.width}px wide)`;
    if (h.scrolls) fail(`${where} scrolls sideways`);
    if (h.outside) fail(`${where} has ${h.outside} card(s) outside its box`);
    if (h.narrowest !== null && h.narrowest < 24) fail(`${where} shows only ${h.narrowest}px of a card`);
    if (verbose) warn(`${where}: narrowest visible ${h.narrowest}px`);
  }

  const tiny = Object.entries(r.tinyText);
  if (tiny.length) warn(`${stage}: text under ${MIN_TEXT}px in ${tiny.length} selector(s)${verbose ? ": " + tiny.map(([k, v]) => `${k} ${v}px`).join(", ") : ""}`);
  if (r.smallTargets.length) warn(`${stage}: ${r.smallTargets.length} tap target(s) under 24px${verbose ? ": " + r.smallTargets.join(", ") : ""}`);
}

async function shot(page, game, vp, stage) {
  if (!shotsDir) return;
  fs.mkdirSync(shotsDir, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(shotsDir, `${game}-${vp.name}-${stage}.png`) });
}

/** Opens the Rules dialog, records it, and checks Escape closes it again. */
async function openRules(page, seen) {
  // A game can open on a forced prompt (Life's starting path); it is a shared
  // dialog but not one Escape is meant to dismiss, and it covers the Rules button.
  if (await page.locator('[data-layout="dialog"]').count()) {
    seen.add("dialog");
    return;
  }
  const rules = page.getByRole("button", { name: /rules|how to play/i }).first();
  if (!(await rules.count())) return;
  // Open it the way a keyboard user does. WebKit does not focus a button on a
  // pointer click, so a click leaves nothing for the dialog to return focus to.
  await rules.focus().catch(() => {});
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  if (await page.locator('[data-layout="dialog"]').count()) {
    seen.add("dialog");
    await page.keyboard.press("Escape");
    await page.locator('[data-layout="dialog"]').first().waitFor({ state: "detached", timeout: 1500 }).catch(() => {});
    if (await page.locator('[data-layout="dialog"]').count()) fail("dialog: Escape did not close it");
    else if (!(await rules.evaluate((el) => el === document.activeElement))) fail("dialog: focus did not return to the control that opened it");
  }
}

const browser = await webkit.launch();
try {
  for (const vp of viewports) {
    console.log(`\n${vp.name}`);
    for (const slug of slugs) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        userAgent: IPHONE_UA,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await ctx.newPage();
      const errors = [];
      const seen = new Set();
      page.on("pageerror", (e) => errors.push(e.message.split("\n")[0].slice(0, 140)));
      console.log(`  ${slug}`);
      try {
        await page.goto(`${base}/${slug}`, { waitUntil: "networkidle", timeout: 60000 });
        report("lobby", await page.evaluate(inspect, MIN_TEXT), errors, seen);
        await shot(page, slug, vp, "lobby");

        if (slug === "mafia") {
          // Rooms need Supabase keys; check the landing's Rules dialog and stop.
          await openRules(page, seen);
          continue;
        }

        await page.locator("input").first().fill("Tester").catch(() => {});
        await page.getByRole("button", { name: CREATE }).first().click({ timeout: 15000 });
        await page.waitForTimeout(1200);
        // Some games start as soon as the second seat fills, so look at the
        // lobby before adding anyone.
        report("room", await page.evaluate(inspect, MIN_TEXT), errors, seen);
        for (let i = 0; i < (COMPUTERS[slug] ?? 3); i++) {
          const add = page.getByRole("button", { name: ADD }).first();
          if (await add.count() && await add.isEnabled().catch(() => false)) {
            await add.click().catch(() => {});
            await page.waitForTimeout(300);
          }
        }
        report("room (seated)", await page.evaluate(inspect, MIN_TEXT), errors, seen);

        const start = page.getByRole("button", { name: START_OVERRIDE[slug] ?? START }).first();
        if (await start.count()) {
          await start.click({ timeout: 15000 });
          await page.waitForTimeout(2500);
        }
        report("game", await page.evaluate(inspect, MIN_TEXT), errors, seen);
        await openRules(page, seen);
        await shot(page, slug, vp, "game");
      } catch (e) {
        fail(`${slug}: ${e.message.split("\n")[0]}`);
      } finally {
        const { missing, stale } = checkLayout(slug, seen);
        if (missing.length) fail(`${slug}: missing shared layout part(s): ${missing.join(", ")}`);
        if (stale) fail(`${slug}: shows every shared part; remove it from UNMIGRATED in scripts/layout-check.mjs`);
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} failure(s)` : "\nno failures");
process.exit(failures ? 1 : 0);
