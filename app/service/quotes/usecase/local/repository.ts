import type { QuotesCategory } from '~/entities/quotes';
import type { RoutineTask } from '~/entities/routines';
import type { Err, Ok } from '~lib/errors';

export interface QuotesRepository {
  getQuotesCategories(): Promise<Ok<QuotesCategory[]> | Err<Error>>;
  getQuotesCategory: (id: string) => Promise<Ok<QuotesCategory> | Err<Error>>;
}

export interface RoutinesRepositoryTasks {
  setTask: (task: RoutineTask) => Promise<Ok<RoutineTask> | Err<Error>>;
}
