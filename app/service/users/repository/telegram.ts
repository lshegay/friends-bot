import type { Telegram } from 'telegraf';
import type { User as TelegrafUser } from 'telegraf/types';
import type { User } from '~/entities/user';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import type { UsersTelegramRepository as UsersUsecaseTelegramRepository } from '../usecase/repository';

// export type Options = {};

export type Dependencies = {
  telegram: Telegram;
};

export class UsersTelegramRepository implements UsersUsecaseTelegramRepository {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  async getChatMember(chatId: number, userId: number): Promise<Ok<User> | Err<Error>> {
    const userResult = await trycatch(() => this.deps.telegram.getChatMember(chatId, userId));
    if (userResult.result === 'error') {
      return err(
        new Error('this.deps.telegram.getChatMember', {
          cause: userResult.value,
        }),
      );
    }

    return ok(transformUser(userResult.value.user));
  }
}

export function transformUser(user: TelegrafUser): User {
  return {
    id: '',
    externalId: user.id,
    isBot: user.is_bot,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,

    createdAt: new Date(),
  } satisfies User;
}
