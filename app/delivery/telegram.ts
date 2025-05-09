import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { Telegraf } from 'telegraf';
import { useTelegramDelivery as useGamesDelivery } from '~/service/games/delivery/telegram';
import { useTelegramDelivery as useProfilesDelivery } from '~/service/profiles/delivery/telegram';
import { useTelegramDelivery as useQuotesDelivery } from '~/service/quotes/delivery/telegram';
import type { BotContext } from './middlewares/context';
import { createProfileMiddleware } from './middlewares/profile';

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
  logger: Logger;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const profileMiddleware = createProfileMiddleware(
    {
      db: deps.db,
      logger: deps.logger,
    },
    options,
  );

  deps.bot.use(profileMiddleware);

  const gamesCommands = useGamesDelivery({ db: deps.db, bot: deps.bot, logger: deps.logger }, {});

  const quotesCommands = useQuotesDelivery({ db: deps.db, bot: deps.bot, logger: deps.logger }, options.quotes);

  const profilesCommands = useProfilesDelivery(
    { db: deps.db, bot: deps.bot, logger: deps.logger },
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

  deps.bot.telegram.setMyCommands([...gamesCommands, ...quotesCommands, ...profilesCommands]);
}
