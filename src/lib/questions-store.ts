import { promises as fs } from "fs";
import os from "os";
import path from "path";

/**
 * Store for questions visitors throw into the /me black hole. Submissions are
 * NOT displayed publicly - they land here for Alex to read; good ones get
 * promoted into the preloaded disk by editing me-data.ts.
 *
 * Same backend split as the recommendations store: Upstash/Vercel KV REST in
 * production, a local JSON file for dev.
 */

export type VisitorQuestion = {
  id: string;
  question: string;
  createdAt: number;
};

const MAX_ENTRIES = 500;
export const MAX_QUESTION_LENGTH = 200;
const REDIS_KEY = "me:questions";

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

export function hasPersistentQuestionStore(): boolean {
  return useRedis;
}

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

const dataDir = path.join(os.tmpdir(), "portfolio-site");
const dataFile = path.join(dataDir, "me-questions.json");

async function fileList(): Promise<VisitorQuestion[]> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const items = JSON.parse(raw) as unknown;
    return Array.isArray(items) ? (items as VisitorQuestion[]) : [];
  } catch {
    return [];
  }
}

export async function addQuestion(question: string): Promise<VisitorQuestion> {
  const rec: VisitorQuestion = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    question: question.trim().slice(0, MAX_QUESTION_LENGTH),
    createdAt: Date.now(),
  };

  if (useRedis) {
    await redisCommand(["LPUSH", REDIS_KEY, JSON.stringify(rec)]);
    await redisCommand(["LTRIM", REDIS_KEY, 0, MAX_ENTRIES - 1]);
  } else {
    const list = await fileList();
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify([rec, ...list].slice(0, MAX_ENTRIES), null, 2), "utf8");
  }

  return rec;
}
