export type Attachment = {
  id: string;

  /**
   * Telegram file_id является неизменяемым идентификатором файла, который можно использовать для получения файла.
   * Однако есть шанс, что он может быть изменен, поэтому
   * придется хранить оригинал файла в хранилище (например, S3).
   * 
   * Его можно будет вытащить
   */
  externalId: string;

  /**
   * Идентификатор оригинального файла для его получения из хранилища.
   */
  objectId: string;

  filename: string;
  hash: string;

  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
