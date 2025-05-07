import { drizzle } from 'drizzle-orm/bun-sql';
import pino from 'pino';
import { Telegraf } from 'telegraf';
import { config } from './config';
import type { BotContext } from './delivery/middlewares/context';
import { useTelegramDelivery } from './delivery/telegram';

const logger = pino({
  ...(!config.production
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : {}),
});

if (!config.token?.length) throw new Error('No Bot Token is used.');
if (!config.postgres.host?.length || !config.postgres.port)
  throw new Error('No Postgres data is used.');

const db = drizzle({
  connection: {
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
    ssl: config.postgres.ssl,
  },
});

logger.info('✅ Connected to Postgres database');

const bot = new Telegraf<BotContext>(config.token);

useTelegramDelivery({ db, bot, logger }, {});

bot.launch();

logger.info('✅ Connected to Telegram Bot API');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
