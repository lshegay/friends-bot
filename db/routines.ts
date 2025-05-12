import { integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { profilesTable } from './profile';

export const routinesTable = pgTable('routines', {
  id: uuid().primaryKey(),
  profileId: uuid()
    .notNull()
    .references(() => profilesTable.id),

  tasksCompletedCount: integer('tasks_completed_count').default(0).notNull(),
  dailiesCompletedCount: integer('dailies_completed_count').default(0).notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export type RoutineDB = typeof routinesTable.$inferSelect;

export const routineTasksTable = pgTable('routine_tasks', {
  id: uuid().primaryKey(),
  routineId: uuid()
    .notNull()
    .references(() => routinesTable.id),

  taskName: varchar('task_name', { length: 255 }).notNull(),
  args: jsonb('args').default({}).notNull(),
  status: varchar('status', { length: 255 }).notNull(), // active, completed

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  // будем удалять в реальности, т.к. не будет места на столько задач
  // deletedAt: timestamp('deleted_at'),
});

export type RoutineTasksDB = typeof routineTasksTable.$inferSelect;
