import pdfParse from 'pdf-parse';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('pdf');

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    logger.debug(`Extracted ${data.text.length} characters from PDF`);
    return data.text;
  } catch (error) {
    logger.error('Failed to extract PDF text', error as Error);
    return '';
  }
}
