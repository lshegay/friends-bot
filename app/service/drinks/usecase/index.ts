import dayjs from 'dayjs';
import type { Context } from '~/entities/context';
import type { Drink, DrinkProgress } from '~/entities/drinks/types';
import type { AttachmentsGetter } from '~lib/attachments-getter';
import { type Err, type Ok, err, errIs, ok } from '~lib/errors';
import type { DrinksDBRepository, RoutinesRepositoryTasks } from '../usecase/repository';
import { ErrorDrinkProgressNotFound } from './errors';
import type { DrinkProgressStatus } from './statuses';

export type Dependencies = {
  repositoryDB: DrinksDBRepository;
  attachments: AttachmentsGetter;
  repositoryRoutinesTasks: RoutinesRepositoryTasks;
};

export class DrinksUsecase {
  constructor(private readonly deps: Dependencies) {}

  async pourDrink(
    ctx: Context,
    drinkName: string,
  ): Promise<Ok<{ drink: Drink; image: string }> | Err<Error>> {
    const drinkResult = await this.deps.repositoryDB.getDrinkByName(
      ctx,
      drinkName.trim().toLowerCase(),
    );
    if (drinkResult.result === 'error') {
      return err(new Error('this.deps.repository.getDrinkByName', { cause: drinkResult.value }));
    }

    const drinkProgressResult = await this.deps.repositoryDB.getDrinkProgress(
      ctx,
      drinkResult.value.id,
    );
    if (drinkProgressResult.result === 'error') {
      if (!errIs(drinkProgressResult.value, ErrorDrinkProgressNotFound)) {
        return err(
          new Error('this.deps.repository.getDrinkProgress', { cause: drinkProgressResult.value }),
        );
      }
    } else {
      const deleteResult = await this.deps.repositoryDB.deleteDrinkProgress(
        ctx,
        drinkProgressResult.value.id,
      );
      if (deleteResult.result === 'error') {
        return err(
          new Error('this.deps.repository.deleteDrinkProgress', { cause: deleteResult.value }),
        );
      }
    }

    const drink = drinkResult.value;

    const progressResult = await this.deps.repositoryDB.createDrinkProgress(ctx, drink);
    if (progressResult.result === 'error') {
      return err(
        new Error('this.deps.repository.createdDrinkProgress', { cause: progressResult.value }),
      );
    }

    const imageResult = await this.deps.attachments.getFileSource(drink.imageId);
    if (imageResult.result === 'error') {
      return err(
        new Error('this.deps.repositoryAttachments.getFileSource', { cause: imageResult.value }),
      );
    }

    const image = imageResult.value;

    return ok({ drink, image });
  }

