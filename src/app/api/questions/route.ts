import { addQuestion, hasPersistentQuestionStore, MAX_QUESTION_LENGTH } from "@/lib/questions-store";

export const dynamic = "force-dynamic";

/**
 * Intake for the /me black hole. Mirrors the hardening on the recommendations
 * route: same-site only, JSON only, size-capped, honeypot, sanitized, filtered
 * for profanity/links/spam, per-IP rate limited, and fail-closed in production
 * until the persistent store is configured.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recentPosts = new Map<string, number[]>();
const MAX_BODY_BYTES = 1_024;
const BLOCKED_TERMS = [
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
  // strip control + bidi-override codepoints without exotic regex literals
  const stripped = Array.from(value.normalize("NFKC"))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      const isControl =
        code <= 0x08 ||
        code === 0x0b ||
        code === 0x0c ||
        (code >= 0x0e && code <= 0x1f) ||
        (code >= 0x7f && code <= 0x9f);
      const isBidi = (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
      return !isControl && !isBidi;
    })
    .join("");
  return stripped.replace(/\s+/g, " ").trim();
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
  const looksLikeContactOrLink = /(?:https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b)/iu.test(value);
  const repeatedSpam = /(.)\1{11,}/u.test(value);
  const custom = (process.env.WORLD_COMMENT_BLOCKLIST ?? "").split(",").filter(Boolean);
  const normalize = (text: string) =>
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
  const normalized = normalize(value);
  const tokens = normalized.split(" ");
  const blocked = [...BLOCKED_TERMS, ...custom].map(normalize);
  const hasBlocked = blocked.some((phrase) => {
    if (!phrase) return false;
    if (phrase.includes(" ")) return ` ${normalized} `.includes(` ${phrase} `);
    return tokens.includes(phrase);
  });
  return looksLikeContactOrLink || repeatedSpam || hasBlocked;
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

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) {
    return Response.json({ error: "cross-site submissions are not allowed" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "content type must be application/json" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: "submission is too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "submission is too large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "invalid submission" }, { status: 400 });
  }

  const payload = body as { question?: unknown; website?: unknown };
  if (typeof payload.website === "string" && payload.website.trim()) {
    return Response.json({ error: "invalid submission" }, { status: 400 });
  }

  const question = cleanText(payload.question);
  if (!question) {
    return Response.json({ error: "a question is required" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { error: `questions must be ${MAX_QUESTION_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }
  if (containsRestrictedContent(question)) {
    return Response.json(
      { error: "links, contact details, spam, or blocked phrases are not allowed" },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production" && !hasPersistentQuestionStore()) {
    return Response.json({ error: "the black hole is temporarily closed" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "too many questions, try again later" }, { status: 429 });
  }

  try {
    await addQuestion(question);
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "could not save" }, { status: 500 });
  }
}
