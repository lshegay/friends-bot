import { and, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Profile } from '~/entities/profile';
import { chatsTable } from '~db/chats';
import { type ProfileDB, profilesTable } from '~db/profile';
import { usersTable } from '~db/users';
import { err, ok, trycatch } from '~lib/errors';
import { ErrorProfileNotFound } from '../usecase/errors';
import type { ProfilesRepository as ProfilesUsecaseRepository } from '../usecase/repository';

// export type Options = {};

export type Dependencies = {
  db: BunSQLDatabase;
};

export class ProfilesRepository implements ProfilesUsecaseRepository {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  async getProfile(id: string) {
    const profileResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(profilesTable)
        .where(and(eq(profilesTable.id, id), isNull(profilesTable.deletedAt)))
        .limit(1)
        .execute(),
    );
    if (profileResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(profilesTable).where(eq(profilesTable.id, id)).execute()',
          { cause: profileResult.value },
        ),
      );
    }

    if (profileResult.value.length === 0) {
      return err(
        new ErrorProfileNotFound(
          'this.deps.db.select().from(profilesTable).where(eq(profilesTable.id, id)).execute()',
        ),
      );
    }

    return ok(transformProfile(profileResult.value[0]));
  }

  async getProfileByUserChat(userId: string, chatId: string) {
    const profileResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(profilesTable)
        .where(
          and(
            eq(profilesTable.userId, userId),
            eq(profilesTable.chatId, chatId),
            isNull(profilesTable.deletedAt),
          ),
        )
        .limit(1)
        .execute(),
    );
    if (profileResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(profilesTable).where(and(eq(profilesTable.userId, userId),eq(profilesTable.chatId, chatId),isNull(profilesTable.deletedAt)).limit(1).execute()',
          { cause: profileResult.value },
        ),
      );
    }

    if (!profileResult.value.at(0)) {
      return err(
        new ErrorProfileNotFound(
          'this.deps.db.select().from(profilesTable).where(and(eq(profilesTable.userId, userId),eq(profilesTable.chatId, chatId),isNull(profilesTable.deletedAt)).limit(1).execute()',
        ),
      );
    }

    return ok(transformProfile(profileResult.value[0]));
  }

  async getProfileByExternalUserChat(userId: number, chatId: number) {
    const profileResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(profilesTable)
        .fullJoin(usersTable, eq(usersTable.id, profilesTable.userId))
        .fullJoin(chatsTable, eq(chatsTable.id, profilesTable.chatId))
        .where(
          and(
            eq(usersTable.externalId, userId),
            eq(chatsTable.externalId, chatId),
            isNull(profilesTable.deletedAt),
          ),
        )
        .limit(1)
        .execute(),
    );
    if (profileResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(profilesTable).where(eq(profilesTable.userId, id)).execute()',
          { cause: profileResult.value },
        ),
      );
    }

    if (!profileResult.value[0]?.profiles) {
      return err(
        new ErrorProfileNotFound(
          'this.deps.db.select().from(profilesTable).where(eq(profilesTable.userId, id)).execute()',
        ),
      );
    }

    return ok(transformProfile(profileResult.value[0].profiles));
  }

  async createProfile(profile: Profile) {
    const profileResult = await trycatch(() =>
      this.deps.db.insert(profilesTable).values(profile).returning().execute(),
    );
    if (profileResult.result === 'error') {
      return err(
        new Error('this.deps.db.insert(profilesTable).values(profile).returning().execute()', {
          cause: profileResult.value,
        }),
      );
    }

    return ok(transformProfile(profileResult.value[0]));
  }

  async updateProfile(profileId: string, profile: Partial<Omit<Profile, 'id'>>) {
    const profileResult = await trycatch(() =>
      this.deps.db
        .update(profilesTable)
        .set({
          ...profile,
          updatedAt: new Date(),
        })
        .where(eq(profilesTable.id, profileId))
        .returning()
        .execute(),
    );
    if (profileResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(profilesTable).set(profile).where(eq(profilesTable.id, id)).execute()',
          { cause: profileResult.value },
        ),
      );
    }

    return ok(transformProfile(profileResult.value[0]));
  }

  async deleteProfile(id: string) {
    const now = new Date();

    const profileResult = await trycatch(() =>
      this.deps.db
        .update(profilesTable)
        .set({ updatedAt: now, deletedAt: now })
        .where(eq(profilesTable.id, id))
        .returning()
        .execute(),
    );
    if (profileResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(profilesTable).set({ updatedAt: now, deletedAt: now }).where(eq(profilesTable.id, id)).returning().execute()',
          {
            cause: profileResult.value,
          },
        ),
      );
    }

    return ok();
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

    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt || undefined,
    deletedAt: profile.deletedAt || undefined,
  };
}
