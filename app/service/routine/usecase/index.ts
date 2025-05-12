import type { Profile } from '~/entities/profile';
import type { Routine, RoutineTask, RoutineTasks } from '~/entities/routines';
import { generateTasks } from '~/entities/routines/tasks';
import type { ProfilesRepository } from '~/service/profiles/usecase/repository';
import { type Err, type Ok, err, errIs, ok } from '~lib/errors';
import { addLevelExperience } from '~lib/level-experience';
import { ErrorRoutineNotFound, ErrorRoutineTaskAlreadyCompleted } from './errors';
import type { RoutinesRepository, RoutinesRepositoryTasks } from './repository';

export type Options = {
  experienceProportionIncrease: number;
  firstLevelMaxExperience: number;

  tasksPerDay: number; // количество задач в день

  tasksCfg: RoutineTasks;
  tasksCfgMap: Map<string, RoutineTasks[0]>;
};

export type Dependencies = {
  repository: RoutinesRepository;
  repositoryProfiles: ProfilesRepository;
  repositoryRoutinesTasks: RoutinesRepositoryTasks;
};

export class RoutinesUsecase {
  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {}

  async getOrCreateRoutine(profile: Profile): Promise<Ok<Routine> | Err<Error>> {
    const routineResult = await this.deps.repository.getRoutineByProfile(profile.id);
    if (routineResult.result === 'error') {
      if (errIs(routineResult.value, ErrorRoutineNotFound)) {
        const createRoutineResult = await this.deps.repository.createRoutine({
          id: crypto.randomUUID(),
          profileId: profile.id,
          tasksCompletedCount: 0,
          dailiesCompletedCount: 0,
          createdAt: new Date(),
        });
        if (createRoutineResult.result === 'error') {
          return err(
            new Error('this.deps.repository.createRoutine', { cause: createRoutineResult.value }),
          );
        }

        return ok(createRoutineResult.value);
      }

      return err(
        new Error('this.deps.repository.getRoutineByProfile', { cause: routineResult.value }),
      );
    }

    return ok(routineResult.value);
  }

  async getOrCreateUsersTasks(
    profile: Profile,
  ): Promise<Ok<{ tasks: RoutineTask[]; routine: Routine }> | Err<Error>> {
    const routineResult = await this.getOrCreateRoutine(profile);
    if (routineResult.result === 'error') {
      return err(new Error('this.getOrCreateRoutine', { cause: routineResult.value }));
    }

    const routine = routineResult.value;

    const tasksResult = await this.deps.repository.getTasksByRoutine(routine.id);
    if (tasksResult.result === 'error') {
      return err(new Error('this.deps.repository.getTasksByRoutine', { cause: tasksResult.value }));
    }

    const tasks = tasksResult.value;
    if (tasks.length === 0) {
      const generationResult = await this.generateTasks(routine.id);
      if (generationResult.result === 'error') {
        return err(new Error('this.generateUsersTasks', { cause: generationResult.value }));
      }

      return ok({ tasks: generationResult.value, routine });
    }

    return ok({ tasks: tasks, routine });
  }

  async generateTasks(routineId: string): Promise<Ok<RoutineTask[]> | Err<Error>> {
    const tasks = generateTasks(this.options.tasksPerDay, routineId, this.options.tasksCfg);

    const tasksResult = await this.deps.repository.createTasks(tasks);
    if (tasksResult.result === 'error') {
      return err(new Error('this.deps.repository.createTasks', { cause: tasksResult.value }));
    }

    return ok(tasksResult.value);
  }

  async refreshDailyTasks(): Promise<Ok<[string, RoutineTask[]][]> | Err<Error>> {
    const deleteResult = await this.deps.repository.deleteAllTasks();
    if (deleteResult.result === 'error') {
      return err(new Error('this.deps.repository.deleteAllTasks', { cause: deleteResult.value }));
    }

    const routineResult = await this.deps.repository.getAllRoutineIds();
    if (routineResult.result === 'error') {
      return err(
        new Error('this.deps.repository.getAllRoutineIds', { cause: routineResult.value }),
      );
    }

    const routines = routineResult.value;

    const oks: [string, RoutineTask[]][] = [];
    const errs: [string, Error][] = [];

    await Promise.all(
      routines.map(async (routineId) => {
        const generateResult = await this.generateTasks(routineId);
        if (generateResult.result === 'error') {
          errs.push([routineId, new Error('this.generateTasks', { cause: generateResult.value })]);

          return;
        }

        oks.push([routineId, generateResult.value]);
      }),
    );

    if (errs.length > 0) {
      return err(new Error('this.generateTasks', { cause: errs }));
    }

    return ok(oks);
  }

