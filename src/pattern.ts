type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const ok = <T, E>(value: T): Result<T, E> => ({ ok: true, value });
const err = <T, E>(error: E): Result<T, E> => ({ ok: false, error });

const match = <T, E>(
  value: T,
  patterns: Array<{ test: (value: T) => boolean; handler: (value: T) => Result<T, E> }>
): Result<T, E> => {
  for (const { test, handler } of patterns) {
    if (test(value)) {
      return handler(value);
    }
  }
  return err(new Error("No pattern matched") as E);
};

export { Result, ok, err, match };
