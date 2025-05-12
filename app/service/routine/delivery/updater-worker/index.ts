import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { Telegraf } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import type { RoutineTask, RoutineTasks } from '~/entities/routines';
import { ProfilesRepository } from '~/service/profiles/repository/postgres';
import type { MessageBroker } from '~lib/message-broker';
import { runAtSpecificTimeOfDay } from '~lib/utils';
import { RoutinesRepositoryTasks } from '../../repository/broker-lib';
import { RoutinesRepository } from '../../repository/postgres';
import { RoutinesUsecase } from '../../usecase';

export type Dependencies = {
  db: BunSQLDatabase;
  bot: Telegraf<BotContext>;
  logger: Logger;
  messageBroker: MessageBroker<RoutineTask>;
};

export type Options = {
  experienceProportionIncrease: number;
  firstLevelMaxExperience: number;

  tasksPerDay: number; // количество задач в день

  timeTasksUpdate: { hour: number; minutes: number };
  tasksCfg: RoutineTasks;
  tasksCfgMap: Map<string, RoutineTasks[0]>;
};

export class UpdaterWorker {
  usecase: RoutinesUsecase;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    this.deps.logger = deps.logger.child({
      service: 'RoutineUpdaterWorker',
    });

    const repository = new RoutinesRepository({ db: this.deps.db });
    const repositoryProfiles = new ProfilesRepository({ db: this.deps.db });
    const repositoryRoutinesTasks = new RoutinesRepositoryTasks({ mb: this.deps.messageBroker });

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

  // заглушка
  stop() {}

  async run() {
    const { timeTasksUpdate } = this.options;

    this.deps.logger.info('☑️  Started to work');

    this.stop = runAtSpecificTimeOfDay(timeTasksUpdate.hour, timeTasksUpdate.minutes, async () => {
      this.deps.logger.info('Started to refresh daily tasks');

      const quoteResult = await this.usecase.refreshDailyTasks();
      if (quoteResult.result === 'error') {
        this.deps.logger.error(
          new Error('this.usecase.refreshDailyTasks', { cause: quoteResult.value }),
        );
      }

      this.deps.logger.info('Ended to refresh daily tasks');
    });
  }
}
