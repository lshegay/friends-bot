import type { S3Client } from 'bun';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { NarrowedContext, Scenes, Telegraf, Types } from 'telegraf';
import { Stage } from 'telegraf/scenes';
import type { BotContext } from '~/delivery/middlewares/context';
import type { RoutineTask } from '~/entities/routines';
import { AttachmentsPostgresRepository } from '~/service/attachments/repository/postgres';
import { AttachmentsObjectRepository } from '~/service/attachments/repository/s3';
import { AttachmentsTelegrafRepository } from '~/service/attachments/repository/telegraf';
import { AttachmentsGetter } from '~lib/attachments-getter';
import { errIs, trycatch } from '~lib/errors';
import type { MessageBroker } from '~lib/message-broker';
import { RoutinesRepositoryTasks } from '../repository/broker-lib';
import { DrinksPostgresRepository } from '../repository/postgres';
import { DrinksUsecase } from '../usecase';
import { ErrorDrinkNotFound, ErrorDrinkProgressNotFound } from '../usecase/errors';
import { CREATE_DRINK_WIZARD_ID, newCreateDrinkWizard } from './telegram-create-drink';
import { message } from 'telegraf/filters';

export type Options = {
  s3Bucket: string;

  s3LinksExpiration: number; // seconds
};

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  s3: S3Client;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const delivery = new TelegramDrinksDelivery(deps, options);

  deps.bot.use(new Stage([delivery.createDrinkWizard]));

  deps.bot.hears(/^(Н|н)алей (.[^\.]+)\.?$/, delivery.hearsPourDrink.bind(delivery));
  deps.bot.hears(/^(В|в)ыпить (.[^\.]+)\.?$/, delivery.hearsDrinkDrink.bind(delivery));
  deps.bot.command('drinks', delivery.commandDrinks.bind(delivery));

  return [
    {
      command: 'drinks',
      description: 'Список доступных напитков',
    },
  ];
}

export class TelegramDrinksDelivery {
  usecase: DrinksUsecase;

  createDrinkWizard: Scenes.WizardScene<BotContext>;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    const repositoryDB = new DrinksPostgresRepository({ db: this.deps.db });
    const repositoryRoutinesTasks = new RoutinesRepositoryTasks({ mb: deps.tasksMessageBroker });

    const attachmentsGetter = new AttachmentsGetter({
      dbRepository: new AttachmentsPostgresRepository({ db: this.deps.db }),
      objectRepository: new AttachmentsObjectRepository(
        { s3: this.deps.s3 },
        {
          s3Bucket: this.options.s3Bucket,

          s3LinksExpiration: this.options.s3LinksExpiration,
        },
      ),
      externalRepository: new AttachmentsTelegrafRepository({ telegram: this.deps.bot.telegram }),
    });

    this.usecase = new DrinksUsecase({
      repositoryDB,
      attachments: attachmentsGetter,
      repositoryRoutinesTasks,
    });

