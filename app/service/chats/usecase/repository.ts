import type { Chat } from '~/entities/chat';
import type { Err, Ok } from '~lib/errors';

export interface ChatsRepository {
  getChats: () => Promise<Ok<Chat[]> | Err<Error>>;
  getChat: (id: string) => Promise<Ok<Chat> | Err<Error>>;
  getChatByExternalId: (externalId: number) => Promise<Ok<Chat> | Err<Error>>;
  createChat: (chat: Chat) => Promise<Ok<Chat> | Err<Error>>;
  updateChat: (chatId: string, chat: Omit<Chat, 'id'>) => Promise<Ok<Chat> | Err<Error>>;
  deleteChat: (id: string) => Promise<Ok<void> | Err<Error>>;
}
