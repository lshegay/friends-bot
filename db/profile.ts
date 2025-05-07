import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { chatsTable } from './chats';
import { usersTable } from './users';

export const profilesTable = pgTable('profiles', {
  id: uuid().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  chatId: uuid()
    .notNull()
    .references(() => chatsTable.id),

  level: integer().notNull().default(0),
  experience: integer().notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export type ProfileDB = typeof profilesTable.$inferSelect;
