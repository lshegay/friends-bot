import { type Err, type Ok, err, ok } from '~lib/errors';
import type { QuotesForismaticRepository } from './repository';
import type { Quote } from '~/entities/quotes';
import type { RoutinesRepositoryTasks } from '../local/repository';
import type { Routine, RoutineTask } from '~/entities/routines';

export type Dependencies = {
  repository: QuotesForismaticRepository;
  repositoryRoutinesTasks: RoutinesRepositoryTasks;
};

export class QuotesForismaticUsecase {
  constructor(private readonly deps: Dependencies) {}

  async getRandomQuote(routineTasks: RoutineTask[]): Promise<Ok<Quote> | Err<Error>> {
    const quoteResult = await this.deps.repository.getRandomQuote();
    if (quoteResult.result === 'error') {
      return err(new Error('this.deps.repository.getRandomQuote', { cause: quoteResult.value }));
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

    return ok(quoteResult.value);
  }
}
