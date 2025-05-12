CREATE TABLE "routine_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"routineId" uuid NOT NULL,
	"task_name" varchar(255) NOT NULL,
	"args" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profileId" uuid NOT NULL,
	"tasks_completed_count" integer DEFAULT 0 NOT NULL,
	"dailies_completed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "routine_tasks" ADD CONSTRAINT "routine_tasks_routineId_routines_id_fk" FOREIGN KEY ("routineId") REFERENCES "public"."routines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_profileId_profiles_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;