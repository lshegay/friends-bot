import dayjs from 'dayjs';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Context } from '~/entities/context';
import type { Drink, DrinkProgress } from '~/entities/drinks/types';
import { type DrinkDB, type DrinkProgressDB, drinksProgressTable, drinksTable } from '~db/drinks';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import { ErrorDrinkNotFound, ErrorDrinkProgressNotFound } from '../usecase/errors';
import type { DrinksDBRepository } from '../usecase/repository';

export type Dependencies = {
  db: BunSQLDatabase;
};

export class DrinksPostgresRepository implements DrinksDBRepository {
  constructor(private readonly deps: Dependencies) {}

  async getDrinks(ctx: Context): Promise<Ok<Drink[]> | Err<Error>> {
    const drinksResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(drinksTable)
        .where(and(eq(drinksTable.chatId, ctx.chat.id), isNull(drinksTable.deletedAt)))
        .execute(),
    );
    if (drinksResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(drinksTable).where(and(eq(drinksTable.chatId, ctx.chat.id), isNull(drinksTable.deletedAt))).execute()',
          { cause: drinksResult.value },
        ),
      );
    }

    return ok(drinksResult.value.map((drink) => transformDrink(drink)));
  }

  async getDrinkByName(ctx: Context, name: string): Promise<Ok<Drink> | Err<Error>> {
    const drinkResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(drinksTable)
        .where(
          and(
            eq(drinksTable.chatId, ctx.chat.id),
            isNull(drinksTable.deletedAt),
            eq(sql`lower(${drinksTable.name})`, name),
          ),
        )
        .limit(1)
        .execute(),
    );
    if (drinkResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(drinksTable).where(and(eq(drinksTable.chatId, ctx.chat.id), isNull(drinksTable.deletedAt), eq(sql`lower(${drinksTable.name})`, name))).limit(1).execute()',
          { cause: drinkResult.value },
        ),
      );
    }

    const drink = drinkResult.value.at(0);

    if (!drink) {
      return err(
        new ErrorDrinkNotFound(
          'this.deps.db.select().from(drinksTable).where(and(eq(drinksTable.chatId, ctx.chat.id), isNull(drinksTable.deletedAt), eq(sql`lower(${drinksTable.name})`, name))).limit(1).execute()',
        ),
      );
    }

    return ok(transformDrink(drink));
  }

  async createDrink(ctx: Context, drink: Drink): Promise<Ok<Drink> | Err<Error>> {
    const drinkResult = await trycatch(() =>
      this.deps.db
        .insert(drinksTable)
        .values({
          id: drink.id,
          chatId: ctx.chat.id,

          name: drink.name,
          description: drink.description,
          imageId: drink.imageId,
          imageDrinkId: drink.imageDrinkId,
          imageDrinkGoneBadId: drink.imageDrinkGoneBadId,
          imageDrinkEmptyId: drink.imageDrinkEmptyId,

          sips: drink.sips,
          freshness: drink.freshness,

          createdAt: new Date(),
        })
        .returning()
        .execute(),
    );
    if (drinkResult.result === 'error') {
      if (drinkResult.value.message.includes('duplicate key value violates unique constraint')) {
        const drinkResult = await trycatch(() =>
          this.deps.db
            .update(drinksTable)
            .set({
              ...drink,
              updatedAt: new Date(),
              deletedAt: null,
            })
            .where(and(eq(drinksTable.name, drink.name), eq(drinksTable.chatId, ctx.chat.id)))
            .returning()
            .execute(),
        );
        if (drinkResult.result === 'error') {
          return err(
            new Error(
              'this.deps.db.update(drinksTable).set({ ...drink, updatedAt: new Date(), }).returning().execute()',
              {
                cause: drinkResult.value,
              },
            ),
          );
        }

        return ok(transformDrink(drinkResult.value[0]));
      }

      return err(
        new Error(
          'this.deps.db.insert(drinksTable).values({ id: drink.id, chatId: ctx.chat.id, name: drink.name, description: drink.description, imageId: drink.imageId, imageDrinkId: drink.imageDrinkId, imageDrinkGoneBadId: drink.imageDrinkGoneBadId, imageDrinkEmptyId: drink.imageDrinkEmptyId, sips: drink.sips, freshness: drink.freshness, createdAt: new Date(), })',
          { cause: drinkResult.value },
        ),
      );
    }

    return ok(transformDrink(drinkResult.value[0]));
  }

  async updateDrink(
    ctx: Context,
    drinkId: string,
    drink: Partial<Omit<Drink, 'id'>>,
  ): Promise<Ok<Drink> | Err<Error>> {
    const drinkResult = await trycatch(() =>
      this.deps.db
        .update(drinksTable)
        .set({
          ...drink,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(drinksTable.id, drinkId),
            isNull(drinksTable.deletedAt),
            eq(drinksTable.chatId, ctx.chat.id),
          ),
        )
        .returning()
        .execute(),
    );
    if (drinkResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(drinksTable).set({ ...drink, updatedAt: new Date(), }).returning().execute()',
          {
            cause: drinkResult.value,
          },
        ),
      );
    }

    return ok(transformDrink(drinkResult.value[0]));
  }

  async updateDrinkByName(
    ctx: Context,
    drinkName: string,
    drink: Partial<Omit<Drink, 'id'>>,
  ): Promise<Ok<Drink> | Err<Error>> {
    const drinkResult = await trycatch(() =>
      this.deps.db
        .update(drinksTable)
        .set({
          ...drink,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(drinksTable.name, drinkName),
            isNull(drinksTable.deletedAt),
            eq(drinksTable.chatId, ctx.chat.id),
          ),
        )
        .returning()
        .execute(),
    );
    if (drinkResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(drinksTable).set({ ...drink, updatedAt: new Date(), }).returning().execute()',
          {
            cause: drinkResult.value,
          },
        ),
      );
    }

    return ok(transformDrink(drinkResult.value[0]));
  }

  async deleteDrink(ctx: Context, drinkId: string): Promise<Ok<void> | Err<Error>> {
    const now = new Date();

    const drinkResult = await trycatch(() =>
      this.deps.db
        .update(drinksTable)
        .set({ updatedAt: now, deletedAt: now })
        .where(
          and(
            eq(drinksTable.id, drinkId),
            isNull(drinksTable.deletedAt),
            eq(drinksTable.chatId, ctx.chat.id),
          ),
        )
        .returning()
        .execute(),
    );
    if (drinkResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.delete(drinksTable).where(and(eq(drinksTable.id, drinkId), isNull(drinksTable.deletedAt), eq(drinksTable.chatId, ctx.chat.id))).returning().execute()',
          { cause: drinkResult.value },
        ),
      );
    }

    const deleteProgressResult = await trycatch(() =>
      this.deps.db
        .delete(drinksProgressTable)
        .where(eq(drinksProgressTable.drinkId, drinkId))
        .execute(),
    );
    if (deleteProgressResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.delete(drinksProgressTable).where(eq(drinksProgressTable.drinkId, drinkId)).execute()',
          { cause: deleteProgressResult.value },
        ),
      );
    }

    return ok<void>();
  }

  async getDrinkProgress(ctx: Context, drinkId: string): Promise<Ok<DrinkProgress> | Err<Error>> {
    const drinkProgressResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(drinksProgressTable)
        .fullJoin(
          drinksTable,
          and(eq(drinksTable.id, drinksProgressTable.drinkId), isNull(drinksTable.deletedAt)),
        )
        .where(
          and(
            eq(drinksProgressTable.drinkId, drinkId),
            eq(drinksProgressTable.profileId, ctx.profile.id),
          ),
        )
        .limit(1)
        .execute(),
    );
    if (drinkProgressResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(drinksProgressTable).where(and(eq(drinksProgressTable.drinkId, drinkId), eq(drinksProgressTable.profileId, ctx.profile.id))).limit(1).execute()',
          { cause: drinkProgressResult.value },
        ),
      );
    }

    const drinkProgress = drinkProgressResult.value.at(0)?.drinks_progress;

    if (!drinkProgress) {
      return err(
        new ErrorDrinkProgressNotFound(
          'this.deps.db.select().from(drinksProgressTable).where(and(eq(drinksProgressTable.drinkId, drinkId), eq(drinksProgressTable.profileId, ctx.profile.id))).limit(1).execute()',
        ),
      );
    }

    return ok(transformDrinkProgress(drinkProgress));
  }

  async createDrinkProgress(ctx: Context, drink: Drink): Promise<Ok<DrinkProgress> | Err<Error>> {
    const drinkProgressResult = await trycatch(() =>
      this.deps.db
        .insert(drinksProgressTable)
        .values({
          id: crypto.randomUUID(),
          drinkId: drink.id,
          profileId: ctx.profile.id,

          progress: 0,

          createdAt: new Date(),
        })
        .returning()
        .execute(),
    );
    if (drinkProgressResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.insert(drinksProgressTable).values({ id: crypto.randomUUID(), drinkId: drink.id, profileId: ctx.profile.id, progress: 0, createdAt: new Date(), }).returning().execute()',
          { cause: drinkProgressResult.value },
        ),
      );
    }

    return ok(transformDrinkProgress(drinkProgressResult.value[0]));
  }

  async updateDrinkProgress(
    ctx: Context,
    drinkProgressId: string,
    drinkProgress: Partial<Omit<DrinkProgress, 'id'>>,
  ): Promise<Ok<DrinkProgress> | Err<Error>> {
    const drinkProgressResult = await trycatch(() =>
      this.deps.db
        .update(drinksProgressTable)
        .set({
          progress: drinkProgress.progress,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(drinksProgressTable.id, drinkProgressId),
            eq(drinksProgressTable.profileId, ctx.profile.id),
          ),
        )
        .returning()
        .execute(),
    );
    if (drinkProgressResult.result === 'error') {
      // TODO: not found drink progress

      return err(
        new Error(
          'this.deps.db.update(drinksProgressTable).set({ progress: drinkProgress.progress, updatedAt: new Date(), }).where(and(eq(drinksProgressTable.id, drinkProgressId), eq(drinksProgressTable.profileId, ctx.profile.id))).returning().execute()',
          { cause: drinkProgressResult.value },
        ),
      );
    }

    return ok(transformDrinkProgress(drinkProgressResult.value[0]));
  }

  async deleteDrinkProgress(ctx: Context, drinkProgressId: string): Promise<Ok<void> | Err<Error>> {
    const drinkProgressResult = await trycatch(() =>
      this.deps.db
        .delete(drinksProgressTable)
        .where(
          and(
            eq(drinksProgressTable.id, drinkProgressId),
            eq(drinksProgressTable.profileId, ctx.profile.id),
          ),
        )
        .returning()
        .execute(),
    );
    if (drinkProgressResult.result === 'error') {
      // TODO: not found drink progress

      return err(
        new Error(
          'this.deps.db.delete(drinksProgressTable).where(and(eq(drinksProgressTable.id, drinkProgressId), eq(drinksProgressTable.profileId, ctx.profile.id))).returning().execute()',
          { cause: drinkProgressResult.value },
        ),
      );
    }

    return ok<void>();
  }
}

