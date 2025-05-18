import type { Attachment } from '~/entities/attachments';
import type { Err, Ok } from '~lib/errors';

export interface AttachmentsObjectRepository {
  getObjectURL(objectId: string): Promise<Ok<string> | Err<Error>>;
  writeObject(file: File): Promise<Ok<string> | Err<Error>>;
  deleteObject(objectId: string): Promise<Ok<void> | Err<Error>>;
}

export interface AttachmentsDBRepository {
  getAttachmentByHash(hash: string): Promise<Ok<Attachment> | Err<Error>>;
  getAttachment(attachmentId: string): Promise<Ok<Attachment> | Err<Error>>;
  getAttachmentByExternalId(externalId: string): Promise<Ok<Attachment> | Err<Error>>;
  createAttachment(attachment: Attachment): Promise<Ok<Attachment> | Err<Error>>;
  updateAttachment(attachmentId: string, file: Attachment): Promise<Ok<Attachment> | Err<Error>>;
  deleteAttachment(attachmentId: string): Promise<Ok<void> | Err<Error>>;
}

export interface AttachmentsExternalRepository {
  downloadFile(externalId: string): Promise<Ok<File> | Err<Error>>;
}