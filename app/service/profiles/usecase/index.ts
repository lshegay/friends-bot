import type { Chat } from '~/entities/chat';
import type { Profile } from '~/entities/profile';
import type { User } from '~/entities/user';
import { ErrorChatNotFound } from '~/service/chats/usecase/errors';
import type { ChatsRepository } from '~/service/chats/usecase/repository';
import { ErrorUserNotFound } from '~/service/users/usecase/errors';
import type { UsersRepository } from '~/service/users/usecase/repository';
import { type Err, type Ok, err, errIs, ok } from '~lib/errors';
import { ErrorProfileNotFound } from './errors';
import type { ProfilesRepository } from './repository';

// export type Options = {};

export type Dependencies = {
  repository: ProfilesRepository;
  usersRepository: UsersRepository;
  chatsRepository: ChatsRepository;
};

export class ProfilesUsecase {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  async getProfileOrCreate(userId: string, chatId: string): Promise<Ok<Profile> | Err<Error>> {
    const profileResult = await this.deps.repository.getProfileByUserChat(userId, chatId);
    if (profileResult.result === 'error') {
      if (errIs(profileResult.value, ErrorProfileNotFound)) {
        const profileResult = await this.deps.repository.createProfile({
          id: crypto.randomUUID(),
          userId: userId,
          chatId: chatId,
          level: 0,
          experience: 0,
          createdAt: new Date(),
        });
        if (profileResult.result === 'error') {
          return err(
            new Error('this.deps.repository.createProfile', { cause: profileResult.value }),
          );
        }

        return ok(profileResult.value);
      }

      return err(
        new Error('this.deps.repository.getProfileByUserChat', { cause: profileResult.value }),
      );
    }

    return ok(profileResult.value);
  }

  async getChatOrCreate(chatExternal: { id: number; type: string }): Promise<
    Ok<Chat> | Err<Error>
  > {
    let chatResult = await this.deps.chatsRepository.getChatByExternalId(chatExternal.id);
    if (chatResult.result === 'error') {
      if (errIs(chatResult.value, ErrorChatNotFound)) {
        chatResult = await this.deps.chatsRepository.createChat({
          id: crypto.randomUUID(),
          externalId: chatExternal.id,
          type: chatExternal.type,
          createdAt: new Date(),
        });
        if (chatResult.result === 'error') {
          return err(
            new Error('this.deps.chatsRepository.createChat', { cause: chatResult.value }),
          );
        }
      } else {
        return err(
          new Error('this.deps.chatsRepository.getChatByExternalId', { cause: chatResult.value }),
        );
      }
    }

    return ok(chatResult.value);
  }

  async getUserOrCreate(userExternal: { id: number; isBot: boolean }): Promise<
    Ok<User> | Err<Error>
  > {
    let userResult = await this.deps.usersRepository.getUserByExternalId(userExternal.id);
    if (userResult.result === 'error') {
      if (errIs(userResult.value, ErrorUserNotFound)) {
        userResult = await this.deps.usersRepository.createUser({
          id: crypto.randomUUID(),
          externalId: userExternal.id,
          isBot: userExternal.isBot,
          createdAt: new Date(),
        });
        if (userResult.result === 'error') {
          return err(
            new Error('this.deps.usersRepository.createUser', { cause: userResult.value }),
          );
        }
      } else {
        return err(
          new Error('this.deps.usersRepository.getUserByExternalId', { cause: userResult.value }),
        );
      }
    }

    return ok(userResult.value);
  }

  async getUserChatProfileOrCreate(
    chatExternal: { id: number; type: string },
    userExternal: { id: number; isBot: boolean },
  ): Promise<Ok<{ user: User; chat: Chat; profile: Profile }> | Err<Error>> {
    const chatResult = await this.getChatOrCreate(chatExternal);
    if (chatResult.result === 'error') {
      return err(new Error('this.getChatOrCreate', { cause: chatResult.value }));
    }

    const userResult = await this.getUserOrCreate(userExternal);
    if (userResult.result === 'error') {
      return err(new Error('this.getUserOrCreate', { cause: userResult.value }));
    }

    const profileResult = await this.getProfileOrCreate(userResult.value.id, chatResult.value.id);
    if (profileResult.result === 'error') {
      return err(new Error('this.getProfileOrCreate', { cause: profileResult.value }));
    }
    
    return ok({
      user: userResult.value,
      chat: chatResult.value,
      profile: profileResult.value,
    });
  }
}
