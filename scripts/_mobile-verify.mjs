import { chromium, devices } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

// homepage hero
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
const hOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("home horizontal overflow px:", hOverflow);
await page.screenshot({ path: shot("m-home-hero.png") });

// contact section
await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
await page.waitForTimeout(1200);
await page.screenshot({ path: shot("m-home-contact.png") });

// solar page: hero, figure, bottom
await page.goto("http://localhost:3000/projects/solar-cycle-prediction", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
const sOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("solar horizontal overflow px:", sOverflow);
await page.screenshot({ path: shot("m-solar-hero.png") });
await page.locator(".research-fig").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
const figVisible = await page.locator(".research-fig-img").first().isVisible();
console.log("figure visible on mobile:", figVisible);
await page.screenshot({ path: shot("m-solar-figure.png") });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
await page.screenshot({ path: shot("m-solar-bottom.png") });

// projects listing
await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);
const pOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("projects horizontal overflow px:", pOverflow);
await page.screenshot({ path: shot("m-projects.png") });

await browser.close();
console.log("DONE");
