import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";
import { projects } from "../src/lib/portfolio-data";

// These are deliberately content/status checks, not WebGL checks: the 3D canvases
// may not get a GPU context in headless CI, and the CanvasErrorBoundary is supposed
// to keep the page working in exactly that case.

test("home page loads", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/Alex Simpson/);
});

test("world page renders its content", async ({ page }) => {
  await page.goto("/world");
  await expect(page).toHaveTitle(/World/);
  await expect(page.getByText("World log")).toBeVisible();
});

test("projects index lists projects", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveTitle(/Projects/);
  await expect(page.locator('a[href^="/projects/"]').first()).toBeVisible();
});

test("hire-me page exposes recruiter proof and contact actions", async ({ page }) => {
  await page.goto("/hire-me");
  await expect(page).toHaveTitle(/Hire Me/);
  await expect(page.getByRole("heading", { name: "Alex Simpson" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /NSA software intern/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /CubeSat secure telemetry PCB/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /CS 161 secure file system/ }).first()).toBeVisible();
});

test("a project detail page renders a heading", async ({ page }) => {
  await page.goto("/projects/secure-file-storage");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("every project detail page exposes clear work sections", async ({ page }) => {
  for (const project of projects) {
    await page.goto(`/projects/${project.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(project.title);
    await expect(page.locator(".chip").filter({ hasText: project.verification }).first()).toBeVisible();
    await expect(page.getByText("Problem -> solution", { exact: true })).toBeVisible();
    await expect(page.getByText("System flow", { exact: true })).toBeVisible();
  }
});

test("the cubesat project mounts the PCB showcase section", async ({ page }) => {
  await page.goto("/projects/cubesat-telemetry-pcb");
  await expect(page.getByText("Operation HOPE // Mission brief")).toBeVisible();
  await expect(page.getByText("SECURE THE PACKET BEFORE THE SKY SEES IT")).toBeVisible();
  await expect(page.getByText("ATTACKER SAT", { exact: true })).toBeVisible();
  await expect(page.locator(".pcb-showcase")).toBeVisible();
  await expect(page.getByText("Board sections", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Compute and control/ })).toBeVisible();
  await page.getByRole("tab", { name: /Radio and positioning/ }).click();
  await expect(page.getByText("SX1262 QFN-24")).toBeVisible();
  await page.getByRole("tab", { name: /Power input/ }).click();
  const boardPanel = page.locator(".board-tab-panel");
  await expect(boardPanel.getByText("MCP73871 charger")).toBeVisible();
  await expect(boardPanel.getByText("Design choices")).toBeVisible();
});

test("unknown route returns a 404 page", async ({ page }) => {
  const res = await page.goto("/this-route-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText(/off the map/i)).toBeVisible();
});

test("recommendations API returns an items array", async ({ request }) => {
  const res = await request.get("/api/recommendations");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.items)).toBeTruthy();
});

test("project gallery media references existing public files", async () => {
  const missing = projects.flatMap((project) =>
    (project.gallery ?? [])
      .filter((item) => item.src.startsWith("/"))
      .filter((item) => !fs.existsSync(path.join(process.cwd(), "public", item.src.slice(1))))
      .map((item) => `${project.slug}: ${item.src}`),
  );

  expect(missing).toEqual([]);
});
