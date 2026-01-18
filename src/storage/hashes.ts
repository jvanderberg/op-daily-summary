import { createHash } from 'crypto';
import { join } from 'path';
import { config } from '../config.js';
import { readJson, saveJson, ensureDir } from './index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('hashes');

interface HashStore {
  // URL -> content hash
  items: Record<string, string>;
  // Last updated timestamp
  updated: string;
}

const HASH_FILE = 'seen_hashes.json';

let hashStore: HashStore | null = null;

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

export function hashItem(url: string, title: string, content?: string): string {
  const toHash = `${url}|${title}|${content || ''}`;
  return hashContent(toHash);
}

async function getHashFilePath(): Promise<string> {
  await ensureDir(config.dataDir);
  return join(config.dataDir, HASH_FILE);
}

export async function loadHashStore(): Promise<HashStore> {
  if (hashStore) return hashStore;

  const filePath = await getHashFilePath();
  const stored = await readJson<HashStore>(filePath);

  hashStore = stored || { items: {}, updated: new Date().toISOString() };
  logger.debug(`Loaded ${Object.keys(hashStore.items).length} known hashes`);

  return hashStore;
}

export async function saveHashStore(): Promise<void> {
  if (!hashStore) return;

  hashStore.updated = new Date().toISOString();
  const filePath = await getHashFilePath();
  await saveJson(filePath, hashStore);
  logger.debug(`Saved ${Object.keys(hashStore.items).length} hashes`);
}

export async function isItemSeen(url: string, hash: string): Promise<boolean> {
  const store = await loadHashStore();
  return store.items[url] === hash;
}

export async function markItemSeen(url: string, hash: string): Promise<void> {
  const store = await loadHashStore();
  store.items[url] = hash;
}

export async function filterNewItems<T extends { url: string; title: string; content?: string }>(
  items: T[]
): Promise<{ newItems: T[]; seenCount: number }> {
  const store = await loadHashStore();
  const newItems: T[] = [];
  let seenCount = 0;

  for (const item of items) {
    const hash = hashItem(item.url, item.title, item.content);
    const existingHash = store.items[item.url];

    if (existingHash === hash) {
      seenCount++;
      logger.debug(`Skipping seen item: ${item.title}`);
    } else {
      newItems.push(item);
      store.items[item.url] = hash;
    }
  }

  if (newItems.length > 0) {
    await saveHashStore();
  }

  logger.info(`Filtered: ${newItems.length} new, ${seenCount} seen`);
  return { newItems, seenCount };
}

export async function clearHashes(): Promise<void> {
  hashStore = { items: {}, updated: new Date().toISOString() };
  await saveHashStore();
  logger.info('Hash store cleared');
}
