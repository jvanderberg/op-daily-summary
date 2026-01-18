import { marked } from 'marked';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';

const DOCS_DIR = 'docs';
const DATA_DIR = 'data';

const HTML_TEMPLATE = (title: string, content: string, nav: string = '') => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Oak Park Local Government Updates</title>
  <style>
    :root {
      --bg: #fafafa;
      --text: #333;
      --accent: #2563eb;
      --border: #e5e7eb;
      --card-bg: #fff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --text: #e5e5e5;
        --accent: #60a5fa;
        --border: #333;
        --card-bg: #252525;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
      background: var(--bg);
      color: var(--text);
    }
    h1, h2, h3 { line-height: 1.3; }
    h1 { border-bottom: 2px solid var(--accent); padding-bottom: 0.5rem; }
    a { color: var(--accent); }
    nav { margin-bottom: 2rem; }
    nav a { margin-right: 1rem; }
    .summary-list { list-style: none; padding: 0; }
    .summary-list li {
      padding: 1rem;
      margin-bottom: 1rem;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .summary-list a { text-decoration: none; font-weight: 600; }
    .summary-list .date { color: #888; font-size: 0.9rem; }
    .entity-section { margin: 2rem 0; }
    .entity-section h2 { color: var(--accent); }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: #888; }
  </style>
</head>
<body>
  <nav>${nav}</nav>
  <main>${content}</main>
  <footer>Oak Park Local Government Updates - Auto-generated from public sources</footer>
</body>
</html>`;

interface DailySummary {
  date: string;
  filename: string;
  content: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getDailySummaries(): DailySummary[] {
  const summaries: DailySummary[] = [];

  if (!fs.existsSync(DATA_DIR)) {
    return summaries;
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('daily-summary-') && f.endsWith('.md'))
    .sort()
    .reverse();

  for (const file of files) {
    const dateMatch = file.match(/daily-summary-(\d{4}-\d{2}-\d{2})\.md/);
    if (dateMatch) {
      const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
      summaries.push({
        date: dateMatch[1],
        filename: file,
        content
      });
    }
  }

  return summaries;
}

function generateIndexPage(summaries: DailySummary[]): string {
  const listItems = summaries.map(s =>
    `<li>
      <a href="${s.date}.html">${formatDate(s.date)}</a>
      <div class="date">${s.date}</div>
    </li>`
  ).join('\n');

  const content = `
    <h1>Oak Park Local Government Updates</h1>
    <p>Daily summaries of news and updates from Oak Park village, township, schools, park district, and library.</p>
    <h2>Recent Summaries</h2>
    <ul class="summary-list">
      ${listItems || '<li>No summaries yet.</li>'}
    </ul>
  `;

  return HTML_TEMPLATE('Home', content);
}

function generateSummaryPage(summary: DailySummary): string {
  const htmlContent = marked.parse(summary.content) as string;
  const nav = '<a href="index.html">&larr; Back to all summaries</a>';

  return HTML_TEMPLATE(formatDate(summary.date), htmlContent, nav);
}

export async function generateSite(): Promise<void> {
  logger.info('site', 'Generating static site...');

  // Create docs directory
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  // Get all daily summaries
  const summaries = getDailySummaries();
  logger.info('site', `Found ${summaries.length} daily summaries`);

  // Generate index page
  const indexHtml = generateIndexPage(summaries);
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), indexHtml);
  logger.info('site', 'Generated index.html');

  // Generate individual summary pages
  for (const summary of summaries) {
    const pageHtml = generateSummaryPage(summary);
    fs.writeFileSync(path.join(DOCS_DIR, `${summary.date}.html`), pageHtml);
    logger.debug('site', `Generated ${summary.date}.html`);
  }

  logger.info('site', `Site generated in ${DOCS_DIR}/ with ${summaries.length + 1} pages`);
}
