import type { Telegram } from 'telegraf';
import type { AttachmentsExternalRepository } from '~lib/attachments-getter/repository';
import { type Ok, type Err, trycatch, err, ok } from '~lib/errors';

export type Dependencies = {
  telegram: Telegram;
};

export class AttachmentsTelegrafRepository implements AttachmentsExternalRepository {
  constructor(private readonly deps: Dependencies) {}

  async downloadFile(externalId: string): Promise<Ok<File> | Err<Error>> {
    const result = await trycatch(() => this.deps.telegram.getFileLink(externalId));
    if (result.result === 'error') {
      // TODO: not found file

      return err(new Error('this.deps.telegram.getFileLink', { cause: result.value }));
    }

    const fileUrl = result.value;

    const fileDataResult = await trycatch(() => this.deps.telegram.getFile(externalId));
    if (fileDataResult.result === 'error') {
      return err(new Error('this.deps.telegram.getFile', { cause: fileDataResult.value }));
    }

    const fileData = fileDataResult.value;

    const blobResult = await trycatch(async () => {
      const response = await fetch(fileUrl);

      return response.blob();
    });
    if (blobResult.result === 'error') {
      return err(new Error('fetch: blob', { cause: blobResult.value }));
    }

    const blob = blobResult.value;

    const file = new File([blob], fileData.file_path || fileData.file_id);

    return ok(file);
  }
}
