import type { RoutineTaskCfg } from './cfg';

export type Routine = {
  id: string;
  profileId: string;

  tasksCompletedCount: number;
  dailiesCompletedCount: number;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};

export type RoutineTask = {
  id: string;
  routineId: string;

  taskName: string;
  args: Record<string, unknown>;
  status: RoutineTaskStatus;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};

export type RoutineTaskStatus = 'active' | 'completed';

export function getRoutineTasksExperience(
  tasks: RoutineTask[],
  cfgMap: Map<string, RoutineTaskCfg<string, Record<string, unknown>>>,
): { all: number; completed: number } {
  const experience = tasks.reduce(
    (acc, t) => {
      const taskCfg = cfgMap.get(t.taskName);
      if (!taskCfg) return acc;

      return {
        all: acc.all + taskCfg.experience,
        completed: acc.completed + (t.status === 'completed' ? taskCfg.experience : 0),
      };
    },
    { all: 0, completed: 0 },
  );

  return experience;
}
