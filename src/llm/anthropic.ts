import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../config.js';
import type { LLMProvider } from './types.js';
import type { SourceType, SummaryItem, EntitySummary } from '../sources/types.js';
import { getDocumentPrompt, getEntitySummaryPrompt, getDailySummaryPrompt } from '../summarizer/prompts.js';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514';

  constructor() {
    this.client = new Anthropic({ apiKey: getApiKey('anthropic') });
  }

  async summarize(content: string, prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      system: prompt,
      messages: [{ role: 'user', content }],
    });
    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }

  async summarizeDocument(text: string, type: SourceType): Promise<string> {
    const prompt = getDocumentPrompt(type);
    return this.summarize(text, prompt);
  }

  async generateEntitySummary(entityName: string, items: SummaryItem[], previousSummary?: string): Promise<string> {
    const prompt = getEntitySummaryPrompt(entityName, previousSummary);
    const content = items
      .map((item, i) => `## Item ${i + 1}: ${item.item.title}\n${item.summary}`)
      .join('\n\n');
    return this.summarize(content, prompt);
  }

  async generateDailySummary(entitySummaries: EntitySummary[], previousSummary?: string): Promise<string> {
    const prompt = getDailySummaryPrompt(previousSummary);
    const content = entitySummaries
      .map((es) => `# ${es.entityName}\n${es.summary}`)
      .join('\n\n');
    return this.summarize(content, prompt);
  }
}
