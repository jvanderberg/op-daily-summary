import type { SourceType, SummaryItem, EntitySummary } from '../sources/types.js';

export interface LLMProvider {
  summarize(content: string, prompt: string): Promise<string>;
  summarizeDocument(text: string, type: SourceType): Promise<string>;
  generateEntitySummary(entityName: string, items: SummaryItem[], previousSummary?: string): Promise<string>;
  generateDailySummary(entitySummaries: EntitySummary[], previousSummary?: string): Promise<string>;
}
