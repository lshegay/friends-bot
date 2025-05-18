import { toShuffled } from '~lib/utils';
import type { RoutineTaskCfg } from './cfg';
import type { RoutineTask } from './types';

export type RoutineTaskDrinkDrink = RoutineTaskCfg<'DRINK_DRINK', Record<string, unknown>>;

export function createRoutineTaskDrinkDrink(routineId: string): RoutineTask {
  return {
    id: crypto.randomUUID(),
    taskName: 'DRINK_DRINK',
    routineId,
    status: 'active',
    args: {},

    createdAt: new Date(),
  };
}

export type RoutineTaskReadQuote = RoutineTaskCfg<'READ_QUOTE', Record<string, unknown>>;

export function createRoutineTaskReadQuote(routineId: string): RoutineTask {
  return {
    id: crypto.randomUUID(),
    taskName: 'READ_QUOTE',
    routineId,
    status: 'active',
    args: {},

    createdAt: new Date(),
  };
}

export type RoutineTaskSendImages = RoutineTaskCfg<'SEND_IMAGES', { min: number; max: number }>;

export function createRoutineTaskSendImages(
  routineId: string,
  options: { min: number; max: number },
): RoutineTask {
  return {
    id: crypto.randomUUID(),
    taskName: 'SEND_IMAGES',
    routineId,
    status: 'active',
    args: {
      count: Math.floor(Math.random() * (options.max - options.min + 1)) + options.min,
      currentCount: 0,
    },

    createdAt: new Date(),
  };
}

export type RoutineTaskSendCharacters = RoutineTaskCfg<
  'SEND_CHARACTERS',
  { min: number; max: number }
>;

export function createRoutineTaskSendCharacters(
  routineId: string,
  options: { min: number; max: number },
): RoutineTask {
  return {
    id: crypto.randomUUID(),
    taskName: 'SEND_CHARACTERS',
    routineId,
    status: 'active',
    args: {
      count: Math.floor(Math.random() * (options.max - options.min + 1)) + options.min,
      currentCount: 0,
    },

    createdAt: new Date(),
  };
}

export type RoutineTaskRepostAny = RoutineTaskCfg<'REPOST_ANY', { min: number; max: number }>;

export function createRoutineTaskRepostAny(
  routineId: string,
  options: { min: number; max: number },
): RoutineTask {
  return {
    id: crypto.randomUUID(),
    taskName: 'REPOST_ANY',
    routineId,
    status: 'active',
    args: {
      count: Math.floor(Math.random() * (options.max - options.min + 1)) + options.min,
      currentCount: 0,
    },

    createdAt: new Date(),
  };
}

export type RoutineTasks = (
  | RoutineTaskDrinkDrink
  | RoutineTaskReadQuote
  | RoutineTaskSendImages
  | RoutineTaskSendCharacters
  | RoutineTaskRepostAny
)[];

export function generateTasks(
  count: number,
  routineId: string,
  tasksCfg: RoutineTasks,
): RoutineTask[] {
  const cfgs = toShuffled(tasksCfg).slice(0, count);

  const tasks: RoutineTask[] = Array.from({ length: count }, (_, index) => {
    const task = cfgs[index];

    switch (task.name) {
      case 'DRINK_DRINK': {
        return createRoutineTaskDrinkDrink(routineId);
      }
      case 'READ_QUOTE': {
        return createRoutineTaskReadQuote(routineId);
      }
      case 'SEND_IMAGES': {
        return createRoutineTaskSendImages(routineId, task.options);
      }
      case 'SEND_CHARACTERS': {
        return createRoutineTaskSendCharacters(routineId, task.options);
      }
      case 'REPOST_ANY': {
        return createRoutineTaskRepostAny(routineId, task.options);
      }
    }
  });

  return tasks;
}
