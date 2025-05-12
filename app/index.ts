import { drizzle } from 'drizzle-orm/bun-sql';
import pino from 'pino';
import { Telegraf } from 'telegraf';
import { config } from './config';
import type { BotContext } from './delivery/middlewares/context';
import { useTelegramDelivery } from './delivery/telegram';
import { MessageBroker } from '~lib/message-broker';
import type { RoutineTask } from './entities/routines';

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

const tasksMessageBroker = new MessageBroker<RoutineTask>();

useTelegramDelivery(
  { db, bot, logger, tasksMessageBroker },
  {
    experienceProportionIncrease: 0.5,
    firstLevelMaxExperience: 100,

    charactersExperience: 1,
    stickersExperience: 1,
    imagesExperience: 10,
    videosExperience: 15,
    audiosExperience: 15,
    documentsExperience: 5,
    linksExperience: 5,
    repostsExperience: 2,
    reactionsExperience: 2,
    voicesExperience: 1,
    circlesExperience: 30,
    pollsExperience: 2,

    routines: {
      tasksPerDay: 3,
      timeTasksUpdate: { hour: 8, minutes: 0 },
      
      taskCompletionWorkerInterval: 200,

      tasks: [
        {
          name: 'GET_COFFEE',
          description: 'Выпить 1 чашку кофе.',

          options: {},

          experience: 20,
        },
        {
          name: 'READ_QUOTE',
          description: 'Прочитать 1 цитату.',

          options: {},

          experience: 20,
        },
        {
          name: 'SEND_IMAGES',
          description: 'Отправить {1} изображений.',

          options: {
            min: 1,
            max: 3,
          },

          experience: 50,
        },
        {
          name: 'SEND_CHARACTERS',
          description: 'Отправить {1} символов.',

          options: {
            min: 50,
            max: 200,
          },

          experience: 50,
        },
      ],
    },

    quotes: {
      categories: {
        lenin: {
          title: 'Ленин',
          titleQuoteBy: 'Цитата Ленина',
          path: 'assets/quotes/lenin.json',
        },
      },

      timeNotify: { hour: 12, minutes: 0 },
    },
  },
);

if (config.webhook.domain?.length && config.webhook.port) {
  bot.launch({
    webhook: {
      domain: config.webhook.domain,
      port: config.webhook.port,
      path: config.webhook.path,
    },
  });
} else {
  bot.launch();
}

logger.info('✅ Telegram Bot Started');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
