import { boolean, doublePrecision, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'users',
  {
    id: uuid().primaryKey(),
    externalId: doublePrecision('external_id').notNull(),
    isBot: boolean('is_bot').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [uniqueIndex('users_external_id_idx').on(table.externalId)],
);

export type UserDB = typeof usersTable.$inferSelect;
