import type { User } from '~/entities/user';
import type { Err, Ok } from '~lib/errors';

export interface UsersRepository {
  getUser: (id: string) => Promise<Ok<User> | Err<Error>>;
  getUserByExternalId: (externalId: number) => Promise<Ok<User> | Err<Error>>;
  createUser: (User: User) => Promise<Ok<User> | Err<Error>>;
  updateUser: (userId: string, user: Omit<User, 'id'>) => Promise<Ok<User> | Err<Error>>;
  deleteUser: (id: string) => Promise<Ok<void> | Err<Error>>;
}
