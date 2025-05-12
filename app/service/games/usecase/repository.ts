import type { RoutineTask } from "~/entities/routines";
import type { Err, Ok } from "~lib/errors";

export interface RoutinesRepositoryTasks {
  setTask: (task: RoutineTask) => Promise<Ok<RoutineTask> | Err<Error>>;
}
