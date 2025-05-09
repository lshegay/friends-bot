import type { Chat } from '~/entities/chat';
import { type Err, type Ok, err, ok } from '~lib/errors';
import type { ChatsRepository } from './repository';

export type Dependencies = {
  repository: ChatsRepository;
};

export class ChatsUsecase {
  constructor(private readonly deps: Dependencies) {}

  async getChats(): Promise<Ok<Chat[]> | Err<Error>> {
    const chatsResult = await this.deps.repository.getChats();
    if (chatsResult.result === 'error') {
      return err(new Error('this.deps.repository.getChats', { cause: chatsResult.value }));
    }

    const chats = chatsResult.value;

    return ok(chats);
  }
}
