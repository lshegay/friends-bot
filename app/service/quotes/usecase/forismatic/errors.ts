export class ErrorQuoteCategoryNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorQuoteCategoryNotFound';
  }
}