import type { S3Client } from 'bun';
import { ErrorAttachmentNotFound } from '~lib/attachments-getter/errors';
import type { AttachmentsObjectRepository as AttachmentsObjectUsecaseRepository } from '~lib/attachments-getter/repository';
import { type Err, type Ok, err, ok, trycatch } from '~lib/errors';

export type Dependencies = {
  s3: S3Client;
};

export type Options = {
  s3Bucket: string;

  s3LinksExpiration: number; // seconds
};

export class AttachmentsObjectRepository implements AttachmentsObjectUsecaseRepository {
  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options,
  ) {}

  async getObjectURL(objectId: string): Promise<Ok<string> | Err<Error>> {
    const objectExistsResult = await trycatch(() =>
      this.deps.s3.exists(objectId, { bucket: this.options.s3Bucket }),
    );
    if (objectExistsResult.result === 'error') {
      return err(new Error('this.deps.s3.exists', { cause: objectExistsResult.value }));
    }

    if (!objectExistsResult.value) {
      return err(new ErrorAttachmentNotFound('this.deps.s3.exists'));
    }

    const urlResponse = await trycatch(() =>
      this.deps.s3.presign(objectId, {
        bucket: this.options.s3Bucket,
        expiresIn: this.options.s3LinksExpiration,
        method: 'GET',
      }),
    );
    if (urlResponse.result === 'error') {
      return err(new Error('this.deps.s3.presign', { cause: urlResponse.value }));
    }

    return ok(urlResponse.value);
  }

  async writeObject(file: File): Promise<Ok<string> | Err<Error>> {
    const filename = `${crypto.randomUUID()}-${file.name.replaceAll(/\//g, '-')}`;

    const writeResponse = await trycatch(() =>
      this.deps.s3.write(filename, file, { bucket: this.options.s3Bucket }),
    );
    if (writeResponse.result === 'error') {
      return err(new Error('this.deps.s3.write', { cause: writeResponse.value }));
    }

    return ok(filename);
  }

  async deleteObject(objectId: string): Promise<Ok<void> | Err<Error>> {
    const objectExistsResult = await trycatch(() =>
      this.deps.s3.exists(objectId, { bucket: this.options.s3Bucket }),
    );
    if (objectExistsResult.result === 'error') {
      return err(new Error('this.deps.s3.exists', { cause: objectExistsResult.value }));
    }

    if (!objectExistsResult.value) {
      return err(new ErrorAttachmentNotFound('this.deps.s3.exists'));
    }

    const deleteResponse = await trycatch(() =>
      this.deps.s3.delete(objectId, { bucket: this.options.s3Bucket }),
    );
    if (deleteResponse.result === 'error') {
      return err(new Error('this.deps.s3.delete', { cause: deleteResponse.value }));
    }

    return ok<void>();
  }
}
