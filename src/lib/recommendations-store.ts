import { promises as fs } from "fs";
import path from "path";

/**
 * Shared store for World-page place recommendations so visitors see each other's
 * submissions.
 *
 * Two backends, selected automatically:
 *   1. A Redis REST API (Upstash / Vercel KV) when KV_REST_API_URL + KV_REST_API_TOKEN
 *      are set — this is what you want in production on serverless hosting.
 *   2. A local JSON file under `.data/` otherwise — works for `next dev` and any
 *      long-running Node server. (Ephemeral on serverless; set up KV for prod.)
 */

export type Recommendation = {
  id: string;
  place: string;
  x: number | null;
  y: number | null;
  createdAt: number;
};

const MAX_ENTRIES = 200;
const MAX_PLACE_LENGTH = 80;
const REDIS_KEY = "world:recommendations";

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

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
        return JSON.parse(item) as Recommendation;
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
const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "recommendations.json");

async function fileList(): Promise<Recommendation[]> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    return JSON.parse(raw) as Recommendation[];
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

export async function addRecommendation(input: {
  place: string;
  x?: number | null;
  y?: number | null;
}): Promise<Recommendation> {
  const clamp = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;

  const rec: Recommendation = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    place: input.place.trim().slice(0, MAX_PLACE_LENGTH),
    x: clamp(input.x),
    y: clamp(input.y),
    createdAt: Date.now(),
  };

  if (useRedis) {
    await redisAdd(rec);
  } else {
    await fileAdd(rec);
  }

  return rec;
}
