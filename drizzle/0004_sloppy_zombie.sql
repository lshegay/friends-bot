CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"object_id" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"hash" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "drinks_progress" (
	"id" uuid PRIMARY KEY NOT NULL,
	"drinkId" uuid NOT NULL,
	"profileId" uuid NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "drinks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chatId" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" varchar(256) NOT NULL,
	"imageId" uuid NOT NULL,
	"imageDrinkId" uuid NOT NULL,
	"imageDrinkGoneBadId" uuid,
	"imageDrinkEmptyId" uuid NOT NULL,
	"sips" integer DEFAULT 1 NOT NULL,
	"freshness" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "drinks_progress" ADD CONSTRAINT "drinks_progress_drinkId_drinks_id_fk" FOREIGN KEY ("drinkId") REFERENCES "public"."drinks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drinks_progress" ADD CONSTRAINT "drinks_progress_profileId_profiles_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_chatId_chats_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_imageId_attachments_id_fk" FOREIGN KEY ("imageId") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_imageDrinkId_attachments_id_fk" FOREIGN KEY ("imageDrinkId") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_imageDrinkGoneBadId_attachments_id_fk" FOREIGN KEY ("imageDrinkGoneBadId") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_imageDrinkEmptyId_attachments_id_fk" FOREIGN KEY ("imageDrinkEmptyId") REFERENCES "public"."attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_external_id_idx" ON "attachments" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_object_id_idx" ON "attachments" USING btree ("object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_hash_idx" ON "attachments" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "drinks_chat_id_name_idx" ON "drinks" USING btree ("chatId","name");