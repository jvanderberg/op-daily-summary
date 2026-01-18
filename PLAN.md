# Oak Park Government Scraper - Implementation Plan

## Overview
A TypeScript-based automated system that daily scrapes Oak Park, IL local government websites for news, meeting agendas, and minutes. Downloads new content, summarizes via LLM (OpenAI/Anthropic/Gemini), and produces hierarchical markdown summaries.

## Target Entities
1. **Village of Oak Park** - oak-park.us
2. **Oak Park Township** - oakparktownship.org
3. **School District 97** - op97.org
4. **OPRF High School District 200** - oprfhs.org
5. **Park District of Oak Park** - pdop.org
6. **Oak Park Public Library** - oppl.org

## Output Structure
```
./data/
  village-of-oak-park/
    2026-01-17/
      downloads/        # PDFs and documents
      raw/              # Raw scraped content
      summaries/        # Individual item summaries
      entity-summary.md # Daily entity summary
  oak-park-township/
    2026-01-17/
      ...
  ...
  daily-summary-2026-01-17.md  # Village-wide summary
```

## Architecture

### Project Structure
```
src/
  index.ts              # CLI entry point
  config.ts             # Configuration and env vars
  sources/
    index.ts            # Source registry
    types.ts            # Source type definitions
    village.ts          # Village of Oak Park sources
    township.ts         # Oak Park Township sources
    district97.ts       # School District 97 sources
    district200.ts      # OPRF HS District 200 sources
    park-district.ts    # Park District sources
    library.ts          # Library sources
  scraper/
    index.ts            # Main scraper orchestrator
    fetcher.ts          # HTTP/browser fetching
    parser.ts           # HTML parsing utilities
  documents/
    index.ts            # Document handler
    pdf.ts              # PDF text extraction
  llm/
    index.ts            # LLM provider factory
    types.ts            # LLM interface definitions
    openai.ts           # OpenAI implementation
    anthropic.ts        # Anthropic implementation
    gemini.ts           # Gemini implementation
  summarizer/
    index.ts            # Summarization orchestrator
    prompts.ts          # LLM prompt templates
  storage/
    index.ts            # File operations
  utils/
    date.ts             # Date formatting utilities
    logger.ts           # Logging utility
```

### Dependencies
```json
{
  "dependencies": {
    "playwright": "^1.40.0",      // Browser automation for JS-heavy sites
    "cheerio": "^1.0.0",          // HTML parsing
    "pdf-parse": "^1.1.1",        // PDF text extraction
    "openai": "^4.20.0",          // OpenAI SDK
    "@anthropic-ai/sdk": "^0.30.0", // Anthropic SDK
    "@google/generative-ai": "^0.21.0", // Gemini SDK
    "commander": "^11.1.0",       // CLI framework
    "dotenv": "^16.3.1",          // Environment variables
    "axios": "^1.6.2"             // HTTP client
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "tsx": "^4.6.0"               // TypeScript execution
  }
}
```

### Configuration (.env)
```
LLM_PROVIDER=anthropic          # openai | anthropic | gemini
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

### Source Definition Example
```typescript
// sources/types.ts
interface Source {
  id: string;
  entity: EntityId;
  name: string;
  type: 'news' | 'meetings' | 'agendas' | 'minutes';
  url: string;
  // Deterministic selectors for scraping
  selectors: {
    items: string;           // CSS selector for list items
    title: string;           // Title within item
    link: string;            // Link within item
    date?: string;           // Date within item
    description?: string;    // Description within item
  };
  // Optional: for paginated content
  pagination?: {
    nextSelector: string;
    maxPages: number;
  };
}
```

### LLM Provider Interface
```typescript
interface LLMProvider {
  summarize(content: string, prompt: string): Promise<string>;
  summarizeDocument(text: string, type: 'minutes' | 'agenda' | 'news'): Promise<string>;
  generateEntitySummary(items: SummaryItem[]): Promise<string>;
  generateDailySummary(entitySummaries: EntitySummary[]): Promise<string>;
}
```

## Implementation Steps

### Phase 1: Project Setup
1. Initialize npm project with TypeScript
2. Create directory structure
3. Configure tsconfig.json
4. Install dependencies
5. Set up .env.example

### Phase 2: Core Infrastructure
1. Implement config.ts with env loading
2. Implement storage module for file operations
3. Implement logger utility
4. Implement date utilities

### Phase 3: LLM Integration
1. Define LLM provider interface
2. Implement OpenAI provider
3. Implement Anthropic provider
4. Implement Gemini provider
5. Create provider factory

### Phase 4: Source Definitions
1. Define source types and interfaces
2. Research and implement Village of Oak Park sources
3. Research and implement remaining entity sources
4. Create source registry

### Phase 5: Scraping Engine
1. Implement HTTP fetcher with Playwright for JS sites
2. Implement HTML parser with Cheerio
3. Implement PDF downloader and text extractor
4. Create scraper orchestrator

### Phase 6: Summarization Pipeline
1. Define summarization prompts
2. Implement item summarizer
3. Implement entity summary generator
4. Implement daily village summary generator

### Phase 7: CLI & Runner
1. Implement CLI with commander
2. Add commands: `run`, `run --entity <id>`, `test-source <id>`
3. Implement main orchestration loop
4. Add date handling (overwrite today's data on re-run)

### Phase 8: Testing & Polish
1. Test each source against live sites
2. Handle edge cases (missing data, network errors)
3. Add retry logic for failed requests
4. Create README with usage instructions

## CLI Usage
```bash
# Run full daily scrape
npx tsx src/index.ts run

# Run for specific entity
npx tsx src/index.ts run --entity village-of-oak-park

# Test a specific source
npx tsx src/index.ts test-source village-news

# Use specific LLM provider
npx tsx src/index.ts run --provider openai
```

## Key Design Decisions
1. **Playwright over Puppeteer** - Better cross-browser support, actively maintained
2. **Deterministic selectors** - All scraping logic in TypeScript, not config-driven
3. **Provider abstraction** - Easy to switch LLM providers via env or CLI flag
4. **Date-based idempotency** - Re-running same day overwrites, enabling safe retries

## Verification
1. Run `npm install` to install dependencies
2. Set up `.env` with at least one LLM provider API key
3. Run `npx tsx src/index.ts test-source village-news` to test a single source
4. Run `npx tsx src/index.ts run` to execute full scrape
5. Check `./data/` for generated summaries and downloads
