import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const kind = process.argv[3] ?? "hope";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1600, height: 900 } });
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);

// trigger via the mission cue button (same code path as clicking the 3D object)
const cue = kind === "sun" ? ".hero-sun-cue" : ".hero-mission-cue";
await page.locator(cue).first().click();

// capture through the sequence: lock-on, mid-dolly, late-dolly, warp
await page.waitForTimeout(400);
await page.screenshot({ path: shot(`launch-${kind}-1-lock.png`) });
await page.waitForTimeout(500); // ~900ms
await page.screenshot({ path: shot(`launch-${kind}-2-mid.png`) });
await page.waitForTimeout(500); // ~1400ms
await page.screenshot({ path: shot(`launch-${kind}-3-late.png`) });
await page.waitForTimeout(450); // ~1850ms — warp phase
await page.screenshot({ path: shot(`launch-${kind}-4-warp.png`) });
await page.waitForTimeout(900); // ~2750ms — should have navigated
console.log("landed on:", page.url());
await page.screenshot({ path: shot(`launch-${kind}-5-arrival.png`) });

await browser.close();
console.log("DONE");
