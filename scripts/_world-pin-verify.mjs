import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1600, height: 900 } });
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000/world", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(4000);

const orb = page.locator(".world-orb");
await orb.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);

// click ON the globe disc (slightly right of center) to stage a pin
const box = await orb.boundingBox();
await page.mouse.click(box.x + box.width * 0.58, box.y + box.height * 0.42);
await page.waitForTimeout(600);
const hint = await page.locator(".world-hint").textContent();
console.log("hint after click:", hint?.trim());
await page.screenshot({ path: shot("pin-staged.png") });

// fill and submit the form
await page.fill("#visitor-name", "Playwright");
await page.fill("#place", "Lisbon, Portugal");
await page.fill("textarea[name='comment']", "Trams, tiles, and the best light for photos in Europe.");
await page.click("button[aria-label='Submit recommendation']");
await page.waitForTimeout(2500);
const status = await page.locator(".recommendation-status").textContent();
console.log("submit status:", status?.trim());

// feed should show the entry as Pinned
const feedRow = await page.locator(".others-row").first().textContent();
console.log("feed row:", feedRow?.replace(/\s+/g, " ").trim());
await page.screenshot({ path: shot("pin-submitted.png") });

await browser.close();
console.log("DONE");
