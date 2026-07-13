import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1600, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
});
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000/projects/solar-cycle-prediction", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(3500); // let the canvas + intro settle

// 1. hero with sun
await page.screenshot({ path: shot("solar-hero.png") });

// 2. move pointer over the left half (sun) to trigger hover excite + parallax
await page.mouse.move(350, 450);
await page.waitForTimeout(900);
await page.mouse.click(350, 450); // flare burst
await page.waitForTimeout(500);
await page.screenshot({ path: shot("solar-hero-hover.png") });

// 3. scroll to Figure 1 and check the img actually displays
const fig = page.locator(".research-fig").first();
await fig.scrollIntoViewIfNeeded();
await page.waitForTimeout(1200); // reveal transition + image render
const imgVisible = await page.locator(".research-fig-img").first().isVisible();
const phVisible = await page.locator(".research-fig-ph").first().isVisible().catch(() => false);
console.log("figure img visible:", imgVisible, "| placeholder visible:", phVisible);
await page.screenshot({ path: shot("solar-figure1.png") });

// 4. click to open the lightbox
await page.locator(".research-fig-zoom").first().click();
await page.waitForTimeout(400);
const lbVisible = await page.locator(".research-lightbox img").isVisible();
console.log("lightbox visible:", lbVisible);
await page.screenshot({ path: shot("solar-lightbox.png") });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
console.log("lightbox closed:", (await page.locator(".research-lightbox").count()) === 0);

// 5. deep section (diffusion figures) — reveal + images
await page.locator('img[src="/research/limiting-behavior.png"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: shot("solar-deep.png") });

const brokenImgs = await page.$$eval("img", (imgs) =>
  imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
);
console.log("broken images:", brokenImgs.length ? brokenImgs : "none");

await browser.close();
console.log("DONE");
