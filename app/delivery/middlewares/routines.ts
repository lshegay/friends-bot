import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { MiddlewareFn } from 'telegraf';
import type { RoutineTask, RoutineTasks } from '~/entities/routines';
import { ProfilesRepository } from '~/service/profiles/repository/postgres';
import { RoutinesRepository } from '~/service/routine/repository/postgres';
import { RoutinesUsecase } from '~/service/routine/usecase';
import type { MessageBroker } from '~lib/message-broker';
import type { BotContext } from './context';
import { RoutinesRepositoryTasks } from '~/service/routine/repository/broker-lib';
import { cfgAsMap } from '~/entities/routines/cfg';

export type Dependencies = {
  db: BunSQLDatabase;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export type Options = {
  experienceProportionIncrease: number;
  firstLevelMaxExperience: number;

  tasksPerDay: number; // количество задач в день

  tasks: RoutineTasks;
};

export function createRoutineMiddleware(
  deps: Dependencies,
  options: Options,
): MiddlewareFn<BotContext> {
  const repository = new RoutinesRepository({ db: deps.db });
  const repositoryProfiles = new ProfilesRepository({
    db: deps.db,
  });
  const repositoryRoutinesTasks = new RoutinesRepositoryTasks({
    mb: deps.tasksMessageBroker,
  });

  const usecase = new RoutinesUsecase(
    {
      repository,
      repositoryProfiles,
      repositoryRoutinesTasks,
    },
    {
      experienceProportionIncrease: options.experienceProportionIncrease,
      firstLevelMaxExperience: options.firstLevelMaxExperience,
      
      tasksPerDay: options.tasksPerDay,
      tasksCfg: options.tasks,
      tasksCfgMap: cfgAsMap(options.tasks),
    },
  );

  return async (ctx, next) => {
    if (!ctx.from || !ctx.chat) return;

    const allResult = await usecase.getOrCreateUsersTasks(ctx.profile);
    if (allResult.result === 'error') {
      deps.logger.error(allResult.value, 'Error in createProfileMiddleware', {
        userId: ctx.from.id,
        chatId: ctx.chat.id,
      });

      return;
    }

    ctx.routine = allResult.value.routine;
    ctx.routineTasks = allResult.value.tasks;

    return next();
  };
}
