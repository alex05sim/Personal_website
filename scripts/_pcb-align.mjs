import { chromium } from "playwright";
const URL = "http://localhost:3000/projects/cubesat-telemetry-pcb";
const pts = [{n:"bare",p:0.87},{n:"blend",p:0.92},{n:"blend2",p:0.945},{n:"d99",p:0.99}];
const browser = await chromium.launch({ args: ["--use-angle=d3d11","--use-gl=angle","--ignore-gpu-blocklist","--enable-gpu"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs=[]; page.on("pageerror",e=>errs.push(e.message));
await page.goto(URL,{waitUntil:"domcontentloaded"});
await page.waitForTimeout(8000);
async function to(p){const t=await page.evaluate(pp=>{const s=document.querySelector(".pcb-showcase");return s.getBoundingClientRect().top+window.scrollY+pp*(s.offsetHeight-window.innerHeight);},p);for(let i=0;i<340;i++){const c=await page.evaluate(()=>window.scrollY);const d=t-c;if(Math.abs(d)<5)break;await page.mouse.wheel(0,Math.max(-340,Math.min(340,d)));await page.waitForTimeout(46);}await page.waitForTimeout(1100);}
for(const pt of pts){await to(pt.p);await page.screenshot({path:`artifacts/pcb-al-${pt.n}.png`});console.log("saved",pt.n);}
console.log("errors:",errs.slice(0,4).join(" | ")||"none");
await browser.close();
