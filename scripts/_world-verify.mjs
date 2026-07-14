import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1600, height: 900 } });
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000/world", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(4000);

await page.locator(".world-orb").scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.screenshot({ path: shot("world-globe.png") });

const issText = await page.locator(".world-readout-iss strong").textContent();
console.log("ISS readout:", issText?.trim());

// drag the globe away first so the focus swing is visible, then click Olney —
// the globe should glide back to the US east coast
const orb = page.locator(".world-orb");
const box = await orb.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(600);
await page.screenshot({ path: shot("world-dragged.png") });

await page.locator("button.travel-card", { hasText: "Olney" }).click();
await page.waitForTimeout(400);
await orb.scrollIntoViewIfNeeded();
await page.waitForTimeout(1600);
await page.screenshot({ path: shot("world-focus-olney.png") });

await browser.close();
console.log("DONE");
