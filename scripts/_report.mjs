import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--use-angle=d3d11", "--use-gl=angle", "--ignore-gpu-blocklist", "--enable-gpu"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errs=[]; page.on("console", m=>{ if(m.type()==="error") errs.push(m.text()); });
await page.goto("http://localhost:3000/projects/solar-cycle-prediction", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
// find the research section and scroll through it in segments
const y = await page.evaluate(() => {
  const el = document.querySelector(".research");
  return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
});
console.log("research top y:", y);
if (y != null) {
  let s = y - 40, i = 0;
  while (i < 6) {
    await page.evaluate((sy) => window.scrollTo(0, sy), s);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/_report_${i}.png` });
    s += 950; i++;
  }
}
console.log(errs.length ? ("ERRORS: " + errs.slice(0,4).join(" | ")) : "no console errors");
await b.close();
