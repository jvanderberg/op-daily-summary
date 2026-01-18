import * as cheerio from 'cheerio';
import type { Source, ScrapedItem } from '../sources/types.js';
import { createLogger } from '../utils/logger.js';
import { extractWithLLM } from './llm-extractor.js';

const logger = createLogger('parser');

export function parseWithSelectors(html: string, source: Source, baseUrl: string): ScrapedItem[] {
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  $(source.selectors.items).each((_, element) => {
    const $el = $(element);

    const titleEl = $el.find(source.selectors.title).first();
    const linkEl = $el.find(source.selectors.link).first();

    const title = titleEl.text().trim();
    let link = linkEl.attr('href') || '';

    if (!title || !link) {
      return;
    }

    if (link && !link.startsWith('http')) {
      const base = new URL(baseUrl);
      link = link.startsWith('/')
        ? `${base.protocol}//${base.host}${link}`
        : `${base.protocol}//${base.host}/${link}`;
    }

    const item: ScrapedItem = {
      sourceId: source.id,
      entity: source.entity,
      type: source.type,
      title,
      url: link,
    };

    if (source.selectors.date) {
      const date = $el.find(source.selectors.date).text().trim();
      if (date) {
        item.date = date;
      }
    }

    if (source.selectors.description) {
      const description = $el.find(source.selectors.description).text().trim();
      if (description) {
        item.description = description;
      }
    }

    items.push(item);
  });

  logger.info(`Selector parsing: ${items.length} items from ${source.id}`);
  return items;
}

export async function parseSourcePage(
  html: string,
  source: Source,
  baseUrl: string,
  useLLMFallback = true
): Promise<ScrapedItem[]> {
  // Try CSS selectors first (fast, free)
  const selectorItems = parseWithSelectors(html, source, baseUrl);

  if (selectorItems.length > 0) {
    return selectorItems;
  }

  // Fall back to LLM extraction if selectors found nothing
  if (useLLMFallback) {
    logger.info(`Selectors returned 0 items, falling back to LLM for ${source.id}`);
    return extractWithLLM(html, source, baseUrl);
  }

  return [];
}

export function extractTextContent(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside').remove();
  const mainContent = $('main, article, .content, #content, .entry-content').first();
  const text = mainContent.length ? mainContent.text() : $('body').text();
  return text.replace(/\s+/g, ' ').trim();
}

export function findDocumentLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href$=".pdf"], a[href*=".pdf?"]').each((_, el) => {
    let href = $(el).attr('href');
    if (href) {
      if (!href.startsWith('http')) {
        const base = new URL(baseUrl);
        href = href.startsWith('/')
          ? `${base.protocol}//${base.host}${href}`
          : `${base.protocol}//${base.host}/${href}`;
      }
      links.push(href);
    }
  });

  return [...new Set(links)];
}
