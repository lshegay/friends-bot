export type Profile = {
  id: string;
  userId: string;
  chatId: string;

  level: number;
  experience: number;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};
