import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SourceType } from '../sources/types.js';

interface PromptsConfig {
  document: Record<SourceType, string>;
  entitySummary: string;
  dailySummary: string;
}

// Default prompts (used if prompts.json doesn't exist)
const DEFAULT_PROMPTS: PromptsConfig = {
  document: {
    news: `Summarize this news article in 2-3 paragraphs. Focus on:
- The main announcement or event
- Key details (who, what, when, where)
- Impact on Oak Park residents
Keep the summary factual and concise.`,

    meetings: `Summarize this meeting information. Include:
- Meeting type and date
- Key agenda items or topics
- Any notable decisions or discussions
- Action items if mentioned`,

    agendas: `Summarize this meeting agenda. Include:
- Meeting type, date, and location
- Key agenda items (prioritize items of public interest)
- Any public hearing or comment opportunities
- Notable proposals or decisions to be made`,

    minutes: `Summarize these meeting minutes in 2-4 paragraphs. Include:
- Key decisions made
- Important discussions and outcomes
- Vote results on significant matters
- Action items and next steps
Focus on items that affect Oak Park residents.`,
  },
  entitySummary: `Create a concise daily summary for {entityName} based on the following items.
Group related items together and highlight the most important news and decisions.
Use bullet points for clarity. Keep it to 1-2 paragraphs followed by bullet points.

{previousSummaryContext}`,
  dailySummary: `Create a comprehensive daily summary of Oak Park local government activity.
This summary covers multiple entities: Village, Township, School Districts, Park District, and Library.

Organize by entity but prioritize the most newsworthy items across all entities.
Start with a brief executive summary (2-3 sentences) of the day's most important items.
Then provide entity-by-entity highlights.

Keep the total summary under 500 words.

{previousSummaryContext}`,
};

let loadedPrompts: PromptsConfig | null = null;

function loadPrompts(): PromptsConfig {
  if (loadedPrompts) return loadedPrompts;

  const promptsPath = join(process.cwd(), 'prompts.json');

  if (existsSync(promptsPath)) {
    try {
      const content = readFileSync(promptsPath, 'utf-8');
      loadedPrompts = JSON.parse(content) as PromptsConfig;
      return loadedPrompts;
    } catch (error) {
      console.warn('Failed to load prompts.json, using defaults');
    }
  }

  loadedPrompts = DEFAULT_PROMPTS;
  return loadedPrompts;
}

export function getDocumentPrompt(type: SourceType): string {
  const prompts = loadPrompts();
  return prompts.document[type] || DEFAULT_PROMPTS.document[type];
}

export function getEntitySummaryPrompt(entityName: string, previousSummary?: string): string {
  const prompts = loadPrompts();
  let prompt = prompts.entitySummary || DEFAULT_PROMPTS.entitySummary;

  prompt = prompt.replace('{entityName}', entityName);

  if (previousSummary) {
    const context = `IMPORTANT: Here is yesterday's summary for context. Generate a FRESH perspective - avoid repeating the same phrasing or structure:\n\n---\n${previousSummary}\n---\n\nNow create today's summary with fresh language:`;
    prompt = prompt.replace('{previousSummaryContext}', context);
  } else {
    prompt = prompt.replace('{previousSummaryContext}', '');
  }

  return prompt.trim();
}

export function getDailySummaryPrompt(previousSummary?: string): string {
  const prompts = loadPrompts();
  let prompt = prompts.dailySummary || DEFAULT_PROMPTS.dailySummary;

  if (previousSummary) {
    const context = `IMPORTANT: Here is yesterday's summary for context. Generate a FRESH perspective - avoid repeating the same phrasing or structure:\n\n---\n${previousSummary}\n---\n\nNow create today's summary with fresh language:`;
    prompt = prompt.replace('{previousSummaryContext}', context);
  } else {
    prompt = prompt.replace('{previousSummaryContext}', '');
  }

  return prompt.trim();
}

// Keep these for backwards compatibility
export const DOCUMENT_PROMPTS = DEFAULT_PROMPTS.document;
export const ENTITY_SUMMARY_PROMPT = DEFAULT_PROMPTS.entitySummary;
export const DAILY_SUMMARY_PROMPT = DEFAULT_PROMPTS.dailySummary;
