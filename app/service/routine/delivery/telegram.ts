import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Logger } from 'pino';
import type { NarrowedContext, Telegraf, Types } from 'telegraf';
import type { BotContext } from '~/delivery/middlewares/context';
import type { RoutineTask, RoutineTasks } from '~/entities/routines';
import { cfgAsMap } from '~/entities/routines/cfg';
import { getRoutineTasksExperience } from '~/entities/routines/types';
import { ProfilesRepository } from '~/service/profiles/repository/postgres';
import type { MessageBroker } from '~lib/message-broker';
import { RoutinesRepositoryTasks } from '../repository/broker-lib';
import { RoutinesRepository } from '../repository/postgres';
import { RoutinesUsecase } from '../usecase';
import { TaskCompletionWorker } from './task-completion-worker';
import { UpdaterWorker } from './updater-worker';

export type Options = {
  experienceProportionIncrease: number;
  firstLevelMaxExperience: number;

  tasksPerDay: number; // количество задач в день
  timeTasksUpdate: { hour: number; minutes: number };

  tasks: RoutineTasks;
  taskCompletionWorkerInterval: number; // интервал работы воркера мс
};

export type Dependencies = {
  bot: Telegraf<BotContext>;
  db: BunSQLDatabase;
  logger: Logger;
  tasksMessageBroker: MessageBroker<RoutineTask>;
};

export function useTelegramDelivery(deps: Dependencies, options: Options) {
  const delivery = new TelegramRoutineDelivery(deps, options);

  deps.bot.command('daily', delivery.commandDaily.bind(delivery));

  return [
    {
      command: 'daily',
      description: 'Ежедневные задачи',
    },
  ];
}

export class TelegramRoutineDelivery {
  usecase: RoutinesUsecase;

  // task name -> task
  tasksCfgMap: Map<string, RoutineTasks[0]>;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {
    this.tasksCfgMap = cfgAsMap(this.options.tasks);

    const repository = new RoutinesRepository({
      db: this.deps.db,
    });
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
        tasksCfg: this.options.tasks,
        tasksCfgMap: this.tasksCfgMap,
      },
    );

    const updaterWorker = new UpdaterWorker(
      {
        bot: this.deps.bot,
        db: this.deps.db,
        logger: this.deps.logger,
        messageBroker: this.deps.tasksMessageBroker,
      },
      {
        experienceProportionIncrease: this.options.experienceProportionIncrease,
        firstLevelMaxExperience: this.options.firstLevelMaxExperience,

        tasksPerDay: this.options.tasksPerDay,
        timeTasksUpdate: this.options.timeTasksUpdate,
        tasksCfg: this.options.tasks,
        tasksCfgMap: this.tasksCfgMap,
      },
    );

    const taskCompletionWorker = new TaskCompletionWorker(
      {
        bot: this.deps.bot,
        db: this.deps.db,
        logger: this.deps.logger,
        tasksMessageBroker: this.deps.tasksMessageBroker,
      },
      {
        experienceProportionIncrease: this.options.experienceProportionIncrease,
        firstLevelMaxExperience: this.options.firstLevelMaxExperience,
        tasksPerDay: this.options.tasksPerDay,
        timeTasksUpdate: this.options.timeTasksUpdate,
        tasksCfg: this.options.tasks,
        workerInterval: this.options.taskCompletionWorkerInterval,
        tasksCfgMap: this.tasksCfgMap,
      },
    );

    updaterWorker.run();
    taskCompletionWorker.run();
  }

  async commandDaily(
    ctx: NarrowedContext<BotContext, Types.MountMap['text']> & Types.CommandContextExtn,
  ) {
    const name = ctx.message.from.first_name;
    const tasks = ctx.routineTasks;
    const completed = tasks.filter((t) => t.status === 'completed');
    const experience = getRoutineTasksExperience(tasks, this.tasksCfgMap);

    const tasksLabel = tasks
      .map((t) => {
        const taskCfg = this.tasksCfgMap.get(t.taskName);
        if (!taskCfg) return ''; // TODO: показывать ошибку или что-то такое

        const status = t.status === 'completed' ? '✅' : '⛔';

        switch (t.taskName) {
          case 'SEND_IMAGES': {
            return `${status}: ${taskCfg.description.replace('{1}', (t.args.count as number).toString())} (отправлено: ${t.args.currentCount})`;
          }
          case 'SEND_CHARACTERS': {
            return `${status}: ${taskCfg.description.replace('{1}', (t.args.count as number).toString())} (отправлено: ${t.args.currentCount})`;
          }

          default: {
            return `${status}: ${taskCfg.description}`;
          }
        }
      })
      .join('\n');

    if (completed.length >= this.options.tasksPerDay) {
      return ctx.reply(
        `🏓 Лорд ${name}, Вы выполнили все задания на сегодня! 💘.

Ваши задачи:

${tasksLabel}

Вы получили опыта: ${experience.completed} из ${experience.all}.
`,
        {
          parse_mode: 'HTML',
        },
      );
    }

    return ctx.reply(
      `🏓 Лорд ${name}, сегодня у вас выполнено ${completed.length} из ${this.options.tasksPerDay} задач.

Ваши задачи:

${tasksLabel}

Вы получили опыта: ${experience.completed} из ${experience.all}.
`,
      {
        parse_mode: 'HTML',
      },
    );
  }
}
