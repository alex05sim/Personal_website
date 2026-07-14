import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1600, height: 900 } });
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000/world", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3500);

const list = page.locator(".travel-list");
await list.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);

// hover the first card (has the test photo) — fly hint + zoom control appear
const first = page.locator(".travel-card").first();
await first.hover();
await page.waitForTimeout(500);
await page.screenshot({ path: shot("cards-hover.png") });

// click the card — active state + globe focus
await first.click();
await page.waitForTimeout(700);
const activeCount = await page.locator(".travel-card.is-active").count();
console.log("active cards after click:", activeCount);

// open the photo lightbox via the zoom control
await first.hover();
await page.locator(".travel-photo-zoom").first().click();
await page.waitForTimeout(500);
const lightbox = await page.locator(".research-lightbox img").isVisible();
console.log("photo lightbox open:", lightbox);
await page.screenshot({ path: shot("cards-lightbox.png") });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
console.log("lightbox closed:", (await page.locator(".research-lightbox").count()) === 0);

await browser.close();
console.log("DONE");
