#!/usr/bin/env node

import { Command } from 'commander';
import { config, type LLMProvider as LLMProviderType } from './config.js';
import { ENTITY_IDS, ENTITY_NAMES, type EntityId } from './sources/types.js';
import { getSourceById, allSources } from './sources/index.js';
import { scrapeSource, scrapeEntity, scrapeAll, closeBrowser, type ScrapeOptions } from './scraper/index.js';
import { summarizeItems, generateEntitySummary, generateDailySummary } from './summarizer/index.js';
import { clearHashes } from './storage/hashes.js';
import { getTodayString } from './utils/date.js';
import { createLogger } from './utils/logger.js';
import { generateSite } from './site/index.js';

const log = createLogger('cli');

const program = new Command();

program
  .name('oak-park-scraper')
  .description('Scrape and summarize Oak Park local government websites')
  .version('1.0.0');

program
  .command('run')
  .description('Run the full scraping and summarization pipeline')
  .option('-e, --entity <id>', 'Only scrape a specific entity')
  .option('-p, --provider <provider>', 'LLM provider to use (openai, anthropic, gemini)')
  .option('-d, --date <date>', 'Date to use for output (default: today)')
  .option('--no-llm-fallback', 'Disable LLM extraction fallback (selectors only)')
  .option('--all-items', 'Process all items, not just new ones')
  .action(async (options) => {
    const date = options.date || getTodayString();
    log.info(`Starting scrape for ${date}`);

    if (options.provider) {
      config.llmProvider = options.provider as LLMProviderType;
    }

    const scrapeOptions: ScrapeOptions = {
      date,
      useLLMFallback: options.llmFallback !== false,
      skipSeenFilter: options.allItems === true,
    };

    try {
      if (options.entity) {
        if (!ENTITY_IDS.includes(options.entity as EntityId)) {
          console.error(`Unknown entity: ${options.entity}`);
          console.error(`Valid entities: ${ENTITY_IDS.join(', ')}`);
          process.exit(1);
        }

        const entityId = options.entity as EntityId;
        log.info(`Scraping entity: ${ENTITY_NAMES[entityId]}`);

        const results = await scrapeEntity(entityId, scrapeOptions);
        const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
        const newItems = results.flatMap((r) => r.newItems);
        const seenCount = results.reduce((sum, r) => sum + r.seenCount, 0);

        log.info(`Found ${totalItems} total items, ${newItems.length} new, ${seenCount} already seen`);

        if (newItems.length > 0) {
          const summaryItems = await summarizeItems(newItems);
          await generateEntitySummary(entityId, summaryItems, date);
          log.info(`Summarized ${summaryItems.length} new items`);
          console.log(`\nEntity summary saved to: data/${entityId}/${date}/entity-summary.md`);
        } else {
          log.info('No new items to summarize');
        }
      } else {
        log.info('Scraping all entities');

        const scrapeResults = await scrapeAll(scrapeOptions);
        const entitySummaries = [];

        for (const [entityId, results] of scrapeResults) {
          const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
          const newItems = results.flatMap((r) => r.newItems);
          const seenCount = results.reduce((sum, r) => sum + r.seenCount, 0);

          log.info(`${ENTITY_NAMES[entityId]}: ${totalItems} total, ${newItems.length} new, ${seenCount} seen`);

          if (newItems.length > 0) {
            const summaryItems = await summarizeItems(newItems);
            const entitySummary = await generateEntitySummary(entityId, summaryItems, date);
            entitySummaries.push(entitySummary);
          }
        }

        if (entitySummaries.length > 0) {
          await generateDailySummary(entitySummaries, date);
          log.info('Daily summary generated');
          console.log(`\nDaily summary saved to: data/daily-summary-${date}.md`);
        } else {
          log.info('No new items across any entity');
        }

        // Always regenerate the site
        await generateSite();
        console.log(`Site generated in docs/`)
      }
    } catch (error) {
      log.error('Scrape failed', error as Error);
      process.exit(1);
    } finally {
      await closeBrowser();
    }
  });

program
  .command('test-source <sourceId>')
  .description('Test scraping a single source (with LLM fallback)')
  .option('-p, --provider <provider>', 'LLM provider to use (openai, anthropic, gemini)')
  .option('--no-llm-fallback', 'Disable LLM extraction fallback')
  .option('--skip-seen', 'Skip the seen filter for testing')
  .action(async (sourceId: string, options) => {
    const source = getSourceById(sourceId);

    if (!source) {
      console.error(`Unknown source: ${sourceId}`);
      console.error('\nAvailable sources:');
      for (const s of allSources) {
        console.error(`  ${s.id} - ${s.name} (${ENTITY_NAMES[s.entity]})`);
      }
      process.exit(1);
    }

    if (options.provider) {
      config.llmProvider = options.provider as LLMProviderType;
    }

    log.info(`Testing source: ${source.name}`);

    try {
      const result = await scrapeSource(source, {
        useLLMFallback: options.llmFallback !== false,
        skipSeenFilter: options.skipSeen === true,
      });

      console.log(`\nFound ${result.items.length} total items (${result.newItems.length} new, ${result.seenCount} seen):\n`);

      const itemsToShow = result.newItems.length > 0 ? result.newItems : result.items;
      for (const item of itemsToShow.slice(0, 5)) {
        console.log(`- ${item.title}`);
        console.log(`  URL: ${item.url}`);
        if (item.date) console.log(`  Date: ${item.date}`);
        if (item.description) console.log(`  Desc: ${item.description.substring(0, 100)}...`);
        console.log('');
      }

      if (itemsToShow.length > 5) {
        console.log(`... and ${itemsToShow.length - 5} more items`);
      }

      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach((e) => console.log(`  - ${e}`));
      }
    } catch (error) {
      log.error('Test failed', error as Error);
      process.exit(1);
    } finally {
      await closeBrowser();
    }
  });

program
  .command('clear-seen')
  .description('Clear the seen items hash store (will re-process all items on next run)')
  .action(async () => {
    await clearHashes();
    console.log('Seen items hash store cleared.');
  });

program
  .command('list-sources')
  .description('List all available sources')
  .action(() => {
    console.log('Available sources:\n');
    for (const entityId of ENTITY_IDS) {
      console.log(`${ENTITY_NAMES[entityId]}:`);
      for (const source of allSources.filter((s) => s.entity === entityId)) {
        console.log(`  - ${source.id}: ${source.name} (${source.type})`);
      }
      console.log('');
    }
  });

program
  .command('list-entities')
  .description('List all available entities')
  .action(() => {
    console.log('Available entities:\n');
    for (const entityId of ENTITY_IDS) {
      console.log(`  ${entityId}: ${ENTITY_NAMES[entityId]}`);
    }
  });

program
  .command('generate-site')
  .description('Generate the static website from existing summaries')
  .action(async () => {
    await generateSite();
    console.log('Site generated in docs/');
  });

program.parse();
