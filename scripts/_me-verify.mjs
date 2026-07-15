import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1600, height: 900 } });
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000/me", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: shot("me-top.png") });

// black hole stage
await page.locator(".bh-stage").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await page.screenshot({ path: shot("me-blackhole.png") });

// feed a question via the index row, check the answer radiates out
await page.locator(".bh-index-q", { hasText: "Why the space theme?" }).click();
await page.waitForTimeout(800);
const answer = await page.locator(".bh-answer").textContent();
console.log("answer visible:", Boolean(answer && answer.includes("CubeSat")));
await page.screenshot({ path: shot("me-answer.png") });

// throw a question in
await page.fill("#bh-question", "What is your favorite planet and why is it not Earth?");
await page.click("button[aria-label='Submit question']");
await page.waitForTimeout(1500);
console.log("submit status:", (await page.locator(".bh-status").textContent())?.trim());

// weird FAQ
await page.locator(".me-faq").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: shot("me-faq.png") });

// mobile top
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const m = await ctx.newPage();
await m.goto("http://localhost:3000/me", { waitUntil: "networkidle", timeout: 60000 });
await m.waitForTimeout(2500);
console.log("mobile overflow:", await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await m.locator(".bh-stage").scrollIntoViewIfNeeded();
await m.waitForTimeout(1200);
await m.screenshot({ path: shot("me-mobile.png") });

await browser.close();
console.log("DONE");
