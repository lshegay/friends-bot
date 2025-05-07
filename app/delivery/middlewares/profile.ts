import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { MiddlewareFn } from 'telegraf';
import { ChatsRepository } from '~/service/chats/repository/postgres';
import { ProfilesRepository } from '~/service/profiles/repository/postgres';
import { ProfilesUsecase } from '~/service/profiles/usecase';
import { UsersRepository } from '~/service/users/repository/postgres';
import type { BotContext } from './context';

export type Dependencies = {
  db: BunSQLDatabase;
  logger: Logger;
};

export function createProfileMiddleware(deps: Dependencies): MiddlewareFn<BotContext> {
  const repository = new ProfilesRepository({ db: deps.db });
  const usersRepository = new UsersRepository({ db: deps.db });
  const chatsRepository = new ChatsRepository({ db: deps.db });

  const usecase = new ProfilesUsecase({
    repository,
    usersRepository,
    chatsRepository,
  });

  return async (ctx, next) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private')
      return ctx.reply('Привет! Данный бот доступен только в группах.');

    const allResult = await usecase.getUserChatProfileOrCreate(
      { id: ctx.chat.id, type: ctx.chat.type },
      { id: ctx.from.id, isBot: ctx.from.is_bot },
    );
    if (allResult.result === 'error') {
      deps.logger.error(allResult.value, 'Error in createProfileMiddleware', {
        userId: ctx.from.id,
        chatId: ctx.chat.id,
      });

      return ctx.reply('Ошибка: не удалось получить профиль.');
    }

    ctx.profile = allResult.value.profile;

    return next();
  };
}
