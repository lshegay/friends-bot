import type { Context } from 'telegraf';
import type { Profile } from '~/entities/profile';
import type { Routine, RoutineTask } from '~/entities/routines';

export interface BotContext extends Context {
  profile: Profile;
  routine: Routine;
  routineTasks: RoutineTask[];
}
