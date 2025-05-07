export type User = {
  id: string;
  externalId: number;
  isBot: boolean;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};