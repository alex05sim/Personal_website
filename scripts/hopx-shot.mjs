import { chromium } from "playwright";

const URL = "http://localhost:3000/projects/cubesat-telemetry-pcb";
const OUT = "C:/Coding Project/Personal_web/Personal_website/artifacts";

const browser = await chromium.launch({
  args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist", "--enable-gpu"],
});

const shots = [
  { name: "hopx-desktop", vp: { width: 1440, height: 900 }, reduce: false },
  { name: "hopx-wide", vp: { width: 1920, height: 1080 }, reduce: false },
  { name: "hopx-tall", vp: { width: 1620, height: 1900 }, reduce: false },
  { name: "hopx-mobile", vp: { width: 390, height: 844 }, reduce: false },
  { name: "hopx-reduced", vp: { width: 1440, height: 900 }, reduce: true },
];

for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: s.vp,
    deviceScaleFactor: 1,
    reducedMotion: s.reduce ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4200); // earth textures + scramble + boot-in
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const path = `${OUT}/${s.name}.png`;
  await page.screenshot({ path });
  console.log("saved", path);
  await ctx.close();
}

await browser.close();
console.log("done");
