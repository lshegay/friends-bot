import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { Attachment } from '~/entities/attachments';
import { type AttachmentDB, attachmentsTable } from '~db/attachments';
import { ErrorAttachmentNotFound } from '~lib/attachments-getter/errors';
import type { AttachmentsDBRepository } from '~lib/attachments-getter/repository';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';

export type Dependencies = {
  db: BunSQLDatabase;
};

export class AttachmentsPostgresRepository implements AttachmentsDBRepository {
  constructor(private readonly deps: Dependencies) {}

  async getAttachmentByHash(hash: string): Promise<Ok<Attachment> | Err<Error>> {
    const result = await trycatch(() =>
      this.deps.db
        .select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.hash, hash))
        .limit(1)
        .execute(),
    );
    if (result.result === 'error') {
      return err(
        new Error(
          'this.deps.db..select().from(attachmentsTable).where(eq(attachmentsTable.hash, hash)).limit(1)',
          { cause: result.value },
        ),
      );
    }

    const attachment = result.value.at(0);
    if (!attachment) {
      return err(
        new ErrorAttachmentNotFound(
          'this.deps.db..select().from(attachmentsTable).where(eq(attachmentsTable.hash, hash)).limit(1)',
        ),
      );
    }

    return ok(transformAttachment(attachment));
  }

  async getAttachment(attachmentId: string): Promise<Ok<Attachment> | Err<Error>> {
    const result = await trycatch(() =>
      this.deps.db
        .select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.id, attachmentId))
        .limit(1)
        .execute(),
    );
    if (result.result === 'error') {
      return err(
        new Error(
          'this.deps.db..select().from(attachmentsTable).where(eq(attachmentsTable.id, attachmentId)).limit(1)',
          { cause: result.value },
        ),
      );
    }

    const attachment = result.value.at(0);
    if (!attachment) {
      return err(
        new ErrorAttachmentNotFound(
          'this.deps.db..select().from(attachmentsTable).where(eq(attachmentsTable.id, attachmentId)).limit(1)',
        ),
      );
    }

    return ok(transformAttachment(attachment));
  }

  async getAttachmentByExternalId(externalId: string): Promise<Ok<Attachment> | Err<Error>> {
    const result = await trycatch(() =>
      this.deps.db
        .select()
        .from(attachmentsTable)
        .where(eq(attachmentsTable.externalId, externalId))
        .limit(1)
        .execute(),
    );
    if (result.result === 'error') {
      return err(
        new Error(
          'this.deps.db..select().from(attachmentsTable).where(eq(attachmentsTable.externalId, externalId)).limit(1)',
          { cause: result.value },
        ),
      );
    }

    const attachment = result.value.at(0);
    if (!attachment) {
      return err(
        new ErrorAttachmentNotFound(
          'this.deps.db..select().from(attachmentsTable).where(eq(attachmentsTable.externalId, externalId)).limit(1)',
        ),
      );
    }

    return ok(transformAttachment(attachment));
  }

  async createAttachment(newAttachment: Attachment): Promise<Ok<Attachment> | Err<Error>> {
    const result = await trycatch(() =>
      this.deps.db
        .insert(attachmentsTable)
        .values({
          id: newAttachment.id,
          externalId: newAttachment.externalId,
          objectId: newAttachment.objectId,
          filename: newAttachment.filename,
          hash: newAttachment.hash,
          createdAt: newAttachment.createdAt,
        })
        .returning()
        .execute(),
    );
    if (result.result === 'error') {
      return err(
        new Error('this.deps.db.insert(attachmentsTable).values().returning().execute()', {
          cause: result.value,
        }),
      );
    }

    const attachment = result.value[0];

    return ok(transformAttachment(attachment));
  }

  async updateAttachment(
    attachmentId: string,
    file: Partial<Omit<Attachment, 'id' | 'createdAt'>>,
  ): Promise<Ok<Attachment> | Err<Error>> {
    const result = await trycatch(() =>
      this.deps.db
        .update(attachmentsTable)
        .set({
          ...file,
          updatedAt: new Date(),
        })
        .where(eq(attachmentsTable.id, attachmentId))
        .returning()
        .execute(),
    );
    if (result.result === 'error') {
      // TODO: not found

      return err(
        new Error(
          'this.deps.db.update(attachmentsTable).set().where(eq(attachmentsTable.id, attachmentId)).returning().execute()',
          { cause: result.value },
        ),
      );
    }

    const attachment = result.value[0];

    return ok(transformAttachment(attachment));
  }

  async deleteAttachment(attachmentId: string): Promise<Ok<void> | Err<Error>> {
    const result = await trycatch(() =>
      this.deps.db
        .delete(attachmentsTable)
        .where(eq(attachmentsTable.id, attachmentId))
        .returning()
        .execute(),
    );
    if (result.result === 'error') {
      return err(
        new Error(
          'this.deps.db.delete(attachmentsTable).where(eq(attachmentsTable.id, attachmentId)).returning().execute()',
          { cause: result.value },
        ),
      );
    }

    return ok<void>();
  }
}

export function transformAttachment(attachment: AttachmentDB): Attachment {
  return {
    id: attachment.id,
    externalId: attachment.externalId,
    objectId: attachment.objectId,
    filename: attachment.filename,
    hash: attachment.hash,

    createdAt: dayjs.utc(attachment.createdAt).tz(undefined, true).toDate(),
    updatedAt: attachment.updatedAt
      ? dayjs.utc(attachment.updatedAt).tz(undefined, true).toDate()
      : undefined,
    deletedAt: attachment.deletedAt
      ? dayjs.utc(attachment.deletedAt).tz(undefined, true).toDate()
      : undefined,
  };
}
