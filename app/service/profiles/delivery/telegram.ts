import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { Telegraf } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import { ChatsRepository } from '~/service/chats/repository/postgres';
import { UsersRepository } from '~/service/users/repository/postgres';
import { ProfilesRepository } from '../repository/postgres';
import { ProfilesUsecase } from '../usecase';

export type Options = {};

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  logger: Logger;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const delivery = new TelegramProfilesDelivery(deps, options);

  deps.bot.command('profile', delivery.getCurrentUserProfile.bind(delivery));
}

export class TelegramProfilesDelivery {
  usecase: ProfilesUsecase;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    const repository = new ProfilesRepository({ db: this.deps.db });
    const usersRepository = new UsersRepository({ db: this.deps.db });
    const chatsRepository = new ChatsRepository({ db: this.deps.db });

    this.usecase = new ProfilesUsecase({ repository, usersRepository, chatsRepository });
  }

  async getCurrentUserProfile(ctx: BotContext) {
    if (!ctx.from || !ctx.chat) return ctx.reply('Ошибка: не удалось получить ID пользователя.');

    ctx.reply(
      `Ваш уровень: ${ctx.profile.level}
Ваш опыт: ${ctx.profile.experience}`,
    );
  }
}
