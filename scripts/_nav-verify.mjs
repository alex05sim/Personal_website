import { chromium } from "@playwright/test";
import path from "node:path";

const OUT = process.argv[2] ?? ".";
const shot = (name) => path.join(OUT, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1600, height: 900 } });
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

const tabs = await page.$$eval("nav[aria-label='Primary'] .nav-tab", (els) =>
  els.map((e) => e.textContent?.trim()),
);
console.log("header tabs:", tabs.join(" | "));
await page.screenshot({ path: shot("nav-top.png") });

// contact section with the new recruiter link
await page.evaluate(() => document.querySelector("#contact")?.scrollIntoView());
await page.waitForTimeout(1500);
const hireLink = await page.locator("a[href='/hire-me']").count();
console.log("hire-me links on homepage:", hireLink);
await page.screenshot({ path: shot("nav-contact.png") });

// footer
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);
const footerLinks = await page.$$eval(".footer-nav a", (els) => els.map((e) => e.textContent?.trim()));
console.log("footer nav:", footerLinks.join(" | "));

await browser.close();
console.log("DONE");
