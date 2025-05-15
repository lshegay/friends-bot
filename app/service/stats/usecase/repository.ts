import type { Chat } from '~/entities/chat';
import type { Profile } from '~/entities/profile';
import type { User } from '~/entities/user';
import type { Err, Ok } from '~lib/errors';

export type Order = {
  experience: 'asc' | 'desc';
  level: 'asc' | 'desc';
  createdAt: 'asc' | 'desc';
};

export interface StatsRepository {
  getProfilesByChat: (
    chatId: string,
    order: Order,
    limit: number,
  ) => Promise<
    | Ok<
        {
          profile: Profile;
          chat: Chat;
          user: User;
        }[]
      >
    | Err<Error>
  >;
}
