import { addRecommendation, listRecommendations } from "@/lib/recommendations-store";

export const dynamic = "force-dynamic";

/**
 * Per-IP submit throttle. In-memory, so on serverless it only spans one warm
 * instance - that's still enough to stop casual scripted spam, and the store
 * itself caps total entries as the backstop.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recentPosts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const stamps = (recentPosts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) {
    recentPosts.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  recentPosts.set(ip, stamps);
  if (recentPosts.size > 1000) {
    for (const [key, value] of recentPosts) {
      if (value.every((t) => now - t >= WINDOW_MS)) recentPosts.delete(key);
    }
  }
  return false;
}

export async function GET() {
  try {
    const items = await listRecommendations();
    return Response.json({ items });
  } catch {
    return Response.json({ items: [], error: "unavailable" }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "too many submissions, try again later" }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const payload = body as { place?: unknown; x?: unknown; y?: unknown };
  const place = typeof payload.place === "string" ? payload.place.trim() : "";

  if (!place) {
    return Response.json({ error: "place is required" }, { status: 400 });
  }

  try {
    const item = await addRecommendation({
      place,
      x: typeof payload.x === "number" ? payload.x : null,
      y: typeof payload.y === "number" ? payload.y : null,
    });
    const items = await listRecommendations();
    return Response.json({ item, items }, { status: 201 });
  } catch {
    return Response.json({ error: "could not save" }, { status: 500 });
  }
}
