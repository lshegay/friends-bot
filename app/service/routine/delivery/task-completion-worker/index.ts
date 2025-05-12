import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { Telegraf } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import type { RoutineTask, RoutineTasks } from '~/entities/routines';
import { ProfilesRepository } from '~/service/profiles/repository/postgres';
import type { MessageBroker } from '~lib/message-broker';
import { RoutinesRepositoryTasks } from '../../repository/broker-lib';
import { RoutinesRepository } from '../../repository/postgres';
import { RoutinesUsecase } from '../../usecase';

export type Dependencies = {
  db: BunSQLDatabase;
  bot: Telegraf<BotContext>;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export type Options = {
  experienceProportionIncrease: number;
  firstLevelMaxExperience: number;

  tasksPerDay: number; // количество задач в день

  timeTasksUpdate: { hour: number; minutes: number };
  tasksCfg: RoutineTasks;
  tasksCfgMap: Map<string, RoutineTasks[0]>;

  workerInterval: number; // интервал работы воркера
};

export class TaskCompletionWorker {
  usecase: RoutinesUsecase;

  interval!: ReturnType<typeof setInterval>;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    this.deps.logger = deps.logger.child({
      service: 'TaskCompletionWorker',
    });

    const repository = new RoutinesRepository({ db: this.deps.db });
    const repositoryProfiles = new ProfilesRepository({ db: this.deps.db });
    const repositoryRoutinesTasks = new RoutinesRepositoryTasks({
      mb: this.deps.tasksMessageBroker,
    });

    this.usecase = new RoutinesUsecase(
      { repository, repositoryProfiles, repositoryRoutinesTasks },
      {
        experienceProportionIncrease: this.options.experienceProportionIncrease,
        firstLevelMaxExperience: this.options.firstLevelMaxExperience,

        tasksPerDay: this.options.tasksPerDay,
        tasksCfg: this.options.tasksCfg,
        tasksCfgMap: this.options.tasksCfgMap,
      },
    );
  }

  stop() {
    clearInterval(this.interval);
  }

  async run() {
    this.deps.logger.info('☑️  Started to work');

    this.interval = setInterval(async () => {
      const tasksResult = await this.usecase.getCurrentTasks();
      if (tasksResult.result === 'error') {
        this.deps.logger.error(
          new Error('this.usecase.getCurrentTasks', { cause: tasksResult.value }),
        );
        return;
      }

      await Promise.all(
        tasksResult.value.map(async (task) => {
          const updateTaskResult = await this.usecase.updateTask(
            task.taskName,
            task.routineId,
            task.args,
          );
          if (updateTaskResult.result === 'error') {
            this.deps.logger.error(
              new Error('this.usecase.updateTask', { cause: updateTaskResult.value }),
            );
          }

          if (task.status === 'completed') {
            const taskCompletedResult = await this.usecase.setTaskCompleted(
              task.taskName,
              task.routineId,
            );
            if (taskCompletedResult.result === 'error') {
              this.deps.logger.error(
                new Error('this.usecase.setTaskCompleted', { cause: taskCompletedResult.value }),
              );
            }
          }
        }),
      );
    }, this.options.workerInterval);
  }
}
