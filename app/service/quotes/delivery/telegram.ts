import type { Logger } from 'pino';
import { Markup, type NarrowedContext, type Telegraf, type Types } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import { ForismaticRepository } from '../repository/forismatic';
import { QuotesRepository } from '../repository/io';
import { QuotesForismaticUsecase } from '../usecase/forismatic';
import { QuotesUsecase } from '../usecase/local';
import { NotifierWorker } from './notifier-worker';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { RoutineTask } from '~/entities/routines';
import type { MessageBroker } from '~lib/message-broker';
import { RoutinesRepositoryTasks } from '../repository/broker-lib';

export type Options = {
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

export type Dependencies = {
  db: BunSQLDatabase;
  bot: Telegraf<BotContext>;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const delivery = new TelegramQuotesDelivery(deps, options);

  deps.bot.command('quote', delivery.commandQuote.bind(delivery));
  deps.bot.action('quote:forismatic', delivery.actionQuoteForismatic.bind(delivery));
  deps.bot.action(/quote:(.+)/, delivery.actionQuote.bind(delivery));

  const notifier = new NotifierWorker(deps, { timeNotify: options.timeNotify });
  notifier.run();

  return [
    {
      command: 'quote',
      description: 'Случайная цитата',
    },
  ];
}

export class TelegramQuotesDelivery {
  usecase: QuotesUsecase;
  usecaseForismatic: QuotesForismaticUsecase;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    const repository = new QuotesRepository(
      {},
      {
        categories: this.options.categories,
      },
    );
    const repositoryForismatic = new ForismaticRepository();
    const repositoryRoutinesTasks = new RoutinesRepositoryTasks({
      mb: this.deps.tasksMessageBroker,
    });

    this.usecase = new QuotesUsecase({ repository, repositoryRoutinesTasks });
    this.usecaseForismatic = new QuotesForismaticUsecase({ repository: repositoryForismatic, repositoryRoutinesTasks });
  }

  async commandQuoteHelp(
    ctx: NarrowedContext<BotContext, Types.MountMap['text']> & Types.CommandContextExtn,
  ) {
    const categoriesResult = await this.usecase.getCategories();
    if (categoriesResult.result === 'error') {
      this.deps.logger.error(
        new Error('this.usecase.getCategories', { cause: categoriesResult.value }),
        'getCategories',
      );
      return ctx.reply('Не удалось получить категории');
    }
    const categories = categoriesResult.value;

    return ctx.replyWithMarkdownV2(
      `☁️ Для выполнения команды нужно ввести:
*/quote \\<category\\>* \\- случайная цитата из категории \\<category\\>

Доступные категории:
\\- случайная цитата Forismatic API \\(\\/quote forismatic\\)
${categories.map((category) => `\\- ${category.title} \\(\\/quote ${category.id}\\)`).join('\n')}`,
      {
        ...Markup.inlineKeyboard(
          [
            Markup.button.callback('Forismatic API', 'quote:forismatic'),
            ...categories.map((category) =>
              Markup.button.callback(category.titleQuoteBy, `quote:${category.id}`),
            ),
          ],
          { columns: 1 },
        ),
      },
    );
  }

  async commandQuote(
    ctx: NarrowedContext<BotContext, Types.MountMap['text']> & Types.CommandContextExtn,
  ) {
    const args = ctx.args;
    const categoryId = args?.[0];

    if (!categoryId?.length) {
      return await this.commandQuoteHelp(ctx);
    }

    if (categoryId === 'forismatic') {
      return this.commandQuoteForismatic(ctx);
    }

    const quoteResult = await this.usecase.getRandomQuote(categoryId, ctx.routineTasks);
    if (quoteResult.result === 'error') {
      this.deps.logger.error(
        new Error('this.usecase.getRandomQuote', { cause: quoteResult.value }),
        'getRandomQuote',
      );

      return ctx.reply('Не удалось получить цитату');
    }

    return ctx.reply(
      `<b>${quoteResult.value.category.titleQuoteBy}</b>

<blockquote>${quoteResult.value.quote.quote}</blockquote>

<i>${quoteResult.value.quote.reference}</i>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([Markup.button.callback('Еще цитату', `quote:${categoryId}`)]),
      },
    );
  }

  async actionQuote(
    ctx: NarrowedContext<BotContext, Types.MountMap['callback_query']> & { match: RegExpExecArray },
  ) {
    const categoryId = ctx.match[1];

    const quoteResult = await this.usecase.getRandomQuote(categoryId, ctx.routineTasks);
    if (quoteResult.result === 'error') {
      this.deps.logger.error(
        new Error('this.usecase.getRandomQuote', { cause: quoteResult.value }),
        'getRandomQuote',
      );

      return ctx.answerCbQuery('Не удалось получить цитату');
    }

    return ctx.editMessageText(
      `<b>${quoteResult.value.category.titleQuoteBy}</b>

<blockquote>${quoteResult.value.quote.quote}</blockquote>

<i>${quoteResult.value.quote.reference}</i>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([Markup.button.callback('Еще цитату', `quote:${categoryId}`)]),
      },
    );
  }

  async commandQuoteForismatic(ctx: BotContext) {
    const quoteResult = await this.usecaseForismatic.getRandomQuote(ctx.routineTasks);
    if (quoteResult.result === 'error') {
      this.deps.logger.error(
        new Error('this.usecaseForismatic.getRandomQuote', { cause: quoteResult.value }),
        'getRandomQuote',
      );

      return ctx.answerCbQuery('Не удалось получить цитату');
    }

    return ctx.reply(
      `<b>Случайная цитата</b>

<blockquote>${quoteResult.value.quote}</blockquote>

${quoteResult.value.reference.length ? `<i>${quoteResult.value.reference}</i>` : 'Неизвестный автор'}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([Markup.button.callback('Еще цитату', 'quote:forismatic')]),
      },
    );
  }

  async actionQuoteForismatic(ctx: BotContext) {
    const quoteResult = await this.usecaseForismatic.getRandomQuote(ctx.routineTasks);
    if (quoteResult.result === 'error') {
      this.deps.logger.error(
        new Error('this.usecaseForismatic.getRandomQuote', { cause: quoteResult.value }),
        'getRandomQuote',
      );

      return ctx.answerCbQuery('Не удалось получить цитату');
    }

    return ctx.editMessageText(
      `<b>Случайная цитата</b>

<blockquote>${quoteResult.value.quote}</blockquote>

${quoteResult.value.reference.length ? `<i>${quoteResult.value.reference}</i>` : 'Неизвестный автор'}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([Markup.button.callback('Еще цитату', 'quote:forismatic')]),
      },
    );
  }
}
