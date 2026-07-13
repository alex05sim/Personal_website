import {
  addRecommendation,
  hasPersistentRecommendationStore,
  listRecommendations,
  MAX_COMMENT_LENGTH,
  MAX_PLACE_LENGTH,
  MAX_VISITOR_NAME_LENGTH,
} from "@/lib/recommendations-store";

export const dynamic = "force-dynamic";

/**
 * Per-IP submit throttle. In-memory, so on serverless it only spans one warm
 * instance - that's still enough to stop casual scripted spam, and the store
 * itself caps total entries as the backstop.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recentPosts = new Map<string, number[]>();
const MAX_BODY_BYTES = 2_048;
const DEFAULT_BLOCKED_TERMS = [
  "asshole",
  "bitch",
  "bullshit",
  "cunt",
  "dick",
  "faggot",
  "fuck",
  "motherfucker",
  "nigger",
  "pussy",
  "shit",
  "slut",
  "whore",
  "kill yourself",
];

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameSiteRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function containsRestrictedContent(value: string): boolean {
  const looksLikeContactOrLink =
    /(?:https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b)/iu.test(value);
  const repeatedSpam = /(.)\1{11,}/u.test(value);
  const customBlockedPhrases = (process.env.WORLD_COMMENT_BLOCKLIST ?? "")
    .split(",")
    .filter(Boolean);
  const normalizeForModeration = (text: string) =>
    text
      .normalize("NFKD")
      .toLocaleLowerCase()
      .replace(/[4@]/g, "a")
      .replace(/0/g, "o")
      .replace(/3/g, "e")
      .replace(/[1!]/g, "i")
      .replace(/[5$]/g, "s")
      .replace(/7/g, "t")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const normalized = normalizeForModeration(value);
  const tokens = normalized.split(" ");
  const letterRuns = (normalized.match(/\b(?:[a-z]\s+){2,}[a-z]\b/g) ?? []).map((run) =>
    run.replace(/\s/g, ""),
  );
  const blockedPhrases = [...DEFAULT_BLOCKED_TERMS, ...customBlockedPhrases].map(
    normalizeForModeration,
  );
  const hasBlockedPhrase = blockedPhrases.some((phrase) => {
    if (!phrase) return false;
    if (phrase.includes(" ")) return ` ${normalized} `.includes(` ${phrase} `);
    return tokens.includes(phrase) || letterRuns.includes(phrase);
  });

  return looksLikeContactOrLink || repeatedSpam || hasBlockedPhrase;
}

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
  if (!isSameSiteRequest(request)) {
    return Response.json({ error: "cross-site submissions are not allowed" }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "content type must be application/json" }, { status: 415 });
  }

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) {
    return Response.json({ error: "submission is too large" }, { status: 413 });
  }

  let body: unknown;

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "submission is too large" }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "invalid submission" }, { status: 400 });
  }

  const payload = body as {
    visitorName?: unknown;
    place?: unknown;
    comment?: unknown;
    website?: unknown;
    x?: unknown;
    y?: unknown;
  };

  if (typeof payload.website === "string" && payload.website.trim()) {
    return Response.json({ error: "invalid submission" }, { status: 400 });
  }

  const visitorName = cleanText(payload.visitorName);
  const place = cleanText(payload.place);
  const comment = cleanText(payload.comment);

  if (!visitorName) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  if (visitorName.length > MAX_VISITOR_NAME_LENGTH) {
    return Response.json(
      { error: `name must be ${MAX_VISITOR_NAME_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }
  if (!/^[\p{L}\p{M} .'-]+$/u.test(visitorName)) {
    return Response.json({ error: "name contains unsupported characters" }, { status: 400 });
  }
  if (!place) {
    return Response.json({ error: "place is required" }, { status: 400 });
  }
  if (place.length > MAX_PLACE_LENGTH) {
    return Response.json({ error: `place must be ${MAX_PLACE_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!comment) {
    return Response.json({ error: "comment is required" }, { status: 400 });
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    return Response.json(
      { error: `comment must be ${MAX_COMMENT_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }
  if (
    containsRestrictedContent(visitorName) ||
    containsRestrictedContent(place) ||
    containsRestrictedContent(comment)
  ) {
    return Response.json(
      { error: "links, contact details, repeated spam, or blocked phrases are not allowed" },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production" && !hasPersistentRecommendationStore()) {
    return Response.json({ error: "suggestions are temporarily unavailable" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "too many submissions, try again later" }, { status: 429 });
  }

  try {
    const item = await addRecommendation({
      visitorName,
      place,
      comment,
      x: typeof payload.x === "number" ? payload.x : null,
      y: typeof payload.y === "number" ? payload.y : null,
    });
    const items = await listRecommendations();
    return Response.json({ item, items }, { status: 201 });
  } catch {
    return Response.json({ error: "could not save" }, { status: 500 });
  }
}
