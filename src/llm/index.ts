import { config, type LLMProvider as LLMProviderType } from '../config.js';
import type { LLMProvider } from './types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';

let cachedProvider: LLMProvider | null = null;
let cachedProviderType: LLMProviderType | null = null;

export function getLLMProvider(provider?: LLMProviderType): LLMProvider {
  const providerType = provider || config.llmProvider;

  if (cachedProvider && cachedProviderType === providerType) {
    return cachedProvider;
  }

  switch (providerType) {
    case 'openai':
      cachedProvider = new OpenAIProvider();
      break;
    case 'anthropic':
      cachedProvider = new AnthropicProvider();
      break;
    case 'gemini':
      cachedProvider = new GeminiProvider();
      break;
    default:
      throw new Error(`Unknown LLM provider: ${providerType}`);
  }

  cachedProviderType = providerType;
  return cachedProvider;
}

export type { LLMProvider } from './types.js';
