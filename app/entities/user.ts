export type User = {
  id: string;
  externalId: number;
  isBot: boolean;
  firstName?: string;
  lastName?: string;
  username?: string;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};