  async getCurrentTasks(): Promise<Ok<RoutineTask[]> | Err<Error>> {
    const tasksResult = await this.deps.repositoryRoutinesTasks.getTasks();
    if (tasksResult.result === 'error') {
      return err(
        new Error('this.deps.repositoryRoutinesTasks.getTasks', { cause: tasksResult.value }),
      );
    }

    return ok(tasksResult.value);
  }

  async updateTask(
    name: string,
    routineId: string,
    args: Record<string, unknown>,
  ): Promise<Ok<RoutineTask> | Err<Error>> {
    const taskResult = await this.deps.repository.getTaskByName(name, routineId);
    if (taskResult.result === 'error') {
      return err(new Error('this.deps.repository.getTaskByName', { cause: taskResult.value }));
    }

    const updateTaskResult = await this.deps.repository.updateTaskByName(name, routineId, {
      args: { ...taskResult.value.args, ...args },
      updatedAt: new Date(),
    });
    if (updateTaskResult.result === 'error') {
      return err(new Error('this.deps.repository.updateTask', { cause: updateTaskResult.value }));
    }

    return ok(updateTaskResult.value);
  }

  async setTaskCompleted(
    name: string,
    routineId: string,
  ): Promise<Ok<{ tasks: RoutineTask[]; routine: Routine; profile: Profile }> | Err<Error>> {
    const routineResult = await this.deps.repository.getRoutine(routineId);
    if (routineResult.result === 'error') {
      return err(new Error('this.deps.repository.getRoutine', { cause: routineResult.value }));
    }

    const routine = routineResult.value;

    const taskResult = await this.deps.repository.getTaskByName(name, routine.id);
    if (taskResult.result === 'error') {
      return err(new Error('this.deps.repository.getTaskByName', { cause: taskResult.value }));
    }

    if (taskResult.value.status === 'completed') {
      return err(new ErrorRoutineTaskAlreadyCompleted('this.deps.repository.getTaskByName'));
    }

    const updateTaskResult = await this.deps.repository.updateTaskByName(name, routine.id, {
      status: 'completed',
      updatedAt: new Date(),
    });
    if (updateTaskResult.result === 'error') {
      return err(new Error('this.deps.repository.updateTask', { cause: updateTaskResult.value }));
    }

    const profileResult = await this.deps.repositoryProfiles.getProfileByRoutineId(routine.id);
    if (profileResult.result === 'error') {
      return err(
        new Error('this.deps.repositoryProfiles.getProfileByRoutineId', {
          cause: profileResult.value,
        }),
      );
    }

    const profile = profileResult.value;

    const exp = this.options.tasksCfgMap.get(name)?.experience;
    if (!exp) return err(new Error(`this.options.tasksCfgMap.get(name): name = ${name}`));

    const { experience: newExperience, level: newLevel } = addLevelExperience(exp, {
      currentLevel: profile.level,
      currentExperience: profile.experience,
      experienceProportionIncrease: this.options.experienceProportionIncrease,
      firstLevelMaxExperience: this.options.firstLevelMaxExperience,
    });

    const updateProfileResult = await this.deps.repositoryProfiles.updateProfile(profile.id, {
      experience: newExperience,
      level: newLevel,
    });
    if (updateProfileResult.result === 'error') {
      return err(
        new Error('this.deps.repositoryProfiles.updateProfile', {
          cause: updateProfileResult.value,
        }),
      );
    }

    const tasksResult = await this.deps.repository.getTasksByRoutine(routine.id);
    if (tasksResult.result === 'error') {
      return err(new Error('this.deps.repository.getTasksByRoutine', { cause: tasksResult.value }));
    }

    const updateRoutineResult = await this.deps.repository.updateRoutine(routine.id, {
      tasksCompletedCount: routine.tasksCompletedCount + 1,
      ...(tasksResult.value.filter((t) => t.status === 'completed').length ===
      this.options.tasksPerDay
        ? { dailiesCompletedCount: routine.dailiesCompletedCount + 1 }
        : {}),
      updatedAt: new Date(),
    });
    if (updateRoutineResult.result === 'error') {
      return err(
        new Error('this.deps.repository.updateRoutine', { cause: updateRoutineResult.value }),
      );
    }

    return ok({
      tasks: tasksResult.value,
      profile: updateProfileResult.value,
      routine: updateRoutineResult.value,
    });
  }
}
