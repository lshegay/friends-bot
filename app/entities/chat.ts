export type Chat = {
  id: string;
  externalId: number;

  type: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
};