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

  level: integer().notNull().default(1),
  experience: integer().notNull().default(0),

  charactersCount: integer('characters_count').notNull().default(0),
  wordsCount: integer('words_count').notNull().default(0),
  stickersCount: integer('stickers_count').notNull().default(0),
  imagesCount: integer('images_count').notNull().default(0),
  videosCount: integer('videos_count').notNull().default(0),
  audiosCount: integer('audios_count').notNull().default(0),
  documentsCount: integer('documents_count').notNull().default(0),
  linksCount: integer('links_count').notNull().default(0),
  repostsCount: integer('reposts_count').notNull().default(0),
  reactionsCount: integer('reactions_count').notNull().default(0),
  voicesCount: integer('voices_count').notNull().default(0),
  circlesCount: integer('circles_count').notNull().default(0),
  pollsCount: integer('polls_count').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export type ProfileDB = typeof profilesTable.$inferSelect;
