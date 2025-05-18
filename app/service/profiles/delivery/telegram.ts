import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { NarrowedContext, Telegraf } from 'telegraf';
import { Markup } from 'telegraf';
import type * as Types from 'telegraf/types';
import type { BotContext } from '~/delivery/middlewares/context';
import type { RoutineTask } from '~/entities/routines';
import { ChatsRepository } from '~/service/chats/repository/postgres';
import { UsersRepository } from '~/service/users/repository/postgres';
import type { MessageBroker } from '~lib/message-broker';
import { ProfilesRepository } from '../repository/postgres';
import { type AddProfileExperienceReason, ProfilesUsecase } from '../usecase';
import { RoutinesRepositoryTasks } from '../repository/broker-lib';

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

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const delivery = new TelegramProfilesDelivery(deps, options);

  deps.bot.command('profile', delivery.commandProfile.bind(delivery));
  deps.bot.action('profile:extended', delivery.actionProfileExtended.bind(delivery));

  // самая последняя, т.к. считает опыт за сообщения
  deps.bot.on('message', delivery.onMessage.bind(delivery));

  return [
    {
      command: 'profile',
      description: 'Ваш профиль',
    },
  ];
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
    const repositoryRoutinesTasks = new RoutinesRepositoryTasks({
      mb: this.deps.tasksMessageBroker,
    });

    this.usecase = new ProfilesUsecase(
      { repository, usersRepository, chatsRepository, repositoryRoutinesTasks },
      {
        experienceProportionIncrease: this.options.experienceProportionIncrease,
        firstLevelMaxExperience: this.options.firstLevelMaxExperience,

        charactersExperience: this.options.charactersExperience,
        stickersExperience: this.options.stickersExperience,
        imagesExperience: this.options.imagesExperience,
        videosExperience: this.options.videosExperience,
        audiosExperience: this.options.audiosExperience,
        documentsExperience: this.options.documentsExperience,
        linksExperience: this.options.linksExperience,
        repostsExperience: this.options.repostsExperience,
        reactionsExperience: this.options.reactionsExperience,
        voicesExperience: this.options.voicesExperience,
        circlesExperience: this.options.circlesExperience,
        pollsExperience: this.options.pollsExperience,
      },
    );
  }

  async commandProfile(ctx: BotContext) {
    if (!ctx.from || !ctx.chat) return ctx.reply('Ошибка: не удалось получить ID пользователя.');

    ctx.reply(
      `Вы: <b>${ctx.from.first_name} ${ctx.from.last_name || ''}</b>

Ваш уровень: <b>${ctx.profile.level}</b>
Ваш опыт: <b>${ctx.profile.experience} / ${ctx.profile.currentLevelMaxExperience}</b>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          Markup.button.callback('Расширенная статистика', 'profile:extended'),
        ]),
      },
    );
  }

  async onMessage(ctx: NarrowedContext<BotContext, Types.Update.MessageUpdate<Types.Message>>) {
    if (!ctx.from || !ctx.chat) return ctx.reply('Ошибка: не удалось получить ID пользователя.');

    const reasons: AddProfileExperienceReason = {};

    if ('text' in ctx.message) {
      reasons.characters = { text: ctx.message.text };
    }

    if ('caption' in ctx.message && ctx.message.caption?.length) {
      reasons.characters = { text: ctx.message.caption };
    }

    if ('photo' in ctx.message) {
      reasons.images = {};
    }

    if ('sticker' in ctx.message) {
      reasons.stickers = {};
    }

    if ('video' in ctx.message) {
      reasons.videos = {};
    }

    if ('audio' in ctx.message) {
      reasons.audios = {};
    }

    if ('document' in ctx.message) {
      reasons.documents = {};
    }

    if ('link_preview_options' in ctx.message) {
      reasons.links = {};
    }

    if ('forward_origin' in ctx.message) {
      if (ctx.message.forward_origin?.type === 'channel') {
        reasons.reposts = {};
      }
    }

    if ('voice' in ctx.message) {
      reasons.voices = {};
    }

    if ('video_note' in ctx.message) {
      reasons.circles = {};
    }

    if ('poll' in ctx.message) {
      reasons.polls = {};
    }

    const experienceResult = await this.usecase.addProfileExperience(ctx.profile, reasons, {
      routine: ctx.routine,
      routineTasks: ctx.routineTasks,
    });
    if (experienceResult.result === 'error') {
      this.deps.logger.error(
        experienceResult.value,
        'addProfileExperience: this.usecase.addProfileExperience',
        {},
      );

      return;
    }
  }

  async actionProfileExtended(ctx: BotContext) {
    if (!ctx.from || !ctx.chat) return ctx.reply('Ошибка: не удалось получить ID пользователя.');

    const text = `📊 <b>Расширенная статистика</b> 📊
Вы: <b>${ctx.from.first_name} ${ctx.from.last_name || ''}</b>

Ваш уровень: <b>${ctx.profile.level}</b>
Ваш опыт: <b>${ctx.profile.experience} / ${ctx.profile.currentLevelMaxExperience}</b>

💡 <b>Статистика по количеству элементов</b> 💡
• символов: <b>${ctx.profile.charactersCount}</b>
• слов: <b>${ctx.profile.wordsCount}</b>
• стикеров: <b>${ctx.profile.stickersCount}</b>
• изображений: <b>${ctx.profile.imagesCount}</b>
• видео: <b>${ctx.profile.videosCount}</b>
• аудио: <b>${ctx.profile.audiosCount}</b>
• документов: <b>${ctx.profile.documentsCount}</b>
• ссылок: <b>${ctx.profile.linksCount}</b>
• репостов: <b>${ctx.profile.repostsCount}</b>
• реакций: <b>${ctx.profile.reactionsCount}</b>
• голосовых сообщений: <b>${ctx.profile.voicesCount}</b>
• кружков: <b>${ctx.profile.circlesCount}</b>
• опросов: <b>${ctx.profile.pollsCount}</b>
• выполнено заданий: <b>${ctx.routine.tasksCompletedCount}</b>
• выполнено полностью: <b>${ctx.routine.dailiesCompletedCount}</b>
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
