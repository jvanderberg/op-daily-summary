import OpenAI from 'openai';
import { getApiKey } from '../config.js';
import type { LLMProvider } from './types.js';
import type { SourceType, SummaryItem, EntitySummary } from '../sources/types.js';
import { getDocumentPrompt, getEntitySummaryPrompt, getDailySummaryPrompt } from '../summarizer/prompts.js';

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;
    private model = 'gpt-4o-mini';

    constructor() {
        this.client = new OpenAI({ apiKey: getApiKey('openai') });
    }

    async summarize(content: string, prompt: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content },
            ],
            max_tokens: 1000,
        });
        return response.choices[0]?.message?.content || '';
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
