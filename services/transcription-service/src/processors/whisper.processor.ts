import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import OpenAI, { toFile } from 'openai';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { logger, whisperApiCallsTotal, openaiTokensUsedTotal } from '@echomeet/shared';
import { splitAudio } from './chunker.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {})
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TMP_DIR = path.join(process.cwd(), 'tmp');

export const processTranscription = async (s3Key: string, requestId: string) => {
  const startTime = Date.now();
  const fileName = path.basename(s3Key);
  const localPath = path.join(TMP_DIR, `${requestId}_${fileName}`);
  
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  try {
    // 1. Download from S3
    logger.info('Downloading file from S3', { requestId, s3Key });
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'echomeet-raw-audio',
      Key: s3Key,
    });
    const response = await s3Client.send(getObjectCommand);
    if (!response.Body) throw new Error('S3 response body is empty');
    
    await pipeline(response.Body as any, fs.createWriteStream(localPath));

    // 2. Check file size
    const stats = fs.statSync(localPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    logger.info(`File size: ${fileSizeMB.toFixed(2)} MB`, { requestId });

    let fullTranscript = '';
    let allSegments: any[] = [];

    if (fileSizeMB > 25) {
      // 3a. Parallel Chunk processing
      logger.info('File > 25MB, splitting into chunks', { requestId });
      const chunkDir = path.join(TMP_DIR, `${requestId}_chunks`);
      const chunks = await splitAudio(localPath, chunkDir);
      
      const results = await Promise.all(chunks.map(chunkPath => transcribeChunk(chunkPath, requestId)));
      
      // Combine results
      results.sort((a, b) => a.index - b.index);
      fullTranscript = results.map(r => r.text).join(' ');
      
      let timeOffset = 0;
      for (const result of results) {
        const segmentsWithOffset = result.segments.map((seg: any) => ({
          ...seg,
          start: seg.start + timeOffset,
          end: seg.end + timeOffset
        }));
        allSegments.push(...segmentsWithOffset);
        
        // Update offset based on chunk duration
        // Note: For simplicity, we assume segments are continuous
        if (segmentsWithOffset.length > 0) {
          timeOffset = segmentsWithOffset[segmentsWithOffset.length - 1].end;
        }
      }

      // Cleanup chunks
      fs.rmSync(chunkDir, { recursive: true, force: true });
    } else {
      // 3b. Direct processing
      const result = await transcribeChunk(localPath, requestId);
      fullTranscript = result.text;
      allSegments = result.segments;
    }

    const processingTimeMs = Date.now() - startTime;
    logger.info('Transcription completed', { requestId, processingTimeMs });

    return {
      rawText: fullTranscript,
      segments: allSegments,
      processingTimeMs
    };
  } finally {
    // Cleanup local file
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
};

async function transcribeChunk(filePath: string, requestId: string) {
  const index = parseInt(path.basename(filePath).match(/_(\d+)\.mp3$/)?.[1] || '0');
  
  try {
    whisperApiCallsTotal.inc({ status: 'pending' });
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    whisperApiCallsTotal.inc({ status: 'success' });
    
    return {
      index,
      text: transcription.text,
      segments: (transcription as any).segments || []
    };
  } catch (error) {
    whisperApiCallsTotal.inc({ status: 'failed' });
    logger.error('Whisper API call failed', { requestId, filePath, error });
    throw error;
  }
}
