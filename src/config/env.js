// Environment loading and validation
import 'dotenv/config';

const requiredEnv = ['TELEGRAM_BOT_TOKEN','OPENAI_API_KEY','SUPABASE_URL',
'SUPABASE_SERVICE_ROLE_KEY',];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};