import type { Profile } from '~/entities/profile';
import type { User } from '~/entities/user';
import type { ChatsRepository } from '~/service/chats/usecase/repository';
import type { UsersRepository, UsersTelegramRepository } from '~/service/users/usecase/repository';
import { type Err, type Ok, err, ok } from '~lib/errors';
import type { StatsRepository } from './repository';
import dayjs from 'dayjs';

export type Options = {
  userCachePeriod: number; // ms
  userStatsRatingCount: number; // количество пользователей в рейтинге
};

export type Dependencies = {
  repository: StatsRepository;
  usersRepository: UsersRepository;
  usersTelegramRepository: UsersTelegramRepository;
  chatsRepository: ChatsRepository;
};

export class StatsUsecase {
  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {}

  async getStatsRating(
    chatExternalId: number,
  ): Promise<Ok<{ profile: Profile; user: User }[]> | Err<Error>> {
    const chatResult = await this.deps.chatsRepository.getChatByExternalId(chatExternalId);
    if (chatResult.result === 'error') {
      return err(
        new Error('this.deps.chatsRepository.getChatByExternalId', { cause: chatResult.value }),
      );
    }

    const profilesResult = await this.deps.repository.getProfilesByChat(chatResult.value.id, {
      level: 'desc',
      experience: 'desc',
      createdAt: 'desc',
    }, this.options.userStatsRatingCount);
    if (profilesResult.result === 'error') {
      return err(
        new Error('this.deps.repository.getProfilesByChat', { cause: profilesResult.value }),
      );
    }

    const errors = [];

    const statisticsResult = await Promise.all(
      profilesResult.value.map(async (item) => {
        if (
          !item.user.updatedAt ||
          dayjs(item.user.updatedAt).add(this.options.userCachePeriod, 'ms').isBefore(dayjs())
        ) {
          const userResult = await this.deps.usersTelegramRepository.getChatMember(
            item.chat.externalId,
            item.user.externalId,
          );
          if (userResult.result === 'error') {
            return err(
              new Error('this.deps.usersTelegramRepository.getChatMember', {
                cause: userResult.value,
              }),
            );
          }

          const newUserResult = await this.deps.usersRepository.updateUser(item.user.id, {
            firstName: userResult.value.firstName,
            lastName: userResult.value.lastName,
            username: userResult.value.username,
          });
          if (newUserResult.result === 'error') {
            return err(
              new Error('this.deps.usersRepository.updateUser', {
                cause: newUserResult.value,
              }),
            );
          }

          const newUser = newUserResult.value;

          return ok({
            user: newUser,
            profile: item.profile,
          });
        }

        return ok({
          user: item.user,
          profile: item.profile,
        });
      }),
    );

    for (const stat of statisticsResult) {
      if (stat.result === 'error') {
        errors.push(stat.value);
      }
    }

    if (errors.length > 0) {
      return err(new Error('Error while getting statistics', { cause: errors }));
    }

    return ok(statisticsResult.map((stat) => stat.value as { user: User; profile: Profile }));
  }
}
