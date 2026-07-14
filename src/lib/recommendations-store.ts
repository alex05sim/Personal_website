import { promises as fs } from "fs";
import os from "os";
import path from "path";

/**
 * Shared store for World-page place recommendations so visitors see each other's
 * submissions.
 *
 * Two backends, selected automatically:
 *   1. A Redis REST API (Upstash / Vercel KV) when KV_REST_API_URL + KV_REST_API_TOKEN
 *      are set - this is what you want in production on serverless hosting.
 *   2. A local JSON file in the OS temp dir otherwise - works for `next dev` and
 *      any long-running Node server. Kept outside the project tree on purpose so
 *      writes don't trip the dev file-watcher into rebuilding. (Ephemeral on
 *      serverless; set up KV for prod.)
 */

export type Recommendation = {
  id: string;
  visitorName: string;
  place: string;
  comment: string;
  /** Geographic pin (degrees) placed by clicking the 3D globe. */
  lat: number | null;
  lon: number | null;
  /** Legacy screen-percent pin fields from the old overlay system; unused now. */
  x: number | null;
  y: number | null;
  createdAt: number;
};

const MAX_ENTRIES = 200;
export const MAX_PLACE_LENGTH = 80;
export const MAX_COMMENT_LENGTH = 280;
export const MAX_VISITOR_NAME_LENGTH = 40;
const REDIS_KEY = "world:recommendations";

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

export function hasPersistentRecommendationStore(): boolean {
  return useRedis;
}

// ---- Redis REST backend (Upstash / Vercel KV) ---------------------------------
async function redisCommand<T>(command: Array<string | number>): Promise<T> {
  const response = await fetch(redisUrl as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KV request failed: ${response.status}`);
  }

  const data = (await response.json()) as { result: T };
  return data.result;
}

async function redisList(): Promise<Recommendation[]> {
  const items = await redisCommand<string[]>(["LRANGE", REDIS_KEY, 0, MAX_ENTRIES - 1]);
  return (items ?? [])
    .map((item) => {
      try {
        return parseRecommendation(JSON.parse(item));
      } catch {
        return null;
      }
    })
    .filter((item): item is Recommendation => item !== null);
}

async function redisAdd(rec: Recommendation): Promise<void> {
  await redisCommand(["LPUSH", REDIS_KEY, JSON.stringify(rec)]);
  await redisCommand(["LTRIM", REDIS_KEY, 0, MAX_ENTRIES - 1]);
}

// ---- File backend (dev / persistent Node host) --------------------------------
const dataDir = path.join(os.tmpdir(), "portfolio-site");
const dataFile = path.join(dataDir, "recommendations.json");

async function fileList(): Promise<Recommendation[]> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const items = JSON.parse(raw) as unknown;
    return Array.isArray(items)
      ? items.map(parseRecommendation).filter((item): item is Recommendation => item !== null)
      : [];
  } catch {
    return [];
  }
}

async function fileAdd(rec: Recommendation): Promise<void> {
  const list = await fileList();
  const next = [rec, ...list].slice(0, MAX_ENTRIES);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(next, null, 2), "utf8");
}

// ---- Public API ---------------------------------------------------------------
export async function listRecommendations(): Promise<Recommendation[]> {
  return useRedis ? redisList() : fileList();
}

function clampRange(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : null;
}

export async function addRecommendation(input: {
  visitorName: string;
  place: string;
  comment?: string;
  lat?: number | null;
  lon?: number | null;
}): Promise<Recommendation> {
  const rec: Recommendation = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    visitorName: input.visitorName.trim().slice(0, MAX_VISITOR_NAME_LENGTH),
    place: input.place.trim().slice(0, MAX_PLACE_LENGTH),
    comment: input.comment?.trim().slice(0, MAX_COMMENT_LENGTH) ?? "",
    lat: clampRange(input.lat, -90, 90),
    lon: clampRange(input.lon, -180, 180),
    x: null,
    y: null,
    createdAt: Date.now(),
  };

  if (useRedis) {
    await redisAdd(rec);
  } else {
    await fileAdd(rec);
  }

  return rec;
}

/** Validate records read from storage and migrate older place-only entries. */
function parseRecommendation(value: unknown): Recommendation | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<Recommendation>;
  if (
    typeof item.id !== "string" ||
    typeof item.place !== "string" ||
    typeof item.createdAt !== "number" ||
    !Number.isFinite(item.createdAt)
  ) {
    return null;
  }

  return {
    id: item.id.slice(0, 100),
    visitorName:
      typeof item.visitorName === "string" && item.visitorName.trim()
        ? item.visitorName.trim().slice(0, MAX_VISITOR_NAME_LENGTH)
        : "Visitor",
    place: item.place.slice(0, MAX_PLACE_LENGTH),
    comment: typeof item.comment === "string" ? item.comment.slice(0, MAX_COMMENT_LENGTH) : "",
    lat: clampRange(item.lat, -90, 90),
    lon: clampRange(item.lon, -180, 180),
    x: clampRange(item.x, 0, 100),
    y: clampRange(item.y, 0, 100),
    createdAt: item.createdAt,
  };
}
