import type { RoutinesRepositoryTasks } from '../usecase/repository';

export type Dependencies = {
  repositoryRoutinesTasks: RoutinesRepositoryTasks;
};

export class GamesUsecase {
  constructor(private readonly deps: Dependencies) {}

  getRandomNumber(max: number, min = 0) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
