import { and, desc, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Chat } from '~/entities/chat';
import { type ChatDB, chatsTable } from '~db/chats';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import { ErrorChatNotFound } from '../usecase/errors';
import type { ChatsRepository as ChatsUsecaseRepository } from '../usecase/repository';
import dayjs from 'dayjs';

// export type Options = {};

export type Dependencies = {
  db: BunSQLDatabase;
};

export class ChatsRepository implements ChatsUsecaseRepository {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  async getChats(): Promise<Ok<Chat[]> | Err<Error>> {
    const chatsResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(chatsTable)
        .where(isNull(chatsTable.deletedAt))
        .orderBy(desc(chatsTable.createdAt))
        .execute(),
    );
    if (chatsResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(chatsTable).where(isNull(chatsTable.deletedAt)).execute()',
          {
            cause: chatsResult.value,
          },
        ),
      );
    }

    return ok(chatsResult.value.map(transformChat));
  }

  async getChat(id: string): Promise<Ok<Chat> | Err<Error>> {
    const chatResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(chatsTable)
        .where(and(eq(chatsTable.id, id), isNull(chatsTable.deletedAt)))
        .limit(1)
        .execute(),
    );
    if (chatResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(chatsTable).where(and(eq(chatsTable.id, id), isNull(chatsTable.deletedAt))).limit(1).execute()',
          { cause: chatResult.value },
        ),
      );
    }

    if (!chatResult.value.at(0)) {
      return err(
        new ErrorChatNotFound(
          'this.deps.db.select().from(chatsTable).where(and(eq(chatsTable.id, id), isNull(chatsTable.deletedAt))).execute()',
        ),
      );
    }

    return ok(transformChat(chatResult.value[0]));
  }

  async getChatByExternalId(externalId: number): Promise<Ok<Chat> | Err<Error>> {
    const chatResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(chatsTable)
        .where(and(eq(chatsTable.externalId, externalId), isNull(chatsTable.deletedAt)))
        .limit(1)
        .execute(),
    );
    if (chatResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(chatsTable).where(and(eq(chatsTable.externalId, externalId), isNull(chatsTable.deletedAt))).limit(1).execute()',
          { cause: chatResult.value },
        ),
      );
    }

    if (!chatResult.value.at(0)) {
      return err(
        new ErrorChatNotFound(
          'this.deps.db.select().from(chatsTable).where(and(eq(chatsTable.externalId, externalId), isNull(chatsTable.deletedAt))).execute()',
        ),
      );
    }

    return ok(transformChat(chatResult.value[0]));
  }

  async createChat(chat: Chat): Promise<Ok<Chat> | Err<Error>> {
    const chatResult = await trycatch(() =>
      this.deps.db.insert(chatsTable).values(chat).returning().execute(),
    );
    if (chatResult.result === 'error') {
      return err(
        new Error('this.deps.db.insert(chatsTable).values(chat).returning().execute()', {
          cause: chatResult.value,
        }),
      );
    }

    return ok(transformChat(chatResult.value[0]));
  }

  async updateChat(chatId: string, chat: Omit<Chat, 'id'>): Promise<Ok<Chat> | Err<Error>> {
    const chatResult = await trycatch(() =>
      this.deps.db
        .update(chatsTable)
        .set({ ...chat, updatedAt: new Date() })
        .where(eq(chatsTable.id, chatId))
        .returning()
        .execute(),
    );
    if (chatResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(chatsTable).set(chat).where(eq(chatsTable.id, chatId)).execute()',
          {
            cause: chatResult.value,
          },
        ),
      );
    }

    return ok(transformChat(chatResult.value[0]));
  }

  async deleteChat(id: string): Promise<Ok<void> | Err<Error>> {
    const now = new Date();

    const chatResult = await trycatch(() =>
      this.deps.db
        .update(chatsTable)
        .set({ updatedAt: now, deletedAt: now })
        .where(eq(chatsTable.id, id))
        .execute(),
    );
    if (chatResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(chatsTable).set({ updatedAt: now, deletedAt: now }).where(eq(chatsTable.id, id)).execute()',
          {
            cause: chatResult.value,
          },
        ),
      );
    }

    return ok<void>();
  }
}

export function transformChat(chat: ChatDB): Chat {
  return {
    id: chat.id,
    externalId: chat.externalId,
    type: chat.type,
    createdAt: dayjs.utc(chat.createdAt).tz(undefined, true).toDate(),
    updatedAt: chat.updatedAt ? dayjs.utc(chat.updatedAt).tz(undefined, true).toDate() : undefined,
    deletedAt: chat.deletedAt ? dayjs.utc(chat.deletedAt).tz(undefined, true).toDate() : undefined,
  } satisfies Chat;
}
