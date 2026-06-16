import { chromium } from "playwright";

const URL = "http://localhost:3000/projects/cubesat-telemetry-pcb";
const OUT = "C:/Coding Project/Personal_web/Personal_website/artifacts";

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

// scroll fractions of the pcb section to sample the animation
const samples = [0, 0.25, 0.45, 0.65, 0.85, 1.0];

const browser = await chromium.launch({
  args: [
    "--use-angle=d3d11",
    "--use-gl=angle",
    "--ignore-gpu-blocklist",
    "--enable-gpu",
  ],
});

for (const [vp, size] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  // find the pcb-showcase section bounds
  const box = await page.evaluate(() => {
    const el = document.querySelector(".pcb-showcase");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: el.scrollHeight, vh: window.innerHeight };
  });
  if (!box) {
    console.log(`[${vp}] .pcb-showcase NOT FOUND`);
    await ctx.close();
    continue;
  }
  console.log(`[${vp}] section top=${box.top} height=${box.height}`);

  for (const s of samples) {
    // scrollable range within the sticky section = height - vh
    const y = box.top + s * (box.height - box.vh);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900);
    const name = `${OUT}/pcb-audit-${vp}-${String(Math.round(s * 100)).padStart(3, "0")}.png`;
    await page.screenshot({ path: name });
    console.log("  saved", name);
  }
  await ctx.close();
}

await browser.close();
console.log("done");
