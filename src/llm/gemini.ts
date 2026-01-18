import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../config.js';
import type { LLMProvider } from './types.js';
import type { SourceType, SummaryItem, EntitySummary } from '../sources/types.js';
import { getDocumentPrompt, getEntitySummaryPrompt, getDailySummaryPrompt } from '../summarizer/prompts.js';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model = 'gemini-1.5-flash';

  constructor() {
    this.client = new GoogleGenerativeAI(getApiKey('gemini'));
  }

  async summarize(content: string, prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(`${prompt}\n\n${content}`);
    return result.response.text();
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
