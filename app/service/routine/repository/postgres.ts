import { and, eq, isNull, or } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Routine, RoutineTask, RoutineTaskStatus } from '~/entities/routines';
import {
  type RoutineDB,
  type RoutineTasksDB,
  routineTasksTable,
  routinesTable,
} from '~db/routines';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import { ErrorRoutineNotFound, ErrorRoutineTaskNotFound } from '../usecase/errors';
import type { RoutinesRepository as RoutinesUsecaseRepository } from '../usecase/repository';

// export type Options = {};

export type Dependencies = {
  db: BunSQLDatabase;
};

export class RoutinesRepository implements RoutinesUsecaseRepository {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  async getRoutine(id: string): Promise<Ok<Routine> | Err<Error>> {
    const routineResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(routinesTable)
        .where(and(eq(routinesTable.id, id), isNull(routinesTable.deletedAt)))
        .limit(1)
        .execute(),
    );
    if (routineResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(routinesTable).where(and(eq(routinesTable.id, id), isNull(routinesTable.deletedAt))).limit(1).execute()',
          { cause: routineResult.value },
        ),
      );
    }

    if (!routineResult.value.at(0)) {
      return err(
        new ErrorRoutineNotFound(
          'this.deps.db.select().from(routinesTable).where(and(eq(routinesTable.id, id), isNull(routinesTable.deletedAt))).execute()',
        ),
      );
    }

    return ok(transformRoutine(routineResult.value[0]));
  }

  async getAllRoutineIds(): Promise<Ok<string[]> | Err<Error>> {
    const routinesResult = await trycatch(() =>
      this.deps.db
        .select({ id: routinesTable.id })
        .from(routinesTable)
        .where(isNull(routinesTable.deletedAt))
        .execute(),
    );
    if (routinesResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(routinesTable).where(isNull(routinesTable.deletedAt)).execute()',
          { cause: routinesResult.value },
        ),
      );
    }

    return ok(routinesResult.value.map((routine) => routine.id));
  }

  async getRoutineByProfile(profileId: string): Promise<Ok<Routine> | Err<Error>> {
    const routineResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(routinesTable)
        .where(and(eq(routinesTable.profileId, profileId), isNull(routinesTable.deletedAt)))
        .limit(1)
        .execute(),
    );
    if (routineResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(routinesTable).where(and(eq(routinesTable.profileId, profileId), isNull(routinesTable.deletedAt))).limit(1).execute()',
          { cause: routineResult.value },
        ),
      );
    }

    if (!routineResult.value.at(0)) {
      return err(
        new ErrorRoutineNotFound(
          'this.deps.db.select().from(routinesTable).where(and(eq(routinesTable.profileId, profileId), isNull(routinesTable.deletedAt))).execute()',
        ),
      );
    }

    return ok(transformRoutine(routineResult.value[0]));
  }

  async createRoutine(routine: Routine): Promise<Ok<Routine> | Err<Error>> {
    const routineResult = await trycatch(() =>
      this.deps.db.insert(routinesTable).values(routine).returning().execute(),
    );
    if (routineResult.result === 'error') {
      return err(
        new Error('this.deps.db.insert(routinesTable).values(routine).returning().execute()', {
          cause: routineResult.value,
        }),
      );
    }

    return ok(transformRoutine(routineResult.value[0]));
  }

  async updateRoutine(
    id: string,
    routine: Partial<Omit<Routine, 'id'>>,
  ): Promise<Ok<Routine> | Err<Error>> {
    const routineResult = await trycatch(() =>
      this.deps.db
        .update(routinesTable)
        .set({ ...routine, updatedAt: new Date() })
        .where(eq(routinesTable.id, id))
        .returning()
        .execute(),
    );
    if (routineResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(routinesTable).set(routine).where(eq(routinesTable.id, routineId)).execute()',
          {
            cause: routineResult.value,
          },
        ),
      );
    }

    return ok(transformRoutine(routineResult.value[0]));
  }

  async deleteRoutine(id: string): Promise<Ok<void> | Err<Error>> {
    const now = new Date();

    const routineResult = await trycatch(() =>
      this.deps.db
        .update(routinesTable)
        .set({ updatedAt: now, deletedAt: now })
        .where(eq(routinesTable.id, id))
        .execute(),
    );
    if (routineResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(routinesTable).set({ updatedAt: now, deletedAt: now }).where(eq(routinesTable.id, id)).execute()',
          {
            cause: routineResult.value,
          },
        ),
      );
    }

    return ok<void>();
  }

  async getTasksByRoutine(routineId: string): Promise<Ok<RoutineTask[]> | Err<Error>> {
    const tasksResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(routineTasksTable)
        .where(eq(routineTasksTable.routineId, routineId))
        .execute(),
    );
    if (tasksResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(routinesTable).where(eq(routinesTable.routineId, routineId)).execute()',
          { cause: tasksResult.value },
        ),
      );
    }

    return ok(tasksResult.value.map(transformRoutineTask));
  }

  async getTaskByName(name: string, routineId: string): Promise<Ok<RoutineTask> | Err<Error>> {
    const taskResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(routineTasksTable)
        .where(
          and(
            eq(routineTasksTable.routineId, routineId),
            eq(routineTasksTable.taskName, name),
          ),
        )
        .limit(1)
        .execute(),
    );
    if (taskResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(routinesTable).where(and(eq(routinesTable.routineId, routineId), eq(routinesTable.taskName, name))).limit(1).execute()',
          { cause: taskResult.value },
        ),
      );
    }
    if (!taskResult.value.at(0)) {
      return err(
        new ErrorRoutineTaskNotFound(
          'this.deps.db.select().from(routinesTable).where(and(eq(routinesTable.routineId, routineId), eq(routinesTable.taskName, name))).execute()',
        ),
      );
    }
    return ok(transformRoutineTask(taskResult.value[0]));
  }

  async getTask(id: string): Promise<Ok<RoutineTask> | Err<Error>> {
    const taskResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(routineTasksTable)
        .where(eq(routineTasksTable.id, id))
        .limit(1)
        .execute(),
    );
    if (taskResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(routinesTable).where(eq(routinesTable.id, id)).limit(1).execute()',
          { cause: taskResult.value },
        ),
      );
    }

    if (!taskResult.value.at(0)) {
      return err(
        new ErrorRoutineTaskNotFound(
          'this.deps.db.select().from(routinesTable).where(eq(routinesTable.id, id)).execute()',
        ),
      );
    }

    return ok(transformRoutineTask(taskResult.value[0]));
  }

  async createTask(task: RoutineTask): Promise<Ok<RoutineTask> | Err<Error>> {
    const taskResult = await trycatch(() =>
      this.deps.db.insert(routineTasksTable).values(task).returning().execute(),
    );
    if (taskResult.result === 'error') {
      return err(
        new Error('this.deps.db.insert(routineTasksTable).values(task).returning().execute()', {
          cause: taskResult.value,
        }),
      );
    }

    return ok(transformRoutineTask(taskResult.value[0]));
  }

  async createTasks(tasks: RoutineTask[]): Promise<Ok<RoutineTask[]> | Err<Error>> {
    const taskResult = await trycatch(() =>
      this.deps.db.insert(routineTasksTable).values(tasks).returning().execute(),
    );
    if (taskResult.result === 'error') {
      return err(
        new Error('this.deps.db.insert(routineTasksTable).values(task).returning().execute()', {
          cause: taskResult.value,
        }),
      );
    }

    return ok(taskResult.value.map((t) => transformRoutineTask(t)));
  }

  async updateTask(
    id: string,
    task: Partial<Omit<RoutineTask, 'id'>>,
  ): Promise<Ok<RoutineTask> | Err<Error>> {
    const taskResult = await trycatch(() =>
      this.deps.db
        .update(routineTasksTable)
        .set({ ...task, updatedAt: new Date() })
        .where(eq(routineTasksTable.id, id))
        .returning()
        .execute(),
    );
    if (taskResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(routineTasksTable).set(task).where(eq(routineTasksTable.id, taskId)).execute()',
          {
            cause: taskResult.value,
          },
        ),
      );
    }

    if (!taskResult.value.at(0)) {
      return err(
        new ErrorRoutineTaskNotFound(
          'this.deps.db.update(routineTasksTable).set(task).where(eq(routineTasksTable.id, taskId)).execute()',
        ),
      );
    }

    return ok(transformRoutineTask(taskResult.value[0]));
  }

  async updateTaskByName(
    name: string,
    routineId: string,
    task: Partial<Omit<RoutineTask, 'id'>>,
  ): Promise<Ok<RoutineTask> | Err<Error>> {
    const taskResult = await trycatch(() =>
      this.deps.db
        .update(routineTasksTable)
        .set({ ...task, updatedAt: new Date() })
        .where(
          and(eq(routineTasksTable.taskName, name), eq(routineTasksTable.routineId, routineId)),
        )
        .returning()
        .execute(),
    );
    if (taskResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(routineTasksTable).set(task).where(and(eq(routineTasksTable.taskName, name), eq(routineTasksTable.routineId, routineId))).execute()',
          {
            cause: taskResult.value,
          },
        ),
      );
    }

    if (!taskResult.value.at(0)) {
      return err(
        new ErrorRoutineTaskNotFound(
          'this.deps.db.update(routineTasksTable).set(task).where(and(eq(routineTasksTable.taskName, name), eq(routineTasksTable.routineId, routineId))).execute()',
        ),
      );
    }

    return ok(transformRoutineTask(taskResult.value[0]));
  }

  async deleteTask(id: string): Promise<Ok<void> | Err<Error>> {
    const taskResult = await trycatch(() =>
      this.deps.db.delete(routineTasksTable).where(eq(routineTasksTable.id, id)).execute(),
    );
    if (taskResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.delete(routineTasksTable).where(eq(routineTasksTable.id, id)).execute()',
          {
            cause: taskResult.value,
          },
        ),
      );
    }

    return ok<void>();
  }

  async deleteAllTasks(): Promise<Ok<void> | Err<Error>> {
    const taskResult = await trycatch(() => this.deps.db.delete(routineTasksTable).execute());
    if (taskResult.result === 'error') {
      return err(
        new Error('this.deps.db.delete(routineTasksTable).execute()', {
          cause: taskResult.value,
        }),
      );
    }

    return ok<void>();
  }
}

export function transformRoutine(routine: RoutineDB): Routine {
  return {
    id: routine.id,
    profileId: routine.profileId,

    tasksCompletedCount: routine.tasksCompletedCount,
    dailiesCompletedCount: routine.dailiesCompletedCount,

    createdAt: routine.createdAt,
    updatedAt: routine.updatedAt ?? undefined,
    deletedAt: routine.deletedAt ?? undefined,
  } satisfies Routine;
}

export function transformRoutineTask(routineTask: RoutineTasksDB): RoutineTask {
  return {
    id: routineTask.id,
    routineId: routineTask.routineId,

    taskName: routineTask.taskName,
    args: routineTask.args as Record<string, unknown>,
    status: routineTask.status as RoutineTaskStatus,

    createdAt: routineTask.createdAt,
    updatedAt: routineTask.updatedAt ?? undefined,
  } satisfies RoutineTask;
}
