export class ErrorAttachmentNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorAttachmentNotFound';
  }
}
