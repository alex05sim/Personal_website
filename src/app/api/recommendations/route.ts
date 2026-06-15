import { addRecommendation, listRecommendations } from "@/lib/recommendations-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listRecommendations();
    return Response.json({ items });
  } catch {
    return Response.json({ items: [], error: "unavailable" }, { status: 200 });
  }
}

export async function POST(request: Request) {
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
