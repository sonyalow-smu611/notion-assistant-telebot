import OpenAI from 'openai';
import { env } from '../../config/env.js';

// Shared OpenAI client for integration modules.
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
