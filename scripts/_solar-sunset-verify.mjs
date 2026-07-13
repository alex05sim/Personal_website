import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 2560, height: 1080 } });
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000/projects/solar-cycle-prediction", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(3000);

// wide-viewport figure + text scale
await page.locator(".research-fig").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);
await page.screenshot({ path: shot("ultrawide-figure.png") });

// scroll to the very bottom; catch the sun mid-sunset and settled
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
await page.waitForTimeout(450);
await page.screenshot({ path: shot("sunset-mid.png") });
await page.waitForTimeout(1300);
await page.screenshot({ path: shot("sunset-done.png") });

// scroll back up a bit — the sun should rise again
await page.evaluate(() => window.scrollBy(0, -1400));
await page.waitForTimeout(1200);
await page.screenshot({ path: shot("sunset-return.png") });

await browser.close();
console.log("DONE");
