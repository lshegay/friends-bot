import { and, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { User } from '~/entities/user';
import { type UserDB, usersTable } from '~db/users';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';
import { ErrorUserNotFound } from '../usecase/errors';
import type { UsersRepository as UsersUsecaseRepository } from '../usecase/repository';

// export type Options = {};

export type Dependencies = {
  db: BunSQLDatabase;
};

export class UsersRepository implements UsersUsecaseRepository {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  async getUser(id: string): Promise<Ok<User> | Err<Error>> {
    const userResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)))
        .limit(1)
        .execute(),
    );
    if (userResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(usersTable).where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt))).limit(1).execute()',
          {
            cause: userResult.value,
          },
        ),
      );
    }

    if (!userResult.value.at(0)) {
      return err(
        new ErrorUserNotFound(
          'this.deps.db.select().from(usersTable).where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt))).limit(1).execute()',
        ),
      );
    }

    return ok(transformUser(userResult.value[0]));
  }

  async getUserByExternalId(externalId: number): Promise<Ok<User> | Err<Error>> {
    const UserResult = await trycatch(() =>
      this.deps.db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.externalId, externalId), isNull(usersTable.deletedAt)))
        .limit(1)
        .execute(),
    );
    if (UserResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.select().from(usersTable).where(and(eq(usersTable.externalId, externalId), isNull(usersTable.deletedAt))).limit(1).execute()',
          { cause: UserResult.value },
        ),
      );
    }

    if (!UserResult.value.at(0)) {
      return err(
        new ErrorUserNotFound(
          'this.deps.db.select().from(usersTable).where(and(eq(usersTable.externalId, externalId), isNull(usersTable.deletedAt))).limit(1).execute()',
        ),
      );
    }

    return ok(transformUser(UserResult.value[0]));
  }

  async createUser(user: User): Promise<Ok<User> | Err<Error>> {
    const userResult = await trycatch(() =>
      this.deps.db.insert(usersTable).values(user).returning().execute(),
    );
    if (userResult.result === 'error') {
      return err(
        new Error('this.deps.db.insert(usersTable).values(user).returning().execute()', {
          cause: userResult.value,
        }),
      );
    }

    return ok(transformUser(userResult.value[0]));
  }

  async updateUser(userId: string, user: Omit<User, 'id'>): Promise<Ok<User> | Err<Error>> {
    const userResult = await trycatch(() =>
      this.deps.db
        .update(usersTable)
        .set({ ...user, updatedAt: new Date() })
        .where(eq(usersTable.id, userId))
        .returning()
        .execute(),
    );
    if (userResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(usersTable).set(user).where(eq(usersTable.id, userId)).returning().execute()',
          {
            cause: userResult.value,
          },
        ),
      );
    }

    return ok(transformUser(userResult.value[0]));
  }

  async deleteUser(id: string): Promise<Ok<void> | Err<Error>> {
    const now = new Date();

    const userResult = await trycatch(() =>
      this.deps.db
        .update(usersTable)
        .set({ updatedAt: now, deletedAt: now })
        .where(eq(usersTable.id, id))
        .execute(),
    );
    if (userResult.result === 'error') {
      return err(
        new Error(
          'this.deps.db.update(usersTable).set({ updatedAt: now, deletedAt: now }).where(eq(usersTable.id, id)).execute()',
          {
            cause: userResult.value,
          },
        ),
      );
    }

    return ok<void>();
  }
}

export function transformUser(user: UserDB): User {
  return {
    id: user.id,
    externalId: user.externalId,
    isBot: user.isBot,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt ?? undefined,
    deletedAt: user.deletedAt ?? undefined,
  } satisfies User;
}
