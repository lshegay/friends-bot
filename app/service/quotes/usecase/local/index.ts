import type { Quote, QuotesCategory } from '~/entities/quotes';
import type { RoutineTask } from '~/entities/routines';
import { type Err, type Ok, err, ok } from '~lib/errors';
import type { QuotesRepository, RoutinesRepositoryTasks } from './repository';

export type Dependencies = {
  repository: QuotesRepository;
  repositoryRoutinesTasks: RoutinesRepositoryTasks;
};

export class QuotesUsecase {
  constructor(private readonly deps: Dependencies) {}

  async getCategories(): Promise<Ok<QuotesCategory[]> | Err<Error>> {
    const categoriesResult = await this.deps.repository.getQuotesCategories();
    if (categoriesResult.result === 'error') {
      return err(
        new Error('this.deps.repository.getQuotesCategories', { cause: categoriesResult.value }),
      );
    }
    const categories = categoriesResult.value;

    return ok(categories);
  }

  async getRandomQuote(
    categoryId: string,
    routineTasks: RoutineTask[],
  ): Promise<Ok<{ category: QuotesCategory; quote: Quote }> | Err<Error>> {
    const categoryResult = await this.deps.repository.getQuotesCategory(categoryId);
    if (categoryResult.result === 'error') {
      return err(new Error('this.deps.repository.getQuotes', { cause: categoryResult.value }));
    }

    const category = categoryResult.value;
    if (!category.quotes.length) {
      return err(new Error('quotes.length: no quotes found in category'));
    }

    const task = routineTasks.find(
      (task) => task.taskName === 'READ_QUOTE' && task.status === 'active',
    );
    if (task) {
      await this.deps.repositoryRoutinesTasks.setTask({
        ...task,
        status: 'completed',
      });
    }

    const index = Math.floor(Math.random() * category.quotes.length);
    const quote = category.quotes[index];

    return ok({
      category,
      quote,
    });
  }
}
