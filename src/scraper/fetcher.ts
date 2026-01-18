import axios from 'axios';
import { chromium, type Browser, type Page } from 'playwright';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('fetcher');

let browser: Browser | null = null;

export async function fetchHtml(url: string, useBrowser = false): Promise<string> {
  if (useBrowser) {
    return fetchWithBrowser(url);
  }
  return fetchWithAxios(url);
}

async function fetchWithAxios(url: string): Promise<string> {
  logger.debug(`Fetching ${url} with axios`);
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 30000,
  });
  return response.data;
}

async function fetchWithBrowser(url: string): Promise<string> {
  logger.debug(`Fetching ${url} with browser`);
  const page = await getBrowserPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    return await page.content();
  } finally {
    await page.close();
  }
}

async function getBrowserPage(): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  return context.newPage();
}

export async function downloadFile(url: string): Promise<Buffer> {
  logger.debug(`Downloading file from ${url}`);
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    timeout: 60000,
  });
  return Buffer.from(response.data);
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
