import type { Logger } from 'pino';
import { Scenes } from 'telegraf';
import type { PhotoSize } from 'telegraf/types';
import type { BotContext } from '~/delivery/middlewares/context';
import type { Attachment } from '~/entities/attachments';
import type { Drink } from '~/entities/drinks/types';
import type { AttachmentsGetter } from '~lib/attachments-getter';
import { err, ok } from '~lib/errors';
import type { DrinksUsecase } from '../usecase';

export const CREATE_DRINK_WIZARD_ID = 'CREATE_DRINK_WIZARD';

export type Dependencies = {
  usecase: DrinksUsecase;
  attachmentsGetter: AttachmentsGetter;
  logger: Logger;
};

export type DrinkWizardState = {
  drink: Drink;
  imagesExternalIds: {
    imageId: string;
    imageDrinkId: string;
    imageDrinkEmptyId: string;
    imageDrinkGoneBadId: string;
  };
};

export function newCreateDrinkWizard(deps: Dependencies) {
  const wiz = new Scenes.WizardScene<BotContext<DrinkWizardState>>(
    CREATE_DRINK_WIZARD_ID,
    (ctx) => {
      ctx.scene.state = {
        drink: {
          id: crypto.randomUUID(),
          chatId: ctx.profileChat.id,

          name: '',
          description: '',
          sips: 1,
          freshness: 0,

          imageId: '',
          imageDrinkId: '',
          imageDrinkEmptyId: '',
          imageDrinkGoneBadId: undefined,

          createdAt: new Date(),
        } satisfies Drink,
        imagesExternalIds: {
          imageId: '',
          imageDrinkId: '',
          imageDrinkEmptyId: '',
          imageDrinkGoneBadId: '',
        },
      };

      ctx.reply('Введите название напитка');

      ctx.wizard.next();
    },
    (ctx) => {
      if (!ctx.message || !('text' in ctx.message) || !ctx.message.text.length) {
        ctx.reply('Название напитка не может быть пустым');
        return;
      }

      ctx.scene.state.drink.name = ctx.message.text;

      ctx.reply('Введите описание напитка');

      ctx.wizard.next();
      return;
    },

    (ctx) => {
      if (!ctx.message || !('text' in ctx.message) || !ctx.message.text.length) {
        ctx.reply('Описание напитка не может быть пустым');
        return;
      }

      ctx.scene.state.drink.description = ctx.message.text;

      ctx.reply(
        'Введите число, которое будет определять, сколько глотков нужно сделать пользователю, чтобы выпить напиток. Значение: не меньше 1, только целые числа)',
      );

      ctx.wizard.next();
      return;
    },
    (ctx) => {
      if (
        !ctx.message ||
        !('text' in ctx.message) ||
        !ctx.message.text.length ||
        Number.isNaN(Number.parseInt(ctx.message.text, 10))
      ) {
        ctx.reply(
          'Необходимо ввести число, которое будет определять, сколько глотков нужно сделать пользователю, чтобы выпить напиток. Значение: не меньше 1, только целые числа)',
        );
        return;
      }

      const sips = Number.parseInt(ctx.message.text, 10);
      if (sips < 1) {
        ctx.reply('Процент напитка должен быть не меньше 1');
        return;
      }

      ctx.scene.state.drink.sips = sips;

      ctx.reply('Отправьте изображение напитка');

      ctx.wizard.next();
      return;
    },
    (ctx) => {
      if (!ctx.message) {
        ctx.reply('Необходимо отправить изображение напитка');
        return;
      }

      if ('photo' in ctx.message && ctx.message.photo.length) {
        const photo = ctx.message.photo.at(-1) as PhotoSize;

        ctx.scene.state.imagesExternalIds.imageId = photo.file_id;
      } else if (
        'document' in ctx.message &&
        'animation' in ctx.message &&
        ctx.message.document.mime_type === 'video/mp4' &&
        ctx.message.document.file_name?.endsWith('.mp4')
      ) {
        const document = ctx.message.document;

        ctx.scene.state.imagesExternalIds.imageId = document.file_id;
      } else {
        return ctx.reply('Необходимо отправить изображение напитка');
      }

      ctx.reply(
        'Отправьте изображение, которое будет отображаться, когда пользователь пьет напиток',
      );

      ctx.wizard.next();
      return;
    },
    (ctx) => {
      if (!ctx.message) {
        ctx.reply(
          'Необходимо отправить изображение, которое будет отображаться, когда пользователь пьет напиток',
        );
        return;
      }

      if ('photo' in ctx.message && ctx.message.photo.length) {
        const photo = ctx.message.photo.at(-1) as PhotoSize;

        ctx.scene.state.imagesExternalIds.imageDrinkId = photo.file_id;
      } else if (
        'document' in ctx.message &&
        'animation' in ctx.message &&
        ctx.message.document.mime_type === 'video/mp4' &&
        ctx.message.document.file_name?.endsWith('.mp4')
      ) {
        const document = ctx.message.document;

        ctx.scene.state.imagesExternalIds.imageDrinkId = document.file_id;
      } else {
        return ctx.reply('Необходимо отправить изображение напитка');
      }

      ctx.reply('Отправьте изображение, которое будет отображаться, когда напиток пуст');

      ctx.wizard.next();
      return;
    },
    (ctx) => {
      if (!ctx.message) {
        ctx.reply(
          'Необходимо отправить изображение, которое будет отображаться, когда напиток пуст',
        );
        return;
      }

      if ('photo' in ctx.message && ctx.message.photo.length) {
        const photo = ctx.message.photo.at(-1) as PhotoSize;

        ctx.scene.state.imagesExternalIds.imageDrinkEmptyId = photo.file_id;
      } else if (
        'document' in ctx.message &&
        'animation' in ctx.message &&
        ctx.message.document.mime_type === 'video/mp4' &&
        ctx.message.document.file_name?.endsWith('.mp4')
      ) {
        const document = ctx.message.document;

        ctx.scene.state.imagesExternalIds.imageDrinkEmptyId = document.file_id;
      } else {
        return ctx.reply('Необходимо отправить изображение напитка');
      }

      ctx.reply(
        'Отправьте число в миллисекундах, через которое напиток испортится (по умолчанию 0, т.е. напиток не может испортиться)',
      );

      ctx.wizard.next();
      return;
    },
    (ctx) => {
      if (
        !ctx.message ||
        !('text' in ctx.message) ||
        !ctx.message.text.length ||
        Number.isNaN(Number.parseInt(ctx.message.text, 10))
      ) {
        ctx.reply(
          'Необходимо отправить число в миллисекундах, через которое напиток испортится (по умолчанию 0, т.е. напиток не может испортиться)',
        );
        return;
      }

      const freshness = Number.parseInt(ctx.message.text, 10);

      if (freshness < 0) {
        ctx.reply('Время порчи напитка не может быть отрицательным.');
        return;
      }

      ctx.scene.state.drink.freshness = freshness;

      if (freshness === 0) {
        ctx.reply('Готово. Напишите что-нибудь для подтверждения создания напитка.');
        ctx.wizard.selectStep(9);
        return;
      }

      ctx.reply('Отправьте изображение, которое будет отображаться, когда напиток испортится');

      ctx.wizard.next();
      return;
    },
    (ctx) => {
      if (!ctx.message) {
        ctx.reply(
          'Необходимо отправить изображение, которое будет отображаться, когда напиток испортится',
        );
        return;
      }

      if ('photo' in ctx.message && ctx.message.photo.length) {
        const photo = ctx.message.photo.at(-1) as PhotoSize;

        ctx.scene.state.imagesExternalIds.imageDrinkGoneBadId = photo.file_id;
      } else if (
        'document' in ctx.message &&
        'animation' in ctx.message &&
        ctx.message.document.mime_type === 'video/mp4' &&
        ctx.message.document.file_name?.endsWith('.mp4')
      ) {
        const document = ctx.message.document;

        ctx.scene.state.imagesExternalIds.imageDrinkGoneBadId = document.file_id;
      } else {
        return ctx.reply('Необходимо отправить изображение напитка');
      }

      ctx.reply('Готово. Напишите что-нибудь для подтверждения создания напитка.');

      ctx.wizard.next();
      return;
    },
    async (ctx) => {
      const imagesExternalIds = ctx.scene.state.imagesExternalIds;

      const imagesResult = await Promise.all(
        Object.entries(imagesExternalIds).map(async ([key, externalId]) => {
          if (!externalId.length) return [key, ok(null)] as const;

          const setFileByExternalIdResult =
            await deps.attachmentsGetter.setFileByExternalId(externalId);
          if (setFileByExternalIdResult.result === 'error') {
            deps.logger.error(
              new Error('deps.attachmentsGetter.setFileByExternalId', {
                cause: setFileByExternalIdResult.value,
              }),
              'telegram-create-drink-wizard',
            );

            return [
              key,
              err(
                new Error('deps.attachmentsGetter.setFileByExternalId', {
                  cause: setFileByExternalIdResult.value,
                }),
              ),
            ] as const;
          }

          return [key, ok(setFileByExternalIdResult.value)] as const;
        }),
      );

      if (imagesResult.some(([_, v]) => v.result === 'error')) {
        ctx.reply('Не удалось создать напиток. Попробуйте еще раз.');
        return ctx.scene.leave();
      }

      const images = Object.fromEntries(
        imagesResult
          .filter(([, v]) => v.result === 'ok' && v.value)
          .map(([key, v]) => [key, (v.value as Attachment).id]),
      );

      const drink = {
        ...ctx.scene.state.drink,
        ...images,
      };

      const addDrinkResult = await deps.usecase.addDrink(
        {
          profile: ctx.profile,
          chat: ctx.profileChat,
          routine: ctx.routine,
          routineTasks: ctx.routineTasks,
        },
        drink,
      );
      if (addDrinkResult.result === 'error') {
        deps.logger.error(
          new Error('deps.usecase.addDrink', { cause: addDrinkResult.value }),
          'telegram-create-drink-wizard',
          { drink },
        );

        ctx.reply('Не удалось создать напиток. Попробуйте еще раз.');
        return ctx.scene.leave();
      }

      ctx.reply(`${drink.name} успешно создан!`);

      return ctx.scene.leave();
    },
  );

  return wiz;
}
