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
};

export function createProfileMiddleware(
  deps: Dependencies,
  options: Options,
): MiddlewareFn<BotContext> {
  const repository = new ProfilesRepository({ db: deps.db });
  const usersRepository = new UsersRepository({ db: deps.db });
  const chatsRepository = new ChatsRepository({ db: deps.db });

  const usecase = new ProfilesUsecase(
    {
      repository,
      usersRepository,
      chatsRepository,
    },
    {
      firstLevelMaxExperience: options.firstLevelMaxExperience,
      experienceProportionIncrease: options.experienceProportionIncrease,

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

      return;
    }

    ctx.profile = allResult.value.profile;

    return next();
  };
}
