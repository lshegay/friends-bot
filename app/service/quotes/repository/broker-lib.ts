import type { RoutineTask } from '~/entities/routines';
import type { MessageBroker } from '~lib/message-broker';
import type { RoutinesRepositoryTasks as RoutinesUsecaseRepositoryTasks } from '../usecase/local/repository';
import { ok, type Err, type Ok } from '~lib/errors';

export type Dependencies = {
  mb: MessageBroker<RoutineTask>;
};

export class RoutinesRepositoryTasks implements RoutinesUsecaseRepositoryTasks {
  constructor(private readonly deps: Dependencies) {}

  async setTask(task: RoutineTask): Promise<Ok<RoutineTask> | Err<Error>> {
    const messages = this.deps.mb.addMessage(task);

    return ok(messages);
  }
}
