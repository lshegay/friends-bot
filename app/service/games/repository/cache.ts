import { and, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Profile } from '~/entities/profile';
import { chatsTable } from '~db/chats';
import { type ProfileDB, profilesTable } from '~db/profile';
import { usersTable } from '~db/users';
import { err, ok, trycatch, type Err, type Ok } from '~lib/errors';
import { ErrorProfileNotFound } from '../usecase/errors';
import type { GamesRepository as GamesUsecaseRepository } from '../usecase/repository';

// export type Options = {};

export type Dependencies = {
  db: BunSQLDatabase;
};

export class CacheRepository implements GamesUsecaseCacheRepository {
  constructor(
    private readonly deps: Dependencies,
    // private readonly options: Options,
  ) {}

  getCoffeeImage(): Promise<Ok<string | Buffer> | Err<Error>> {
    Bun.file('assets/narberal/coffee.jpg')
  }
  
}