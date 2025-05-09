export type Profile = ProfileStatistics & {
  id: string;
  userId: string;
  chatId: string;

  level: number;
  experience: number;
  currentLevelMaxExperience: number;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};

export type ProfileStatistics = {
  charactersCount: number;
  wordsCount: number;
  stickersCount: number;
  imagesCount: number;
  videosCount: number;
  audiosCount: number;
  documentsCount: number;
  linksCount: number;
  repostsCount: number;
  reactionsCount: number;
  voicesCount: number;
  circlesCount: number;
  pollsCount: number;
}
