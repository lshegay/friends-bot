export class ErrorChatNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorChatNotFound';
  }
}
