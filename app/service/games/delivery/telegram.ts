import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import { Markup, type NarrowedContext, type Telegraf, type Types } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import type { RoutineTask } from '~/entities/routines';
import type { MessageBroker } from '~lib/message-broker';
import { RoutinesRepositoryTasks } from '../repository/broker-lib';
import { GamesUsecase } from '../usecase';

// biome-ignore lint/complexity/noBannedTypes: для будущего
export type Options = {};

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const delivery = new TelegramGamesDelivery(deps, options);

  deps.bot.command('random', delivery.commandRandom.bind(delivery));
  deps.bot.action(/^random:(\d+):(\d+):(\d+)$/, delivery.actionRandom.bind(delivery));

  return [
    {
      command: 'random',
      description: 'Случайное число',
    },
  ];
}

export class TelegramGamesDelivery {
  usecase: GamesUsecase;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    const repositoryRoutinesTasks = new RoutinesRepositoryTasks({ mb: deps.tasksMessageBroker });

    this.usecase = new GamesUsecase({ repositoryRoutinesTasks });
  }

  async commandRandom(
    ctx: NarrowedContext<BotContext, Types.MountMap['text']> & Types.CommandContextExtn,
  ) {
    const args = ctx.args;
    if (!args.length || args.length > 2) {
      return ctx.replyWithMarkdownV2(
        `🎲 Для выполнения команды нужно ввести:
*/random \\<max\\>* \\- случайное число от 0 до \\<max\\> включительно
*/random \\<min\\> \\<max\\>* \\- случайное число от \\<min\\> до \\<max\\> включительно`,
        Markup.inlineKeyboard([
          Markup.button.callback('Случайное число от 1 до 6', 'random:1:6:0'),
        ]),
      );
    }

    const min = args.length === 1 ? 0 : Number.parseInt(args[0], 10);
    const max = Number.parseInt(args[args.length - 1], 10);

    const number = this.usecase.getRandomNumber(max, min);

    return ctx.replyWithMarkdownV2(
      `🎲 Ваше число: *${number}*`,
      Markup.inlineKeyboard([Markup.button.callback('Случайное число от 1 до 6', 'random:1:6:0')]),
    );
  }

  async actionRandom(
    ctx: NarrowedContext<BotContext, Types.MountMap['callback_query']> & { match: RegExpExecArray },
  ) {
    const min = Number.parseInt(ctx.match[1], 10);
    const max = Number.parseInt(ctx.match[2], 10);
    const previous = Number.parseInt(ctx.match[3], 10);

    const number = this.usecase.getRandomNumber(max, min);

    if (number === previous) return;

    return ctx.editMessageText(`🎲 Ваше число: *${number}*`, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        Markup.button.callback('Случайное число от 1 до 6', `random:${min}:${max}:${number}`),
      ]),
    });
  }
}
