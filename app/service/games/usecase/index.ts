export class GamesUsecase {
  constructor() {}

  getRandomNumber(max: number, min = 0) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
