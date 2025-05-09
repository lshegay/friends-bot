import { err, ok, trycatch, type Err, type Ok } from "~lib/errors";

// path / telegram file_id
const cache = new Map<string, string>();

export async function getImage(path: string): Promise<Ok<Buffer | string> | Err<Error>> {
  if (cache.has(path)) {
    return ok(cache.get(path) as string);
  }

  const file = Bun.file(path);
  const bufferResult = await trycatch(() => file.arrayBuffer());
  if (bufferResult.result === 'error') {
    return err(new Error(`Failed to read file: ${path}`, { cause: bufferResult.value }));
  }

  return ok(Buffer.from(bufferResult.value));
}