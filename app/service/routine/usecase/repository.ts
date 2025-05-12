import type { Routine, RoutineTask } from '~/entities/routines';
import type { Err, Ok } from '~lib/errors';

export interface RoutinesRepository {
  getRoutine: (id: string) => Promise<Ok<Routine> | Err<Error>>;
  getAllRoutineIds: () => Promise<Ok<string[]> | Err<Error>>;
  getRoutineByProfile: (profileId: string) => Promise<Ok<Routine> | Err<Error>>;
  createRoutine: (routine: Routine) => Promise<Ok<Routine> | Err<Error>>;
  updateRoutine: (id: string, routine: Partial<Omit<Routine, 'id'>>) => Promise<Ok<Routine> | Err<Error>>;
  deleteRoutine: (id: string) => Promise<Ok<void> | Err<Error>>;

  getTasksByRoutine: (routineId: string) => Promise<Ok<RoutineTask[]> | Err<Error>>;
  getTask: (id: string) => Promise<Ok<RoutineTask> | Err<Error>>;
  getTaskByName: (name: string, routineId: string) => Promise<Ok<RoutineTask> | Err<Error>>;
  createTask: (task: RoutineTask) => Promise<Ok<RoutineTask> | Err<Error>>;
  createTasks: (tasks: RoutineTask[]) => Promise<Ok<RoutineTask[]> | Err<Error>>;
  updateTask: (id: string, task: Partial<Omit<RoutineTask, 'id'>>) => Promise<Ok<RoutineTask> | Err<Error>>;
  updateTaskByName: (name: string, routineId: string, task: Partial<Omit<RoutineTask, 'id'>>) => Promise<Ok<RoutineTask> | Err<Error>>;
  deleteTask: (id: string) => Promise<Ok<void> | Err<Error>>;
  deleteAllTasks: () => Promise<Ok<void> | Err<Error>>;
}

export interface RoutinesRepositoryTasks {
  getTasks: () => Promise<Ok<RoutineTask[]> | Err<Error>>;
}