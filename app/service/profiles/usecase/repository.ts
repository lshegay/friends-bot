import type { Profile } from '~/entities/profile';
import type { Err, Ok } from '~lib/errors';

export interface ProfilesRepository {
  getProfile: (id: string) => Promise<Ok<Profile> | Err<Error>>;
  getProfileByUserChat: (userId: string, chatId: string) => Promise<Ok<Profile> | Err<Error>>;
  getProfileByExternalUserChat: (userId: number, chatId: number) => Promise<Ok<Profile> | Err<Error>>;
  createProfile: (profile: Profile) => Promise<Ok<Profile> | Err<Error>>;
  updateProfile: (profileId: string, profile: Partial<Omit<Profile, 'id'>>) => Promise<Ok<Profile> | Err<Error>>;
  deleteProfile: (id: string) => Promise<Ok<void> | Err<Error>>;
}
