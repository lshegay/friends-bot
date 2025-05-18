export async function hashFile(file: File): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');
  const reader = file.stream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    hasher.update(value);
  }

  return hasher.digest('hex');
}
