import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { logger, Meeting, MeetingStatus } from '@echomeet/shared';
import { Bot, BotStatus } from '../models/bot.model.js';
import axios from 'axios';

const UPLOAD_SERVICE_URL = process.env.UPLOAD_SERVICE_URL || 'http://upload-service:3001';

export class BotHandler {
  static async spawnBot(params: {
    userId: string;
    meetingUrl: string;
    platform: 'zoom' | 'teams' | 'meet' | 'other';
    requestId: string;
  }) {
    const { userId, meetingUrl, platform, requestId } = params;
    const botId = uuidv4();
    const meetingId = uuidv4();

    // 1. Create Bot and Meeting records
    const bot = await Bot.create({
      botId,
      meetingId,
      userId,
      meetingUrl,
      platform,
      status: BotStatus.JOINING
    });

    const meeting = await Meeting.create({
      meetingId,
      userId,
      title: `Live Meeting: ${platform}`,
      status: MeetingStatus.UPLOADING
    });

    logger.info('Bot dispatched and records created', { requestId, botId, meetingId });

    // 2. Start the Bot process (Asynchronous)
    // In a production environment, this would likely be a separate worker or a container
    this.runBotLifecycle(botId, meetingId, userId, meetingUrl, requestId).catch(err => {
      logger.error('Background bot lifecycle failed', { requestId, botId, err });
    });

    return { botId, meetingId };
  }

  private static async runBotLifecycle(
    botId: string, 
    meetingId: string, 
    userId: string,
    meetingUrl: string, 
    requestId: string
  ) {
    try {
      // Step 1: Join Meeting
      await Bot.findOneAndUpdate({ botId }, { status: BotStatus.JOINING });
      logger.info('Bot joining meeting', { botId, meetingUrl });
      
      // MOCK: Simulate joining time
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 2: Start Recording
      await Bot.findOneAndUpdate({ botId }, { 
        status: BotStatus.RECORDING,
        joinedAt: new Date(),
        startedRecordingAt: new Date()
      });
      logger.info('Bot recording started', { botId });

      // MOCK: Simulate meeting duration (e.g., 30 seconds for test)
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Step 3: Finish and Upload
      await Bot.findOneAndUpdate({ botId }, { status: BotStatus.UPLOADING });
      
      // In a real implementation, we would capture audio here using Puppeteer/ffmpeg
      // For now, we simulate a successful recording handoff
      
      const mockS3Key = `raw-audio/${userId}/${meetingId}.mp3`;
      
      // Notify upload complete to trigger transcription pipeline
      await axios.post(`${UPLOAD_SERVICE_URL}/upload/complete`, {
        meetingId,
        s3Key: mockS3Key,
        duration: 30
      }, {
        headers: { 'x-request-id': requestId, 'x-user-id': userId }
      });

      // Step 4: Complete
      await Bot.findOneAndUpdate({ botId }, { 
        status: BotStatus.COMPLETED,
        finishedAt: new Date(),
        audioS3Key: mockS3Key
      });

      logger.info('Bot lifecycle completed successfully', { botId, meetingId });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Bot lifecycle error', { botId, error: errorMsg });
      
      await Bot.findOneAndUpdate({ botId }, { 
        status: BotStatus.FAILED,
        error: errorMsg
      });

      await Meeting.findOneAndUpdate({ meetingId }, { 
        status: MeetingStatus.FAILED,
        error: `Bot failed: ${errorMsg}`
      });
    }
  }
}
