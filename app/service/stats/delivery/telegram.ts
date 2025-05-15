import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { Telegraf } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import { ChatsRepository } from '~/service/chats/repository/postgres';
import { UsersRepository } from '~/service/users/repository/postgres';
import { UsersTelegramRepository } from '~/service/users/repository/telegram';
import { ProfilesRepository } from '../repository/postgres';
import { StatsUsecase } from '../usecase';

export type Options = {
  userCachePeriod: number; // время кэша пользователя телеграм в мс
  userStatsRatingCount: number; // количество пользователей в рейтинге
};

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  logger: Logger;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const delivery = new TelegramProfilesDelivery(deps, options);

  deps.bot.command('stats', delivery.commandStats.bind(delivery));

  return [
    {
      command: 'stats',
      description: 'Ваш профиль',
    },
  ];
}

export class TelegramProfilesDelivery {
  usecase: StatsUsecase;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    const repository = new ProfilesRepository({ db: this.deps.db });
    const usersRepository = new UsersRepository({ db: this.deps.db });
    const usersTelegramRepository = new UsersTelegramRepository({ telegram: deps.bot.telegram });
    const chatsRepository = new ChatsRepository({ db: this.deps.db });

    this.usecase = new StatsUsecase(
      { repository, usersRepository, chatsRepository, usersTelegramRepository },
      {
        userCachePeriod: this.options.userCachePeriod,
        userStatsRatingCount: this.options.userStatsRatingCount,
      },
    );
  }

  async commandStats(ctx: BotContext) {
    if (!ctx.from || !ctx.chat) return ctx.reply('Ошибка: не удалось получить ID пользователя.');

    const statisticsResult = await this.usecase.getStatsRating(ctx.chat.id);
    if (statisticsResult.result === 'error') {
      this.deps.logger.error(statisticsResult.value, 'commandStats: this.usecase.getStatsByLevel');

      return;
    }

    const text = `🏆 <b>Рейтинг пользователей группы</b> 🏆

<b>По уровню и количеству опыту</b> 🎚️
${statisticsResult.value
  .map(
    (item, index) =>
      `${index + 1}. ${item.user.firstName} ${item.user.lastName} (${item.profile.level} уровень, ${item.profile.experience} опыта)`,
  )
  .join('\n')}
`;

    if (ctx.callbackQuery) {
      return ctx.editMessageText(text, {
        parse_mode: 'HTML',
      });
    }

    return ctx.reply(text, {
      parse_mode: 'HTML',
    });
  }
}
