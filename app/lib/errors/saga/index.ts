import { type Err, type Ok, type Result, createResult, err, ok } from '..';
import { SAGARollbackCompletedError, SAGARollbackUncompletedError } from './errors';

export type SAGATransactionSuccess<Value, Rollback> = {
  value: Value;
  rollbackValue: Rollback;
};

export type Cancel<T = Error> = Result<'cancel', T>;

export function cancel<T extends Error>(v?: T): Cancel<T> {
  return createResult('cancel', v);
}

export type SAGATransaction<Value, Previous, Rollback> = {
  action: (
    previousValue: Previous,
  ) => Promise<Ok<SAGATransactionSuccess<Value, Rollback> | undefined> | Cancel | Err<Error>>;
  rollback: (rollbackValue: Rollback) => Promise<Ok | Err<Error>>;
};

export class SAGA<Previous = never> {
  transactions: SAGATransaction<unknown, unknown, unknown>[] = [];

  addAction<Value = never, Rollback = never>(
    action: (
      previousValue: Previous,
    ) => Promise<Ok<SAGATransactionSuccess<Value, Rollback> | undefined> | Cancel | Err<Error>>,
    rollback: (rollbackValue: Rollback) => Promise<Ok | Err<Error>>,
  ) {
    this.transactions.push({
      action: action as SAGATransaction<unknown, unknown, unknown>['action'],
      rollback: rollback as SAGATransaction<unknown, unknown, unknown>['rollback'],
    });

    return this as unknown as SAGA<Value>;
  }

  async start<T>(
    initialValue: T,
  ): Promise<
    Ok<Previous> | Cancel<Error> | Err<SAGARollbackUncompletedError | SAGARollbackCompletedError>
  > {
    const rollbackValues = [];

    let v: unknown | never = initialValue;
    let e = undefined;
    let step = -1;

    for (let i = 0; i < this.transactions.length; i++) {
      const tx = this.transactions[i];

      const { result, value } = await tx.action(v);
      if (result === 'error') {
        step = i - 1;
        e = value;

        break;
      }

      if (result === 'cancel') {
        return cancel(value);
      }

      v = value?.value;
      rollbackValues.push(value?.rollbackValue);
    }

    if (e !== undefined) {
      for (let i = step; i >= 0; i--) {
        const rollbackTx = this.transactions[i];

        const { result, value } = await rollbackTx.rollback(rollbackValues[i]);
        if (result === 'error') {
          return err(
            new SAGARollbackUncompletedError('rollbackTx.rollback', {
              cause: value,
              context: { step, txError: e },
            }),
          );
        }
      }

      return err(
        new SAGARollbackCompletedError('SAGA Rollback Completed', {
          context: { step, txError: e },
        }),
      );
    }

    return ok(v as Previous);
  }
}
