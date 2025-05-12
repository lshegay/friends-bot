export type RoutineTaskCfg<TaskName extends string, TaskOptions extends Record<string, unknown>> = {
  name: TaskName;
  description: string;
  options: TaskOptions;
  experience: number;
};

export function cfgAsMap<T extends RoutineTaskCfg<string, Record<string, unknown>>>(cfg: T[]) {
  // task name -> task
  return new Map<string, T>(cfg.map((task) => [task.name, task]));
}
