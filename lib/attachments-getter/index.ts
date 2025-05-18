import type { Attachment } from '~/entities/attachments';
import { type Err, type Ok, err, errIs, ok } from '~lib/errors';
import { hashFile } from '~lib/hasher';
import { ErrorAttachmentNotFound } from './errors';
import type {
  AttachmentsDBRepository,
  AttachmentsExternalRepository,
  AttachmentsObjectRepository,
} from './repository';

export type Dependencies = {
  objectRepository: AttachmentsObjectRepository;
  dbRepository: AttachmentsDBRepository;
  externalRepository: AttachmentsExternalRepository;
};

export class AttachmentsGetter {
  constructor(private readonly deps: Dependencies) {}

  async setFile(file: File, externalId?: string): Promise<Ok<Attachment> | Err<Error>> {
    const hash = await hashFile(file);

    const fileDBByHashResult = await this.deps.dbRepository.getAttachmentByHash(hash);
    if (fileDBByHashResult.result === 'error') {
      if (!errIs(fileDBByHashResult.value, ErrorAttachmentNotFound)) {
        return err(
          new Error('this.deps.dbRepository.getFileByHash', { cause: fileDBByHashResult.value }),
        );
      }
    } else {
      return ok(fileDBByHashResult.value);
    }

    if (!externalId) {
      return err(new Error('externalId is required'));
    }

    const objectIdResult = await this.deps.objectRepository.writeObject(file);
    if (objectIdResult.result === 'error') {
      return err(
        new Error('this.deps.objectRepository.objectIdResult', { cause: objectIdResult.value }),
      );
    }

    const objectId = objectIdResult.value;

    const fileDBResult = await this.deps.dbRepository.createAttachment({
      id: crypto.randomUUID(),
      externalId,
      objectId,
      filename: file.name,
      hash,
      createdAt: new Date(),
    });
    if (fileDBResult.result === 'error') {
      return err(new Error('this.deps.dbRepository.updateFile', { cause: fileDBResult.value }));
    }

    return ok(fileDBResult.value);
  }

  async setFileByExternalId(externalId: string): Promise<Ok<Attachment> | Err<Error>> {
    const fileDBByExternalIdResult =
      await this.deps.dbRepository.getAttachmentByExternalId(externalId);
    if (fileDBByExternalIdResult.result === 'error') {
      if (!errIs(fileDBByExternalIdResult.value, ErrorAttachmentNotFound)) {
        return err(
          new Error('this.deps.dbRepository.getFileByExternalId', {
            cause: fileDBByExternalIdResult.value,
          }),
        );
      }
    } else {
      return ok(fileDBByExternalIdResult.value);
    }

    const fileExternalResult = await this.deps.externalRepository.downloadFile(externalId);
    if (fileExternalResult.result === 'error') {
      return err(
        new Error('this.deps.externalRepository.downloadFile', { cause: fileExternalResult.value }),
      );
    }

    const fileDBResult = await this.setFile(fileExternalResult.value, externalId);
    if (fileDBResult.result === 'error') {
      return err(new Error('this.setFile', { cause: fileDBResult.value }));
    }

    return ok(fileDBResult.value);
  }

  async getFileSource(attachmentId: string): Promise<Ok<string> | Err<Error>> {
    const fileDBResult = await this.deps.dbRepository.getAttachment(attachmentId);
    if (fileDBResult.result === 'error') {
      return err(new Error('this.deps.dbRepository.getFile', { cause: fileDBResult.value }));
    }

    const fileDB = fileDBResult.value;

    /* const fileObjectResult = await this.deps.objectRepository.getObjectURL(attachmentId);
    if (fileObjectResult.result === 'error') {
      return err(
        new Error('this.deps.objectRepository.getFileURL', { cause: fileObjectResult.value }),
      );
    }

    const fileObjectURL = fileObjectResult.value;

    return ok(fileObjectURL); */

    return ok(fileDB.externalId);
  }
}