export function transformDrink(drink: DrinkDB): Drink {
  return {
    id: drink.id,
    chatId: drink.chatId,

    name: drink.name,
    description: drink.description,
    imageId: drink.imageId,
    imageDrinkId: drink.imageDrinkId,
    imageDrinkGoneBadId: drink.imageDrinkGoneBadId ?? undefined,
    imageDrinkEmptyId: drink.imageDrinkEmptyId,

    sips: drink.sips,
    freshness: drink.freshness,

    createdAt: dayjs.utc(drink.createdAt).tz(undefined, true).toDate(),
    updatedAt: drink.updatedAt
      ? dayjs.utc(drink.updatedAt).tz(undefined, true).toDate()
      : undefined,
    deletedAt: drink.deletedAt
      ? dayjs.utc(drink.deletedAt).tz(undefined, true).toDate()
      : undefined,
  };
}

export function transformDrinkProgress(drinkProgress: DrinkProgressDB): DrinkProgress {
  return {
    id: drinkProgress.id,
    drinkId: drinkProgress.drinkId,
    profileId: drinkProgress.profileId,

    progress: drinkProgress.progress,

    createdAt: dayjs.utc(drinkProgress.createdAt).tz(undefined, true).toDate(),
    updatedAt: drinkProgress.updatedAt
      ? dayjs.utc(drinkProgress.updatedAt).tz(undefined, true).toDate()
      : undefined,
  };
}
