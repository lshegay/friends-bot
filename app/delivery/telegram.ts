import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import { session, type Telegraf } from 'telegraf';
import type { RoutineTask, RoutineTasks } from '~/entities/routines';
import { useTelegramDelivery as useGamesDelivery } from '~/service/games/delivery/telegram';
import { useTelegramDelivery as useProfilesDelivery } from '~/service/profiles/delivery/telegram';
import { useTelegramDelivery as useQuotesDelivery } from '~/service/quotes/delivery/telegram';
import { useTelegramDelivery as useRoutinesDelivery } from '~/service/routine/delivery/telegram';
import { useTelegramDelivery as useStatsDelivery } from '~/service/stats/delivery/telegram';
import { useTelegramDelivery as useDrinksDelivery } from '~/service/drinks/delivery/telegram';
import type { MessageBroker } from '~lib/message-broker';
import type { BotContext } from './middlewares/context';
import { createProfileMiddleware } from './middlewares/profile';
import { createRoutineMiddleware } from './middlewares/routines';
import type { S3Client } from 'bun';

export type Options = {
  firstLevelMaxExperience: number; // опыт, который нужен для получения 2-го уровня
  experienceProportionIncrease: number; // пропорция увеличения опыта относительно предыдущего уровня для получения следующего уровня

  charactersExperience: number; // опыт за символ
  stickersExperience: number; // опыт за стикер
  imagesExperience: number; // опыт за изображение
  videosExperience: number; // опыт за видео
  audiosExperience: number; // опыт за аудио
  documentsExperience: number; // опыт за документ
  linksExperience: number; // опыт за ссылку
  repostsExperience: number; // опыт за репост
  reactionsExperience: number; // опыт за реакцию
  voicesExperience: number; // опыт за голосовое сообщение
  circlesExperience: number; // опыт за круг
  pollsExperience: number; // опыт за опрос

  drinks: {
    s3Bucket: string;

    s3LinksExpiration: number;
  };

  statistics: {
    userCachePeriod: number; // время кэша пользователя телеграм в мс
    userStatsRatingCount: number; // количество пользователей в рейтинге
  };

  routines: {
    tasksPerDay: number; // количество задач в день
    timeTasksUpdate: { hour: number; minutes: number };

    tasks: RoutineTasks;
    taskCompletionWorkerInterval: number; // интервал работы воркера мс
  };

  quotes: {
    categories: Record<
      string,
      {
        title: string;
        titleQuoteBy: string;
        path: string;
      }
    >;

    timeNotify: { hour: number; minutes: number };
  };
};

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  s3: S3Client;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const profileMiddleware = createProfileMiddleware(
    {
      db: deps.db,
      logger: deps.logger,
      tasksMessageBroker: deps.tasksMessageBroker,
    },
    options,
  );

  const routineMiddleware = createRoutineMiddleware(
    {
      db: deps.db,
      logger: deps.logger,
      tasksMessageBroker: deps.tasksMessageBroker,
    },
    {
      ...options.routines,

      firstLevelMaxExperience: options.firstLevelMaxExperience,
      experienceProportionIncrease: options.experienceProportionIncrease,
    },
  );

  deps.bot.use(session());
  deps.bot.use(profileMiddleware);
  deps.bot.use(routineMiddleware);

  const gamesCommands = useGamesDelivery(
    {
      db: deps.db,
      bot: deps.bot,
      logger: deps.logger,
      tasksMessageBroker: deps.tasksMessageBroker,
    },
    {},
  );

  const drinksCommands = useDrinksDelivery(
    {
      db: deps.db,
      s3: deps.s3,
      bot: deps.bot,
      logger: deps.logger,
      tasksMessageBroker: deps.tasksMessageBroker,
    },
    options.drinks,
  );

  const quotesCommands = useQuotesDelivery(
    {
      db: deps.db,
      bot: deps.bot,
      logger: deps.logger,
      tasksMessageBroker: deps.tasksMessageBroker,
    },
    options.quotes,
  );

  const dailiesCommands = useRoutinesDelivery(
    {
      db: deps.db,
      bot: deps.bot,
      logger: deps.logger,
      tasksMessageBroker: deps.tasksMessageBroker,
    },
    {
      ...options.routines,

      firstLevelMaxExperience: options.firstLevelMaxExperience,
      experienceProportionIncrease: options.experienceProportionIncrease,
    },
  );

  const statsCommands = useStatsDelivery(
    {
      db: deps.db,
      bot: deps.bot,
      logger: deps.logger,
    },
    options.statistics,
  );

  const profilesCommands = useProfilesDelivery(
    {
      db: deps.db,
      bot: deps.bot,
      logger: deps.logger,
      tasksMessageBroker: deps.tasksMessageBroker,
    },
    {
      experienceProportionIncrease: options.experienceProportionIncrease,
      firstLevelMaxExperience: options.firstLevelMaxExperience,

      charactersExperience: options.charactersExperience,
      stickersExperience: options.stickersExperience,
      imagesExperience: options.imagesExperience,
      videosExperience: options.videosExperience,
      audiosExperience: options.audiosExperience,
      documentsExperience: options.documentsExperience,
      linksExperience: options.linksExperience,
      repostsExperience: options.repostsExperience,
      reactionsExperience: options.reactionsExperience,
      voicesExperience: options.voicesExperience,
      circlesExperience: options.circlesExperience,
      pollsExperience: options.pollsExperience,
    },
  );

  /* deps.bot.telegram.setMyCommands([
    ...gamesCommands,
    ...drinksCommands,
    ...quotesCommands,
    ...dailiesCommands,
    ...statsCommands,
    ...profilesCommands,
  ]); */
}
