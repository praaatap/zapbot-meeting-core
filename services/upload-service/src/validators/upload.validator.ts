import Joi from 'joi';
import { ValidationError } from '@echomeet/shared';

const uploadSchema = Joi.object({
  title: Joi.string().required().max(255),
  language: Joi.string().default('en'),
  participantCount: Joi.number().min(1).max(50).default(2),
});

export const validateUploadRequest = (data: any) => {
  const { error, value } = uploadSchema.validate(data);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  return value;
};

export const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/x-m4a',
  'video/mp4'
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
