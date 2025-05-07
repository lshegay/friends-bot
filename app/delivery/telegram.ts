import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { Telegraf } from 'telegraf';
import { useTelegramDelivery as useProfilesDelivery } from '~/service/profiles/delivery/telegram';
import { useTelegramDelivery as useGamesDelivery } from '~/service/games/delivery/telegram';
import type { BotContext } from './middlewares/context';
import { createProfileMiddleware } from './middlewares/profile';

export type Options = {};

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  logger: Logger;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const profileMiddleware = createProfileMiddleware({
    db: deps.db,
    logger: deps.logger,
  });

  deps.bot.use(profileMiddleware);

  useProfilesDelivery({ db: deps.db, bot: deps.bot, logger: deps.logger }, {});
  useGamesDelivery({ db: deps.db, bot: deps.bot, logger: deps.logger }, {});
}
