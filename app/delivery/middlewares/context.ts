import type { Context } from 'telegraf';
import type { SceneContextScene, WizardContextWizard, WizardSessionData } from 'telegraf/scenes';
import type { Update } from 'telegraf/types';
import type { Chat } from '~/entities/chat';
import type { Profile } from '~/entities/profile';
import type { Routine, RoutineTask } from '~/entities/routines';

export interface BotContext<TWizardState = unknown> extends Context<Update> {
  profile: Profile;
  profileChat: Chat;
  routine: Routine;
  routineTasks: RoutineTask[];

  scene: SceneContextScene<BotContext<TWizardState>, WizardSessionData> & {
    state: TWizardState;
  };
  wizard: WizardContextWizard<BotContext<TWizardState>>;
}
