import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { Telegraf } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import type { RoutineTask } from '~/entities/routines';
import { ChatsRepository } from '~/service/chats/repository/postgres';
import { ChatsUsecase } from '~/service/chats/usecase';
import { trycatch } from '~lib/errors';
import type { MessageBroker } from '~lib/message-broker';
import { runAtSpecificTimeOfDay } from '~lib/utils';
import { RoutinesRepositoryTasks } from '../../repository/broker-lib';
import { ForismaticRepository } from '../../repository/forismatic';
import { QuotesForismaticUsecase } from '../../usecase/forismatic';

export type Dependencies = {
  db: BunSQLDatabase;
  bot: Telegraf<BotContext>;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export type Options = {
  timeNotify: { hour: number; minutes: number };
};

export class NotifierWorker {
  chatsUsecase: ChatsUsecase;
  quotesForismaticUsecase: QuotesForismaticUsecase;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    this.deps.logger = deps.logger.child({
      service: 'QuotesNotifierWorker',
    });

    const repository = new ChatsRepository({ db: this.deps.db });
    this.chatsUsecase = new ChatsUsecase({ repository });

    const repositoryForismatic = new ForismaticRepository();
    const repositoryRoutinesTasks = new RoutinesRepositoryTasks({
      mb: this.deps.tasksMessageBroker,
    });

    this.quotesForismaticUsecase = new QuotesForismaticUsecase({
      repository: repositoryForismatic,
      repositoryRoutinesTasks: repositoryRoutinesTasks,
    });
  }

  // заглушка
  stop() {}

  async run() {
    const { timeNotify } = this.options;

    this.deps.logger.info('☑️  Started to work');

    this.stop = runAtSpecificTimeOfDay(timeNotify.hour, timeNotify.minutes, async () => {
      this.deps.logger.info('Started to notify chats');

      const chatsResult = await this.chatsUsecase.getChats();
      if (chatsResult.result === 'error') {
        this.deps.logger.error(
          new Error('this.chatsUsecase.getChats', { cause: chatsResult.value }),
          'runAtSpecificTimeOfDay',
        );

        return;
      }

      const quoteResult = await this.quotesForismaticUsecase.getRandomQuote([]);
      if (quoteResult.result === 'error') {
        this.deps.logger.error(
          new Error('this.quotesForismaticUsecase.getRandomQuote', { cause: quoteResult.value }),
          'getRandomQuote',
        );

        return;
      }

      const chats = chatsResult.value;

      await Promise.all(
        chats.map(async (chat) => {
          const { result, value } = await trycatch(() =>
            this.deps.bot.telegram.sendMessage(
              chat.externalId,
              `<b>Сегодняшняя случайная цитата!</b>

<blockquote>${quoteResult.value.quote}</blockquote>

${quoteResult.value.reference.length ? `<i>${quoteResult.value.reference}</i>` : 'Неизвестный автор'}`,
              { parse_mode: 'HTML' },
            ),
          );
          if (result === 'error') {
            this.deps.logger.error(
              new Error('this.deps.bot.telegram.sendMessage', { cause: value }),
              'runAtSpecificTimeOfDay',
            );
          }

          return value;
        }),
      );

      this.deps.logger.info('Notifying chats completed successfully');
    });
  }
}
