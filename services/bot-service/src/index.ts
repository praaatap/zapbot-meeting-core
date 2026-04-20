import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { logger, registry } from '@echomeet/shared';
import { BotHandler } from './handlers/bot.handler.js';
import Joi from 'joi';

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());

// Metrics
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'bot-service' });
});

// Dispatch Bot
const dispatchSchema = Joi.object({
  meetingUrl: Joi.string().uri().required(),
  platform: Joi.string().valid('zoom', 'teams', 'meet', 'other').default('other')
});

app.post('/dispatch', async (req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  try {
    const { error, value } = dispatchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { botId, meetingId } = await BotHandler.spawnBot({
      userId,
      meetingUrl: value.meetingUrl,
      platform: value.platform,
      requestId
    });

    res.status(202).json({
      message: 'Bot dispatch initiated',
      botId,
      meetingId
    });
  } catch (error) {
    logger.error('Failed to dispatch bot', { requestId, error });
    res.status(500).json({ error: 'Failed to dispatch bot' });
  }
});

const start = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/echomeet';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`Bot Service HTTP server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Bot Service', { error });
    process.exit(1);
  }
};

start();
