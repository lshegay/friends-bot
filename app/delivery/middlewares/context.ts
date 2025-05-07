import type { Context } from 'telegraf';
import type { Profile } from '~/entities/profile';

export interface BotContext extends Context {
  profile: Profile;
}
