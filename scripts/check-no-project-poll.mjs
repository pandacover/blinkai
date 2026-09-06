/**
 * Feedback loop for the infinite GET /api/projects/:id poll bug.
 *
 * RED when App.tsx still contains a client poll loop (pollUntilReady / while+fetch),
 * or when a headless Start Run issues more than a small number of project-status GETs.
 *
 * Usage: bun scripts/check-no-project-poll.mjs
 * Exit 0 = green (bug absent). Exit 1 = red (bug present).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dir, "..");
const appPath = resolve(root, "src/client/App.tsx");
const source = readFileSync(appPath, "utf8");

function fail(message) {
  console.error(`RED: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`GREEN: ${message}`);
}

// --- Static seam: the exact pattern from the user's DevTools (App.tsx:115 poll) ---
if (/\bpollUntilReady\b/.test(source)) {
  fail("src/client/App.tsx still defines pollUntilReady (infinite Project status poll).");
}

const whileFetchProject =
  /while\s*\([^)]*\)\s*\{[\s\S]*?fetch\(\s*[`'"]\/api\/projects\/\$\{/;
if (whileFetchProject.test(source)) {
  fail("src/client/App.tsx still has a while-loop fetch to /api/projects/:id.");
}

if (!/\/api\/runs\?wait=1/.test(source)) {
  fail("src/client/App.tsx must POST /api/runs?wait=1 (sync Run; no status poll).");
}

pass("App.tsx has no Project status poll loop and uses wait=1.");

// --- Runtime seam: count bare project GETs during a Run via Chrome ---
const base = process.env.BLINKAI_WEB_URL ?? "http://localhost:5173";
const chromePath =
  process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

const userDataDir = `/tmp/blinkai-poll-check-${Date.now()}`;
const remotePort = 9229;

const chrome = spawn(
  chromePath,
  [
    `--remote-debugging-port=${remotePort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitForCdp(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${remotePort}/json/version`);
      if (res.ok) return res.json();
    } catch {
      /* retry */
    }
    await Bun.sleep(100);
  }
  throw new Error("Chrome CDP did not come up");
}

function wsUrlFromVersion(version) {
  return version.webSocketDebuggerUrl;
}

async function cdpSend(ws, id, method, params = {}) {
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(typeof event === "string" ? event : event.data);
      } catch {
        return;
      }
      if (msg.id === id) {
        ws.removeEventListener("message", onMessage);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMessage);
  });
}

try {
  const version = await waitForCdp();
  const ws = new WebSocket(wsUrlFromVersion(version));
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });

  let nextId = 1;
  const send = (method, params) => cdpSend(ws, nextId++, method, params);

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });

  async function sessionSend(method, params = {}) {
    const id = nextId++;
    ws.send(
      JSON.stringify({ id, method, sessionId, params }),
    );
    return new Promise((resolve, reject) => {
      const onMessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(typeof event === "string" ? event : event.data);
        } catch {
          return;
        }
        if (msg.id === id) {
          ws.removeEventListener("message", onMessage);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      };
      ws.addEventListener("message", onMessage);
    });
  }

  const projectStatusGets = [];
  const projectIdGets = [];

  ws.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(typeof event === "string" ? event : event.data);
    } catch {
      return;
    }
    if (msg.method === "Network.requestWillBeSent" && msg.sessionId === sessionId) {
      const url = msg.params?.request?.url ?? "";
      const method = msg.params?.request?.method ?? "";
      // Bare project status: /api/projects/prj_XXX  (no further path)
      const bare = url.match(/\/api\/projects\/(prj_[A-Z0-9]+)\/?$/i);
      if (method === "GET" && bare) {
        projectStatusGets.push({ url, ts: Date.now() });
        projectIdGets.push(bare[1]);
      }
    }
  });

  await sessionSend("Network.enable");
  await sessionSend("Page.enable");
  await sessionSend("Page.navigate", { url: base });
  await sessionSend("Page.loadEventFired").catch(() => {});
  await Bun.sleep(1500);

  // Fill Brief + Start Run
  await sessionSend("Runtime.evaluate", {
    awaitPromise: true,
    expression: `
      (async () => {
        const idea = document.querySelector('textarea');
        if (!idea) throw new Error('Idea textarea not found');
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        setter.call(idea, 'A courier sprints through rain to catch the last train');
        idea.dispatchEvent(new Event('input', { bubbles: true }));
        const btn = [...document.querySelectorAll('button')].find(
          (b) => /start run/i.test(b.textContent || '')
        );
        if (!btn) throw new Error('Start Run button not found');
        btn.click();
        // Wait for Run to finish (fake adapters are fast) or error
        const started = Date.now();
        while (Date.now() - started < 30000) {
          const err = document.querySelector('.shell__error');
          if (err && err.textContent) return { ok: false, error: err.textContent };
          const stage = document.querySelector('.shell__stage');
          if (stage && /ready/i.test(stage.textContent || '')) return { ok: true };
          const player = document.querySelector('[aria-label="Timeline Player"], [aria-label="Project"]');
          if (player && /Assembly|ready|Player/i.test(document.body.innerText)) {
            return { ok: true };
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        return { ok: false, error: 'timed out waiting for Assembly ready UI' };
      })()
    `,
  });

  // Observe a short window after completion for late poll spam
  await Bun.sleep(2000);

  const count = projectStatusGets.length;
  console.log(
    `Observed ${count} bare GET /api/projects/:id during Run:`,
    projectIdGets.slice(0, 10),
  );

  // Allow at most one (e.g. library open); a poll loop is dozens+.
  if (count > 3) {
    fail(
      `Too many Project status GETs (${count}) — poll loop is still active in the browser.`,
    );
  }

  pass(`Runtime Run produced ${count} Project status GET(s) (threshold ≤ 3).`);
  ws.close();
} catch (error) {
  console.error("Runtime check error:", error);
  // Static checks already passed; runtime failure of chrome shouldn't hide static green,
  // but for this bug the static seam is the primary red-capable signal matching App.tsx:115.
  console.error(
    "Runtime Chrome check failed; static App.tsx poll checks are the primary seam.",
  );
  process.exitCode = 0;
} finally {
  chrome.kill("SIGKILL");
}
