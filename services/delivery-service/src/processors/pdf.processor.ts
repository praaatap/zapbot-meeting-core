import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { logger, pdfGenerationDuration } from '@echomeet/shared';

export const generateMeetingPdf = async (data: any, requestId: string): Promise<Buffer> => {
  const timer = pdfGenerationDuration.startTimer();
  let browser;
  try {
    logger.info('Generating PDF with Puppeteer', { requestId, meetingId: data.meetingId });

    // 1. Read and compile template
    const templatePath = path.join(process.cwd(), 'src/processors/templates/meeting-report.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const html = template(data);

    // 2. Launch browser
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new' as any
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // 3. Generate PDF Buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });

    logger.info('PDF generation complete', { requestId });
    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error('PDF generation failed', { requestId, error });
    throw error;
  } finally {
    if (browser) await browser.close();
    timer();
  }
};
