import { mkdir, writeFile, readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { config } from '../config.js';
import { getTodayString } from '../utils/date.js';
import type { EntityId } from '../sources/types.js';

export interface StoragePaths {
  base: string;
  downloads: string;
  raw: string;
  summaries: string;
}

export function getEntityPaths(entityId: EntityId, date?: string): StoragePaths {
  const dateStr = date || getTodayString();
  const base = join(config.dataDir, entityId, dateStr);
  return {
    base,
    downloads: join(base, 'downloads'),
    raw: join(base, 'raw'),
    summaries: join(base, 'summaries'),
  };
}

export async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function ensureEntityDirs(entityId: EntityId, date?: string): Promise<StoragePaths> {
  const paths = getEntityPaths(entityId, date);
  await Promise.all([
    ensureDir(paths.downloads),
    ensureDir(paths.raw),
    ensureDir(paths.summaries),
  ]);
  return paths;
}

export async function saveFile(filePath: string, content: string | Buffer): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content);
}

export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function saveJson(filePath: string, data: unknown): Promise<void> {
  await saveFile(filePath, JSON.stringify(data, null, 2));
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  const content = await readTextFile(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    return await readdir(dirPath);
  } catch {
    return [];
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getDailySummaryPath(date?: string): string {
  const dateStr = date || getTodayString();
  return join(config.dataDir, `daily-summary-${dateStr}.md`);
}

export function getEntitySummaryPath(entityId: EntityId, date?: string): string {
  const paths = getEntityPaths(entityId, date);
  return join(paths.base, 'entity-summary.md');
}
