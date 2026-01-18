import type { ScrapedItem, SummaryItem, EntitySummary, EntityId } from '../sources/types.js';
import { ENTITY_NAMES } from '../sources/types.js';
import { getLLMProvider } from '../llm/index.js';
import { saveFile, getEntitySummaryPath, getDailySummaryPath, readTextFile } from '../storage/index.js';
import { getTodayString, formatDate } from '../utils/date.js';
import { createLogger } from '../utils/logger.js';
import { join } from 'path';
import { ensureEntityDirs } from '../storage/index.js';

const logger = createLogger('summarizer');

function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}

async function getPreviousEntitySummary(entityId: EntityId): Promise<string | undefined> {
  const yesterdayPath = getEntitySummaryPath(entityId, getYesterdayString());
  const content = await readTextFile(yesterdayPath);
  if (content) {
    logger.debug(`Loaded previous summary for ${entityId}`);
    // Extract just the summary portion (first section before ## Items)
    const summaryMatch = content.match(/^#[^\n]+\n\n([\s\S]*?)(?=\n## Items|\n---|\n#|$)/);
    return summaryMatch ? summaryMatch[1].trim() : content.substring(0, 2000);
  }
  return undefined;
}

async function getPreviousDailySummary(): Promise<string | undefined> {
  const yesterdayPath = getDailySummaryPath(getYesterdayString());
  const content = await readTextFile(yesterdayPath);
  if (content) {
    logger.debug('Loaded previous daily summary');
    // Return first 2000 chars to avoid token bloat
    return content.substring(0, 2000);
  }
  return undefined;
}

export async function summarizeItem(item: ScrapedItem): Promise<SummaryItem> {
  const llm = getLLMProvider();
  const content = item.content || item.description || item.title;

  logger.info(`Summarizing: ${item.title}`);
  const summary = await llm.summarizeDocument(content, item.type);

  return { item, summary };
}

export async function summarizeItems(items: ScrapedItem[]): Promise<SummaryItem[]> {
  const results: SummaryItem[] = [];

  for (const item of items) {
    try {
      const summaryItem = await summarizeItem(item);
      results.push(summaryItem);
    } catch (error) {
      logger.error(`Failed to summarize ${item.title}`, error as Error);
      results.push({ item, summary: `Summary unavailable: ${item.description || item.title}` });
    }
  }

  return results;
}

export async function generateEntitySummary(
  entityId: EntityId,
  items: SummaryItem[],
  date?: string
): Promise<EntitySummary> {
  const dateStr = date || getTodayString();
  const entityName = ENTITY_NAMES[entityId];
  const llm = getLLMProvider();

  logger.info(`Generating entity summary for ${entityName}`);

  // Get previous summary for context (helps generate fresh perspective)
  const previousSummary = await getPreviousEntitySummary(entityId);

  const summary = items.length > 0
    ? await llm.generateEntitySummary(entityName, items, previousSummary)
    : 'No new items today.';

  const entitySummary: EntitySummary = {
    entity: entityId,
    entityName,
    date: dateStr,
    items,
    summary,
  };

  const paths = await ensureEntityDirs(entityId, dateStr);

  for (const item of items) {
    const filename = `${item.item.sourceId}-${sanitize(item.item.title)}.md`;
    const content = `# ${item.item.title}\n\n**Source:** ${item.item.url}\n**Date:** ${item.item.date || 'N/A'}\n\n## Summary\n\n${item.summary}`;
    await saveFile(join(paths.summaries, filename), content);
  }

  const entityMd = formatEntitySummaryMarkdown(entitySummary);
  await saveFile(getEntitySummaryPath(entityId, dateStr), entityMd);

  return entitySummary;
}

export async function generateDailySummary(
  entitySummaries: EntitySummary[],
  date?: string
): Promise<string> {
  const dateStr = date || getTodayString();
  const llm = getLLMProvider();

  logger.info('Generating daily summary');

  // Get previous summary for context (helps generate fresh perspective)
  const previousSummary = await getPreviousDailySummary();

  const summariesWithContent = entitySummaries.filter((es) => es.items.length > 0);
  const dailySummary = summariesWithContent.length > 0
    ? await llm.generateDailySummary(summariesWithContent, previousSummary)
    : 'No new government activity today.';

  const markdown = formatDailySummaryMarkdown(dailySummary, entitySummaries, dateStr);
  await saveFile(getDailySummaryPath(dateStr), markdown);

  return markdown;
}

function formatEntitySummaryMarkdown(es: EntitySummary): string {
  let md = `# ${es.entityName} - ${es.date}\n\n`;
  md += `${es.summary}\n\n`;
  md += `## Items\n\n`;

  for (const item of es.items) {
    md += `### ${item.item.title}\n`;
    md += `- **Type:** ${item.item.type}\n`;
    md += `- **URL:** ${item.item.url}\n`;
    if (item.item.date) md += `- **Date:** ${item.item.date}\n`;
    md += `\n${item.summary}\n\n`;
  }

  return md;
}

function formatDailySummaryMarkdown(
  summary: string,
  entitySummaries: EntitySummary[],
  date: string
): string {
  let md = `# Oak Park Government Daily Summary - ${date}\n\n`;
  md += `${summary}\n\n---\n\n`;

  for (const es of entitySummaries) {
    if (es.items.length === 0) continue;
    md += `## ${es.entityName}\n\n`;
    md += `${es.summary}\n\n`;
  }

  return md;
}

function sanitize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);
}
