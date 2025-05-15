import dayjs from 'dayjs';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Chat } from '~/entities/chat';
import type { Profile } from '~/entities/profile';
import type { User } from '~/entities/user';
import { type ChatDB, chatsTable } from '~db/chats';
import { type ProfileDB, profilesTable } from '~db/profile';
import { type UserDB, usersTable } from '~db/users';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import type { Order, StatsRepository as StatsUsecaseRepository } from '../usecase/repository';

// export type Options = {};

export type Dependencies = {
  db: BunSQLDatabase;
};

export class ProfilesRepository implements StatsUsecaseRepository {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  async getProfilesByChat(
    chatId: string,
    order: Order,
    limit: number,
  ): Promise<
    | Ok<
        {
          profile: Profile;
          chat: Chat;
          user: User;
        }[]
      >
    | Err<Error>
  > {
    const orderBy = Object.entries(order).map(([key, value]) =>
      value === 'asc'
        ? asc(profilesTable[key as keyof ProfileDB])
        : desc(profilesTable[key as keyof ProfileDB]),
    );

    const profilesResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(profilesTable)
        .fullJoin(chatsTable, eq(chatsTable.id, profilesTable.chatId))
        .fullJoin(usersTable, eq(usersTable.id, profilesTable.userId))
        .where(and(eq(profilesTable.chatId, chatId), isNull(profilesTable.deletedAt)))
        .limit(limit)
        .orderBy(...orderBy)
        .execute(),
    );

    if (profilesResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(profilesTable).where(and(eq(profilesTable.chatId, chatId), isNull(profilesTable.deletedAt))).execute()',
          { cause: profilesResult.value },
        ),
      );
    }

    return ok(
      profilesResult.value.map((v) => ({
        profile: transformProfile(v.profiles as ProfileDB),
        chat: transformChat(v.chats as ChatDB),
        user: transformUser(v.users as UserDB),
      })),
    );
  }
}

function transformProfile(profile: ProfileDB): Profile {
  return {
    id: profile.id,
    userId: profile.userId,
    chatId: profile.chatId,
    level: profile.level,
    experience: profile.experience,
    currentLevelMaxExperience: 0, // будет заменено в юзкейсе

    charactersCount: profile.charactersCount,
    wordsCount: profile.wordsCount,
    stickersCount: profile.stickersCount,
    imagesCount: profile.imagesCount,
    videosCount: profile.videosCount,
    audiosCount: profile.audiosCount,
    documentsCount: profile.documentsCount,
    linksCount: profile.linksCount,
    repostsCount: profile.repostsCount,
    reactionsCount: profile.reactionsCount,
    voicesCount: profile.voicesCount,
    circlesCount: profile.circlesCount,
    pollsCount: profile.pollsCount,

    createdAt: dayjs.utc(profile.createdAt).tz(undefined, true).toDate(),
    updatedAt: profile.updatedAt ? dayjs.utc(profile.updatedAt).tz(undefined, true).toDate() : undefined,
    deletedAt: profile.deletedAt ? dayjs.utc(profile.deletedAt).tz(undefined, true).toDate() : undefined,
  };
}

function transformChat(chat: ChatDB): Chat {
  return {
    id: chat.id,
    externalId: chat.externalId,
    type: chat.type,
    createdAt: dayjs.utc(chat.createdAt).tz(undefined, true).toDate(),
    updatedAt: chat.updatedAt ? dayjs.utc(chat.updatedAt).tz(undefined, true).toDate() : undefined,
    deletedAt: chat.deletedAt ? dayjs.utc(chat.deletedAt).tz(undefined, true).toDate() : undefined,
  } satisfies Chat;
}

function transformUser(user: UserDB): User {
  return {
    id: user.id,
    externalId: user.externalId,
    isBot: user.isBot,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    username: user.username ?? undefined,
    createdAt: dayjs.utc(user.createdAt).tz(undefined, true).toDate(),
    updatedAt: user.updatedAt ? dayjs.utc(user.updatedAt).tz(undefined, true).toDate() : undefined,
    deletedAt: user.deletedAt ? dayjs.utc(user.deletedAt).tz(undefined, true).toDate() : undefined,
  } satisfies User;
}