    this.createDrinkWizard = newCreateDrinkWizard({
      usecase: this.usecase,
      attachmentsGetter,
      logger: this.deps.logger,
    }) as Scenes.WizardScene<BotContext<unknown>>;
  }

  async hearsPourDrink(
    ctx: NarrowedContext<
      BotContext,
      Types.MountMap[Types.UpdateType | 'message' | 'channel_post']
    > & { match: RegExpExecArray },
  ) {
    const drinkName = ctx.match.at(2)?.toLowerCase();
    if (!drinkName?.length) return ctx.reply('Такого напитка у нас нет 😔.');

    const drinkResult = await this.usecase.pourDrink(
      {
        profile: ctx.profile,
        chat: ctx.profileChat,
        routine: ctx.routine,
        routineTasks: ctx.routineTasks,
      },
      drinkName,
    );
    if (drinkResult.result === 'error') {
      if (errIs(drinkResult.value, ErrorDrinkNotFound)) {
        return ctx.reply('Такого напитка у нас нет 😔.');
      }

      this.deps.logger.error(
        new Error('this.usecase.pourDrink', { cause: drinkResult.value }),
        'hearsPourDrink',
      );

      return;
    }

    const { drink, image } = drinkResult.value;

    const options = { caption: `Я налила вам ${drink.name}, мой Лорд.` };

    const replyResult = await trycatch(() => ctx.replyWithPhoto(image, options));
    if (replyResult.result === 'error' && 'description' in replyResult.value) {
      if (
        replyResult.value.description === "Bad Request: can't use file of type Animation as Photo"
      ) {
        return ctx.replyWithAnimation(image, options);
      }

      this.deps.logger.error(
        new Error('ctx.replyWithPhoto', { cause: replyResult.value }),
        'hearsPourDrink',
      );

      return;
    }
  }

  async hearsDrinkDrink(
    ctx: NarrowedContext<
      BotContext,
      Types.MountMap[Types.UpdateType | 'message' | 'channel_post']
    > & { match: RegExpExecArray },
  ) {
    const drinkName = ctx.match.at(2)?.toLowerCase();
    if (!drinkName?.length) return ctx.reply('Такого напитка у нас нет 😔.');

    const drinkResult = await this.usecase.drinkDrink(
      {
        profile: ctx.profile,
        chat: ctx.profileChat,
        routine: ctx.routine,
        routineTasks: ctx.routineTasks,
      },
      drinkName,
    );
    if (drinkResult.result === 'error') {
      if (errIs(drinkResult.value, ErrorDrinkNotFound)) {
        return ctx.reply('Такого напитка у нас нет 😔.');
      }

      if (errIs(drinkResult.value, ErrorDrinkProgressNotFound)) {
        return ctx.reply('Вы не налили этот напиток, чтобы выпить его.');
      }

      this.deps.logger.error(
        new Error('this.usecase.drinkDrink', { cause: drinkResult.value }),
        'hearsDrinkDrink',
      );

      return;
    }

    const { drink, image, status } = drinkResult.value;

    switch (status) {
      case 'OK': {
        const options = { caption: `Вы пьете ${drink.name}.` };

        const replyResult = await trycatch(() => ctx.replyWithPhoto(image, options));
        if (replyResult.result === 'error' && 'description' in replyResult.value) {
          if (
            replyResult.value.description ===
            "Bad Request: can't use file of type Animation as Photo"
          ) {
            return ctx.replyWithAnimation(image, options);
          }

          this.deps.logger.error(
            new Error('ctx.replyWithPhoto', { cause: replyResult.value }),
            'hearsPourDrink',
          );
        }

        return;
      }
      case 'JUST_BEEN_DRUNK': {
        const options = { caption: `Вы пьете ${drink.name}. Вы полностью выпили напиток.` };

        const replyResult = await trycatch(() => ctx.replyWithPhoto(image, options));
        if (replyResult.result === 'error' && 'description' in replyResult.value) {
          if (
            replyResult.value.description ===
            "Bad Request: can't use file of type Animation as Photo"
          ) {
            return ctx.replyWithAnimation(image, options);
          }

          this.deps.logger.error(
            new Error('ctx.replyWithPhoto', { cause: replyResult.value }),
            'hearsPourDrink',
          );
        }

        return;
      }
      case 'GONE_BAD': {
        const options = {
          caption: `О нет! Вы хотели выпить ${drink.name}, но срок годности уже истек!`,
        };

        const replyResult = await trycatch(() => ctx.replyWithPhoto(image, options));
        if (replyResult.result === 'error' && 'description' in replyResult.value) {
          if (
            replyResult.value.description ===
            "Bad Request: can't use file of type Animation as Photo"
          ) {
            return ctx.replyWithAnimation(image, options);
          }

          this.deps.logger.error(
            new Error('ctx.replyWithPhoto', { cause: replyResult.value }),
            'hearsPourDrink',
          );
        }

        return;
      }
      case 'EMPTY': {
        const options = { caption: `Вы хотели выпить ${drink.name}, но ваш стакан пуст.` };

        const replyResult = await trycatch(() => ctx.replyWithPhoto(image, options));
        if (replyResult.result === 'error' && 'description' in replyResult.value) {
          if (
            replyResult.value.description ===
            "Bad Request: can't use file of type Animation as Photo"
          ) {
            return ctx.replyWithAnimation(image, options);
          }

          this.deps.logger.error(
            new Error('ctx.replyWithPhoto', { cause: replyResult.value }),
            'hearsPourDrink',
          );
        }

        return;
      }
    }
  }

  async commandDrinks(
    ctx: NarrowedContext<BotContext, Types.MountMap['text']> & Types.CommandContextExtn,
  ) {
    const context = {
      profile: ctx.profile,
      chat: ctx.profileChat,
      routine: ctx.routine,
      routineTasks: ctx.routineTasks,
    };

    const args = ctx.args;
    if (args.at(0)?.length) {
      const cmd = args[0];

      switch (cmd) {
        case 'create': {
          return ctx.scene.enter(CREATE_DRINK_WIZARD_ID);
        }

        case 'delete': {
          if (args.length < 2) {
            return ctx.reply('Вы не указали, какой напиток удалить.');
          }

          const drinkName = args[1].trim().toLowerCase();

          const deleteResult = await this.usecase.deleteDrink(context, drinkName);
          if (deleteResult.result === 'error') {
            if (errIs(deleteResult.value, ErrorDrinkNotFound)) {
              return ctx.reply('Такого напитка у нас нет 😔.');
            }

            this.deps.logger.error(
              new Error('this.usecase.deleteDrink', { cause: deleteResult.value }),
              'commandDrinks',
            );

            return;
          }

          return ctx.reply('Напиток был удален.');
        }

        default:
          break;
      }
    }

    const drinksResult = await this.usecase.getDrinks(context);
    if (drinksResult.result === 'error') {
      this.deps.logger.error(
        new Error('this.usecase.getDrinks', { cause: drinksResult.value }),
        'commandDrinks',
      );

      return;
    }

    const drinks = drinksResult.value;

    const drinksList = drinks
      .map(
        (drink) =>
          `• *${drink.name}* \\- ${drink.description.replaceAll('.', '\\.')} \\(объем: ${drink.sips} глотков${drink.freshness > 0 ? ', может испортиться' : ''}\\)\\.`,
      )
      .join('\n');

    return ctx.replyWithMarkdownV2(`Сегодня у нас в меню:

${drinks.length ? drinksList : '*Нет доступных напитков\\.*'}
  
Вы можете попросить меня налить какой\\-нибудь из этих напитков, сказав: *"Налей \\<напиток\\>"*\\.

После заказа вы можете выпить напиток, сказав: *"Выпить \\<напиток\\>"*\\.

Если вы налили напиток, но не выпили его, он может испортиться\\. Если ваш стакан пуст, я вас об этом уведомлю\\.`);
  }
}
