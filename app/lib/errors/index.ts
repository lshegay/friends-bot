export type Result<T extends string, V> = {
  result: T;
  value: V;
};

export type Err<E extends Error> = {
  result: 'error';
  value: E;
};

export type Ok<T = never> = {
  result: 'ok';
  value: T;
};

export function createResult<T extends string, V>(result: T, value?: V): Result<T, V> {
  if (typeof value === 'undefined') {
    return { result } as Result<T, never>;
  }

  return { result, value };
}

export function err<E extends Error>(e: E): Err<E> {
  return createResult('error', e);
}

export function ok<T = never>(v?: T): Ok<T> {
  return createResult('ok', v);
}

export function trycatch<T, E extends Error>(func: () => T | Promise<T>) {
  try {
    const result = func();

    if (result instanceof Promise) {
      return new Promise<Result<'ok', T> | Err<E>>((resolve) => {
        result
          .then((r) => {
            resolve(createResult('ok', r));
          })
          .catch((error) => {
            resolve(err(error));
          });
      });
    }

    return createResult('ok', result);
  } catch (error) {
    return err(error as E);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Errors constructors can have anything as args and return not exactly Error type
export function errIs<T extends new (...args: any[]) => any>(
  err: Error,
  c: T,
): null | InstanceType<T> {
  if (typeof c !== 'function') return null;

  let e = err;

  while (true) {
    if (e instanceof c) return e as InstanceType<T>;

    if (!e.cause) return null;
    if (e.cause instanceof Error) {
      e = e.cause;
    } else {
      return null;
    }
  }
}
