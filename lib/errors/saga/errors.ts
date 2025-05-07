export type SAGARollbackUncompletedErrorContext = {
  txError: Error;
  step: number;
};

export class SAGARollbackUncompletedError extends Error {
  context: SAGARollbackUncompletedErrorContext;

  constructor(
    message: string,
    options: ErrorOptions & { context: SAGARollbackUncompletedErrorContext },
  ) {
    super(message, options);

    this.context = options.context;
  }
}

export type SAGARollbackCompletedErrorContext = {
  txError: Error;
  step: number;
};

export class SAGARollbackCompletedError extends Error {
  context: SAGARollbackCompletedErrorContext;

  constructor(
    message: string,
    options: ErrorOptions & { context: SAGARollbackCompletedErrorContext },
  ) {
    super(`${message} (err: ${options.context.txError}, step: ${options.context.step})`, options);

    this.context = options.context;
  }
}
