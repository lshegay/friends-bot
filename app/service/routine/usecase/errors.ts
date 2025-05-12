export class ErrorRoutineNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorRoutineNotFound';
  }
}

export class ErrorRoutineTaskNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorRoutineTaskNotFound';
  }
}

export class ErrorRoutineTaskAlreadyCompleted extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorRoutineTaskAlreadyCompleted';
  }
}