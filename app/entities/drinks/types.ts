export type Drink = {
  id: string;
  chatId: string;

  name: string;
  description: string;
  imageId: string;
  imageDrinkId: string;
  imageDrinkGoneBadId?: string;
  imageDrinkEmptyId: string;

  /**
   * Количество глотков, которые нужно сделать, чтобы выпить напиток.
   */
  sips: number;

  /**
   * Свежесть напитка в мс.
   * Если равен 0, то напиток не портится.
   */
  freshness: number;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};

export type DrinkProgress = {
  id: string;
  drinkId: string;
  profileId: string;

  progress: number; // от 0 до sips

  createdAt: Date;
  updatedAt?: Date;
}
