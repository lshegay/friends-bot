import type { Profile } from '~/entities/profile';
import type { Routine, RoutineTask } from '~/entities/routines';
import { type Err, type Ok, err, ok } from '~lib/errors';
import type { RoutinesRepositoryTasks } from '../usecase/repository';

export type Dependencies = {
  repositoryRoutinesTasks: RoutinesRepositoryTasks;
};

export class GamesUsecase {
  constructor(private readonly deps: Dependencies) {}

  getRandomNumber(max: number, min = 0) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async getCoffee(
    profile: Profile,
    routine: Routine,
    routineTasks: RoutineTask[],
  ): Promise<Ok<void> | Err<Error>> {
    const task = routineTasks.find(
      (task) => task.taskName === 'GET_COFFEE' && task.status === 'active',
    );
    if (task) {
      const result = await this.deps.repositoryRoutinesTasks.setTask({
        ...task,
        status: 'completed',
      });
      if (result.result === 'error') {
        return err(new Error('this.deps.repositoryRoutinesTasks.setTask', { cause: result.value }));
      }

      return ok<void>();
    }

    return ok<void>();
  }
}
