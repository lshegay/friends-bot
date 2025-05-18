import type { Context } from '~/entities/context';
import type { Drink, DrinkProgress } from '~/entities/drinks/types';
import type { RoutineTask } from '~/entities/routines';
import type { Err, Ok } from '~lib/errors';

export interface DrinksDBRepository {
  getDrinks(ctx: Context): Promise<Ok<Drink[]> | Err<Error>>;
  getDrinkByName(ctx: Context, name: string): Promise<Ok<Drink> | Err<Error>>;
  createDrink(ctx: Context, drink: Drink): Promise<Ok<Drink> | Err<Error>>;
  deleteDrink(ctx: Context, drinkId: string): Promise<Ok<void> | Err<Error>>;

  getDrinkProgress(ctx: Context, drinkId: string): Promise<Ok<DrinkProgress> | Err<Error>>;
  createDrinkProgress(ctx: Context, drink: Drink): Promise<Ok<DrinkProgress> | Err<Error>>;
  updateDrinkProgress(
    ctx: Context,
    drinkProgressId: string,
    drinkProgress: Partial<Omit<DrinkProgress, 'id'>>,
  ): Promise<Ok<DrinkProgress> | Err<Error>>;
  deleteDrinkProgress(ctx: Context, drinkProgressId: string): Promise<Ok<void> | Err<Error>>;
}

export interface RoutinesRepositoryTasks {
  setTask(task: RoutineTask): Promise<Ok<RoutineTask> | Err<Error>>;
}
