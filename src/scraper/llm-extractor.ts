import * as cheerio from 'cheerio';
import { getLLMProvider } from '../llm/index.js';
import type { Source, ScrapedItem, SourceType } from '../sources/types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('llm-extractor');

const EXTRACTION_PROMPT = `You are a web scraper assistant. Extract structured data from this HTML page.

The page is from: {url}
Content type we're looking for: {type}
Entity: {entityName}

Extract ALL items that match this content type. For each item, provide:
- title: The item's title/headline (e.g., meeting body name + date like "Village Board Meeting - 1/13/2026")
- url: The full URL to the item details (look for links containing "MeetingDetail" or similar)
- date: Publication or meeting date if visible (any format)
- description: Brief description or excerpt if available

IMPORTANT: Look for table rows, list items, or repeated patterns containing meeting names, dates, and links.
For Legistar/government meeting calendars, look for patterns like:
- Body names: "Village Board", "Finance Committee", "President and Board of Trustees"
- Date columns with formats like "1/13/2026"
- Links to "MeetingDetail.aspx" pages

Return a JSON array of objects. If no items found, return an empty array [].
Only return the JSON array, no other text.

Example output:
[
  {
    "title": "President and Board of Trustees - 1/13/2026",
    "url": "https://oak-park.legistar.com/MeetingDetail.aspx?ID=1372258",
    "date": "1/13/2026",
    "description": "Regular board meeting"
  }
]`;

function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove scripts, styles, and other non-content elements
  $('script, style, noscript, iframe, svg, head, meta, link').remove();

  // Try to find the main content area
  let $content = $('table.rgMasterTable, .rgMasterTable, #gridCalendar, .list-container, main, article, .content');
  if ($content.length === 0) {
    $content = $('body');
  }

  // Get the HTML
  let cleaned = $content.html() || $('body').html() || html;

  // Remove inline styles and classes to reduce size
  cleaned = cleaned.replace(/\s*style="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*id="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*onclick="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*onmouseover="[^"]*"/g, '');

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Remove empty tags
  cleaned = cleaned.replace(/<[^>]+>\s*<\/[^>]+>/g, '');

  return cleaned.trim();
}

interface ExtractedItem {
  title: string;
  url: string;
  date?: string;
  description?: string;
}

export async function extractWithLLM(
  html: string,
  source: Source,
  baseUrl: string
): Promise<ScrapedItem[]> {
  const llm = getLLMProvider();

  // Clean and truncate HTML to avoid token limits
  const cleaned = cleanHtml(html);
  const truncatedHtml = cleaned.length > 30000 ? cleaned.substring(0, 30000) + '\n...[truncated]' : cleaned;

  logger.debug(`Cleaned HTML: ${html.length} -> ${cleaned.length} chars`);

  const prompt = EXTRACTION_PROMPT
    .replace('{url}', baseUrl)
    .replace('{type}', getTypeDescription(source.type))
    .replace('{entityName}', source.name);

  logger.info(`Using LLM extraction for ${source.id}`);

  try {
    const response = await llm.summarize(truncatedHtml, prompt);

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn('LLM returned no JSON array');
      return [];
    }

    const extracted: ExtractedItem[] = JSON.parse(jsonMatch[0]);

    return extracted.map((item) => ({
      sourceId: source.id,
      entity: source.entity,
      type: source.type,
      title: item.title,
      url: resolveUrl(item.url, baseUrl),
      date: item.date,
      description: item.description,
    }));
  } catch (error) {
    logger.error('LLM extraction failed', error as Error);
    return [];
  }
}

function getTypeDescription(type: SourceType): string {
  switch (type) {
    case 'news':
      return 'news articles, announcements, press releases';
    case 'meetings':
      return 'meeting listings, upcoming meetings, meeting schedules';
    case 'agendas':
      return 'meeting agendas, agenda documents, agenda links';
    case 'minutes':
      return 'meeting minutes, minutes documents, approved minutes';
  }
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;

  try {
    const base = new URL(baseUrl);
    if (url.startsWith('/')) {
      return `${base.protocol}//${base.host}${url}`;
    }
    return `${base.protocol}//${base.host}/${url}`;
  } catch {
    return url;
  }
}