  async drinkDrink(
    ctx: Context,
    drinkName: string,
  ): Promise<
    | Ok<{
        drink: Drink;
        progress: DrinkProgress | null;
        image: string;
        status: DrinkProgressStatus;
      }>
    | Err<Error>
  > {
    const drinkResult = await this.deps.repositoryDB.getDrinkByName(
      ctx,
      drinkName.trim().toLowerCase(),
    );
    if (drinkResult.result === 'error') {
      return err(new Error('this.deps.repository.getDrinkByName', { cause: drinkResult.value }));
    }

    const drink = drinkResult.value;

    const progressResult = await this.deps.repositoryDB.getDrinkProgress(ctx, drink.id);
    if (progressResult.result === 'error') {
      if (errIs(progressResult.value, ErrorDrinkProgressNotFound)) {
        const imageResult = await this.deps.attachments.getFileSource(drink.imageDrinkEmptyId);
        if (imageResult.result === 'error') {
          return err(
            new Error('this.deps.repositoryAttachments.getFileSource', {
              cause: imageResult.value,
            }),
          );
        }

        const image = imageResult.value;

        return ok({ drink, progress: null, image, status: 'EMPTY' as const });
      }

      return err(
        new Error('this.deps.repository.getDrinkProgress', { cause: progressResult.value }),
      );
    }

    let progress = progressResult.value;

    if (drink.freshness > 0) {
      const now = dayjs();

      const isFresh = now.isBefore(dayjs(progress.createdAt).add(drink.freshness, 'ms'));
      if (!isFresh) {
        const deleteProgressResult = await this.deps.repositoryDB.deleteDrinkProgress(
          ctx,
          progress.id,
        );
        if (deleteProgressResult.result === 'error') {
          return err(
            new Error('this.deps.repository.deleteDrinkProgress', {
              cause: deleteProgressResult.value,
            }),
          );
        }

        if (!drink.imageDrinkGoneBadId) {
          return err(new Error(`drink.imageDrinkGoneBadId is not set: drinkId = ${drink.id}`));
        }

        const imageResult = await this.deps.attachments.getFileSource(drink.imageDrinkGoneBadId);
        if (imageResult.result === 'error') {
          return err(
            new Error('this.deps.repositoryAttachments.getFileSource', {
              cause: imageResult.value,
            }),
          );
        }

        const image = imageResult.value;

        return ok({ drink, progress, image, status: 'GONE_BAD' as const });
      }
    }

    if (progress.progress < drink.sips) {
      const updateProgressResult = await this.deps.repositoryDB.updateDrinkProgress(
        ctx,
        progress.id,
        {
          progress: progress.progress + 1,
        },
      );
      if (updateProgressResult.result === 'error') {
        return err(
          new Error('this.deps.repository.updateDrinkProgress', {
            cause: updateProgressResult.value,
          }),
        );
      }

      progress = updateProgressResult.value;
    }

    if (progress.progress >= drink.sips) {
      const deleteProgressResult = await this.deps.repositoryDB.deleteDrinkProgress(
        ctx,
        progress.id,
      );
      if (deleteProgressResult.result === 'error') {
        return err(
          new Error('this.deps.repository.deleteDrinkProgress', {
            cause: deleteProgressResult.value,
          }),
        );
      }

      const imageResult = await this.deps.attachments.getFileSource(drink.imageDrinkId);
      if (imageResult.result === 'error') {
        return err(
          new Error('this.deps.repositoryAttachments.getFileSource', { cause: imageResult.value }),
        );
      }

      const image = imageResult.value;

      const task = ctx.routineTasks.find(
        (task) => task.taskName === 'DRINK_DRINK' && task.status === 'active',
      );
      if (task) {
        await this.deps.repositoryRoutinesTasks.setTask({
          ...task,
          args: { drinkName: drink.name },
          status: 'completed',
        });
      }

      return ok({ drink, progress: null, image, status: 'JUST_BEEN_DRUNK' as const });
    }

    const imageResult = await this.deps.attachments.getFileSource(drink.imageDrinkId);
    if (imageResult.result === 'error') {
      return err(
        new Error('this.deps.repositoryAttachments.getFileSource', { cause: imageResult.value }),
      );
    }

    const image = imageResult.value;

    return ok({ drink, progress, image, status: 'OK' as const });
  }

  async getDrinks(ctx: Context): Promise<Ok<Drink[]> | Err<Error>> {
    const drinksResult = await this.deps.repositoryDB.getDrinks(ctx);
    if (drinksResult.result === 'error') {
      return err(new Error('this.deps.repository.getDrinks', { cause: drinksResult.value }));
    }

    return ok(drinksResult.value);
  }

  async addDrink(ctx: Context, drink: Drink): Promise<Ok<Drink> | Err<Error>> {
    const drinkResult = await this.deps.repositoryDB.createDrink(ctx, drink);
    if (drinkResult.result === 'error') {
      return err(new Error('this.deps.repository.createDrink', { cause: drinkResult.value }));
    }

    return ok(drinkResult.value);
  }

  async deleteDrink(ctx: Context, drinkName: string): Promise<Ok<void> | Err<Error>> {
    const drinkResult = await this.deps.repositoryDB.getDrinkByName(
      ctx,
      drinkName.trim().toLowerCase(),
    );
    if (drinkResult.result === 'error') {
      return err(new Error('this.deps.repository.getDrinkByName', { cause: drinkResult.value }));
    }

    const drink = drinkResult.value;

    const deleteResult = await this.deps.repositoryDB.deleteDrink(ctx, drink.id);
    if (deleteResult.result === 'error') {
      return err(new Error('this.deps.repository.deleteDrink', { cause: deleteResult.value }));
    }

    return ok<void>();
  }
}
