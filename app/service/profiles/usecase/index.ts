import type { Chat } from '~/entities/chat';
import type { Profile, ProfileStatistics } from '~/entities/profile';
import type { User } from '~/entities/user';
import { ErrorChatNotFound } from '~/service/chats/usecase/errors';
import type { ChatsRepository } from '~/service/chats/usecase/repository';
import { ErrorUserNotFound } from '~/service/users/usecase/errors';
import type { UsersRepository } from '~/service/users/usecase/repository';
import { type Err, type Ok, err, errIs, ok } from '~lib/errors';
import { addLevelExperience, getLevelMaxExperience } from '~lib/level-experience';
import { ErrorProfileNotFound } from './errors';
import type { ProfilesRepository } from './repository';

export type Options = {
  firstLevelMaxExperience: number; // опыт, который нужен для получения 2-го уровня
  experienceProportionIncrease: number; // пропорция увеличения опыта относительно предыдущего уровня для получения следующего уровня

  charactersExperience: number; // опыт за символ
  stickersExperience: number; // опыт за стикер
  imagesExperience: number; // опыт за изображение
  videosExperience: number; // опыт за видео
  audiosExperience: number; // опыт за аудио
  documentsExperience: number; // опыт за документ
  linksExperience: number; // опыт за ссылку
  repostsExperience: number; // опыт за репост
  reactionsExperience: number; // опыт за реакцию
  voicesExperience: number; // опыт за голосовое сообщение
  circlesExperience: number; // опыт за круг
  pollsExperience: number; // опыт за опрос
};

export type Dependencies = {
  repository: ProfilesRepository;
  usersRepository: UsersRepository;
  chatsRepository: ChatsRepository;
};

export type AddProfileExperienceReason = {
  characters?: { text: string };
  stickers?: Record<string, unknown>;
  images?: Record<string, unknown>;
  videos?: Record<string, unknown>;
  audios?: Record<string, unknown>;
  documents?: Record<string, unknown>;
  links?: Record<string, unknown>;
  reposts?: Record<string, unknown>;
  reactions?: Record<string, unknown>;
  voices?: Record<string, unknown>;
  circles?: Record<string, unknown>;
  polls?: Record<string, unknown>;
};

export class ProfilesUsecase {
  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {}

  async getProfileOrCreate(userId: string, chatId: string): Promise<Ok<Profile> | Err<Error>> {
    const profileResult = await this.deps.repository.getProfileByUserChat(userId, chatId);
    if (profileResult.result === 'error') {
      if (errIs(profileResult.value, ErrorProfileNotFound)) {
        const profileResult = await this.deps.repository.createProfile({
          id: crypto.randomUUID(),
          userId: userId,
          chatId: chatId,
          level: 1,
          experience: 0,
          currentLevelMaxExperience: this.options.firstLevelMaxExperience,

          charactersCount: 0,
          wordsCount: 0,
          stickersCount: 0,
          imagesCount: 0,
          videosCount: 0,
          audiosCount: 0,
          documentsCount: 0,
          linksCount: 0,
          repostsCount: 0,
          reactionsCount: 0,
          voicesCount: 0,
          circlesCount: 0,
          pollsCount: 0,

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

    return ok({
      ...profileResult.value,
      currentLevelMaxExperience: getLevelMaxExperience(profileResult.value.level, {
        firstLevelMaxExperience: this.options.firstLevelMaxExperience,
        experienceProportionIncrease: this.options.experienceProportionIncrease,
      }),
    });
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

  async addProfileExperience(
    profile: Profile,
    reason: AddProfileExperienceReason,
  ): Promise<Ok<{ profile: Profile; maxExperience: number }> | Err<Error>> {
    const profileStatistics: ProfileStatistics = {
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
    };

    let exp = 0;

    // репосты идут отдельно и не должны учитываться в других причинах
    // например, если пользователь репостнул сообщение с картинкой, то он не должен получать опыт за картинку
    // и за количество символов в тексте
    if (reason.reposts) {
      exp += this.options.repostsExperience;
      profileStatistics.repostsCount++;
    } else {
      if (reason.characters) {
        // удаляем повторяющиеся символы
        // например, если текст "ааааааааааааааааааа", то он будет считаться как 2 символа, а не 20
        // это нужно для того, чтобы не давать слишком много опыта за повторяющиеся символы
        const text = reason.characters.text.replaceAll(/(.)\1{2,}/g, '$1$1');
        const count = text.length;

        exp += count * this.options.charactersExperience;
        profileStatistics.charactersCount += count;
        profileStatistics.wordsCount += text.split(' ').length;
      }

      if (reason.images) {
        exp += this.options.imagesExperience;
        profileStatistics.imagesCount++;
      }

      if (reason.stickers) {
        exp += this.options.stickersExperience;
        profileStatistics.stickersCount++;
      }

      if (reason.videos) {
        exp += this.options.videosExperience;
        profileStatistics.videosCount++;
      }

      if (reason.audios) {
        exp += this.options.audiosExperience;
        profileStatistics.audiosCount++;
      }

      if (reason.documents) {
        exp += this.options.documentsExperience;
        profileStatistics.documentsCount++;
      }

      if (reason.links) {
        exp += this.options.linksExperience;
        profileStatistics.linksCount++;
      }

      if (reason.reactions) {
        exp += this.options.reactionsExperience;
        profileStatistics.reactionsCount++;
      }

      if (reason.voices) {
        exp += this.options.voicesExperience;
        profileStatistics.voicesCount++;
      }

      if (reason.circles) {
        exp += this.options.circlesExperience;
        profileStatistics.circlesCount++;
      }

      if (reason.polls) {
        exp += this.options.pollsExperience;
        profileStatistics.pollsCount++;
      }
    }

    const {
      experience: newExperience,
      level: newLevel,
      maxExperience,
    } = addLevelExperience(exp, {
      currentLevel: profile.level,
      currentExperience: profile.experience,
      experienceProportionIncrease: this.options.experienceProportionIncrease,
      firstLevelMaxExperience: this.options.firstLevelMaxExperience,
    });

    const profileResult = await this.deps.repository.updateProfile(profile.id, {
      level: newLevel,
      experience: newExperience,
      updatedAt: new Date(),

      ...profileStatistics,
    });
    if (profileResult.result === 'error') {
      return err(new Error('this.deps.repository.updateProfile', { cause: profileResult.value }));
    }

    return ok({ profile: profileResult.value, maxExperience });
  }

  async getProfileStats(profile: Profile) {
    return {
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
    };
  }
}
