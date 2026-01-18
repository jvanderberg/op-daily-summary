import { join, basename } from 'path';
import { downloadFile } from '../scraper/fetcher.js';
import { extractPdfText } from './pdf.js';
import { saveFile, fileExists } from '../storage/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('documents');

export interface DownloadedDocument {
  url: string;
  localPath: string;
  text: string;
}

export async function downloadAndExtract(
  url: string,
  downloadDir: string
): Promise<DownloadedDocument | null> {
  try {
    const filename = sanitizeFilename(basename(new URL(url).pathname));
    const localPath = join(downloadDir, filename);

    if (await fileExists(localPath)) {
      logger.debug(`Document already exists: ${localPath}`);
    } else {
      logger.info(`Downloading: ${url}`);
      const buffer = await downloadFile(url);
      await saveFile(localPath, buffer);
    }

    const buffer = await downloadFile(url);
    const text = url.toLowerCase().endsWith('.pdf')
      ? await extractPdfText(buffer)
      : buffer.toString('utf-8');

    return { url, localPath, text };
  } catch (error) {
    logger.error(`Failed to download ${url}`, error as Error);
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
}

export { extractPdfText } from './pdf.js';
