export class ErrorProfileNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorProfileNotFound';
  }
}
