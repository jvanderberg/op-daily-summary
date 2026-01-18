import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface Config {
  llmProvider: LLMProvider;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  dataDir: string;
}

export const config: Config = {
  llmProvider: (process.env.LLM_PROVIDER as LLMProvider) || 'anthropic',
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  dataDir: process.env.DATA_DIR || './data',
};

export function getApiKey(provider: LLMProvider): string {
  switch (provider) {
    case 'openai':
      if (!config.openaiApiKey) throw new Error('OPENAI_API_KEY not set');
      return config.openaiApiKey;
    case 'anthropic':
      if (!config.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not set');
      return config.anthropicApiKey;
    case 'gemini':
      if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY not set');
      return config.geminiApiKey;
  }
}
