import { expect, test } from "@playwright/test";

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

test("a project detail page renders a heading", async ({ page }) => {
  await page.goto("/projects/secure-file-storage");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the cubesat project mounts the PCB showcase section", async ({ page }) => {
  await page.goto("/projects/cubesat-telemetry-pcb");
  await expect(page.locator(".pcb-showcase")).toBeVisible();
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
