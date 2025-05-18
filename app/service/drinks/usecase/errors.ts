export class ErrorDrinkNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorDrinkNotFound';
  }
}

export class ErrorDrinkProgressNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorDrinkProgressNotFound';
  }
}
