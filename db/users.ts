import { boolean, doublePrecision, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'users',
  {
    id: uuid().primaryKey(),
    externalId: doublePrecision('external_id').notNull(),
    isBot: boolean('is_bot').notNull().default(false),
    firstName: varchar('first_name', { length: 255 }),
    lastName: varchar('last_name', { length: 255 }),
    username: varchar('username', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [uniqueIndex('users_external_id_idx').on(table.externalId)],
);

export type UserDB = typeof usersTable.$inferSelect;
