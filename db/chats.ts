import { doublePrecision, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const chatsTable = pgTable(
  'chats',
  {
    id: uuid().primaryKey(),
    externalId: doublePrecision('external_id').notNull(),
    type: varchar({ length: 50 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [uniqueIndex('chats_external_id_idx').on(table.externalId)],
);

export type ChatDB = typeof chatsTable.$inferSelect;
