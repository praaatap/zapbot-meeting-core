import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { logger } from '@echomeet/shared';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const splitAudio = async (
  inputPath: string, 
  outputDir: string, 
  chunkDurationSeconds: number = 600 // 10 minutes default
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const chunkPaths: string[] = [];
    const fileName = path.basename(inputPath, path.extname(inputPath));

    ffmpeg(inputPath)
      .outputOptions([
        `-f segment`,
        `-segment_time ${chunkDurationSeconds}`,
        `-reset_timestamps 1`,
        `-map 0:a` // Ensure only audio is processed
      ])
      .output(path.join(outputDir, `${fileName}_%03d.mp3`))
      .on('start', (command) => {
        logger.info('FFmpeg split started', { command });
      })
      .on('end', () => {
        const files = fs.readdirSync(outputDir)
          .filter(f => f.startsWith(fileName) && f.endsWith('.mp3'))
          .map(f => path.join(outputDir, f));
        
        logger.info(`FFmpeg split complete. Created ${files.length} chunks.`);
        resolve(files);
      })
      .on('error', (err) => {
        logger.error('FFmpeg split error', { error: err.message });
        reject(err);
      })
      .run();
  });
};
