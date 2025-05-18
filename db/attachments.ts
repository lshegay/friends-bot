import {
  doublePrecision,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const attachmentsTable = pgTable(
  'attachments',
  {
    id: uuid().primaryKey(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    objectId: varchar('object_id', { length: 255 }).notNull(),

    filename: varchar('filename', { length: 255 }).notNull(),
    hash: varchar('hash', { length: 255 }).notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('attachments_external_id_idx').on(table.externalId),
    uniqueIndex('attachments_object_id_idx').on(table.objectId),
    uniqueIndex('attachments_hash_idx').on(table.hash),
  ],
);

export type AttachmentDB = typeof attachmentsTable.$inferSelect;
