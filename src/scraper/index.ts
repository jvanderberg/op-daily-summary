import type { Source, ScrapedItem, EntityId } from '../sources/types.js';
import { allSources, getSourcesByEntity } from '../sources/index.js';
import { fetchHtml, closeBrowser } from './fetcher.js';
import { parseSourcePage, extractTextContent, findDocumentLinks } from './parser.js';
import { downloadAndExtract } from '../documents/index.js';
import { ensureEntityDirs } from '../storage/index.js';
import { saveFile } from '../storage/index.js';
import { filterNewItems, saveHashStore } from '../storage/hashes.js';
import { join } from 'path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('scraper');

export interface ScrapeResult {
  source: Source;
  items: ScrapedItem[];
  newItems: ScrapedItem[];
  seenCount: number;
  errors: string[];
}

export interface ScrapeOptions {
  date?: string;
  useLLMFallback?: boolean;
  skipSeenFilter?: boolean;
}

export async function scrapeSource(source: Source, options: ScrapeOptions = {}): Promise<ScrapeResult> {
  const { date, useLLMFallback = true, skipSeenFilter = false } = options;
  const errors: string[] = [];
  const items: ScrapedItem[] = [];

  try {
    logger.info(`Scraping ${source.name} from ${source.url}`);
    const html = await fetchHtml(source.url, source.requiresBrowser);

    const paths = await ensureEntityDirs(source.entity, date);
    await saveFile(join(paths.raw, `${source.id}.html`), html);

    // Hybrid extraction: selectors first, LLM fallback if needed
    const parsedItems = await parseSourcePage(html, source, source.url, useLLMFallback);

    for (const item of parsedItems) {
      try {
        const itemHtml = await fetchHtml(item.url, source.requiresBrowser);
        item.content = extractTextContent(itemHtml);

        const docLinks = findDocumentLinks(itemHtml, item.url);
        if (docLinks.length > 0) {
          const doc = await downloadAndExtract(docLinks[0], paths.downloads);
          if (doc) {
            item.documentUrl = doc.url;
            item.documentPath = doc.localPath;
            if (doc.text) {
              item.content = doc.text;
            }
          }
        }

        items.push(item);
      } catch (error) {
        const msg = `Failed to fetch item ${item.title}: ${(error as Error).message}`;
        logger.warn(msg);
        errors.push(msg);
        items.push(item);
      }
    }
  } catch (error) {
    const msg = `Failed to scrape source ${source.id}: ${(error as Error).message}`;
    logger.error(msg);
    errors.push(msg);
  }

  // Filter out already-seen items
  let newItems = items;
  let seenCount = 0;

  if (!skipSeenFilter && items.length > 0) {
    const filtered = await filterNewItems(items);
    newItems = filtered.newItems;
    seenCount = filtered.seenCount;
  }

  return { source, items, newItems, seenCount, errors };
}

export async function scrapeEntity(entityId: EntityId, options: ScrapeOptions = {}): Promise<ScrapeResult[]> {
  const sources = getSourcesByEntity(entityId);
  const results: ScrapeResult[] = [];

  for (const source of sources) {
    const result = await scrapeSource(source, options);
    results.push(result);
  }

  return results;
}

export async function scrapeAll(options: ScrapeOptions = {}): Promise<Map<EntityId, ScrapeResult[]>> {
  const results = new Map<EntityId, ScrapeResult[]>();

  const entities = new Set(allSources.map((s) => s.entity));

  for (const entity of entities) {
    const entityResults = await scrapeEntity(entity, options);
    results.set(entity, entityResults);
  }

  // Ensure hashes are saved at the end
  await saveHashStore();
  await closeBrowser();

  return results;
}

export { closeBrowser };
