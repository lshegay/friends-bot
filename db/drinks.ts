import { integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { attachmentsTable } from './attachments';
import { chatsTable } from './chats';
import { profilesTable } from './profile';

export const drinksTable = pgTable(
  'drinks',
  {
    id: uuid().primaryKey(),
    chatId: uuid()
      .notNull()
      .references(() => chatsTable.id),

    name: varchar({ length: 256 }).notNull(),
    description: varchar({ length: 256 }).notNull(),

    imageId: uuid()
      .notNull()
      .references(() => attachmentsTable.id),
    imageDrinkId: uuid()
      .notNull()
      .references(() => attachmentsTable.id),
    imageDrinkGoneBadId: uuid().references(() => attachmentsTable.id),
    imageDrinkEmptyId: uuid()
      .notNull()
      .references(() => attachmentsTable.id),

    sips: integer('sips').notNull().default(1),
    freshness: integer().notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [uniqueIndex('drinks_chat_id_name_idx').on(table.chatId, table.name)],
);

export type DrinkDB = typeof drinksTable.$inferSelect;

export const drinksProgressTable = pgTable('drinks_progress', {
  id: uuid().primaryKey(),
  drinkId: uuid()
    .notNull()
    .references(() => drinksTable.id),
  profileId: uuid()
    .notNull()
    .references(() => profilesTable.id),

  progress: integer().notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export type DrinkProgressDB = typeof drinksProgressTable.$inferSelect;
