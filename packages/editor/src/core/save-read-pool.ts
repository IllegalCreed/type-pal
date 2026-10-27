/** Bounded fresh reads only. Never used for author IO, cursor advancement, or durable receipts. */
export async function readSaveFiles<T>(
  inputs: readonly T[],
  read: (input: T) => Promise<void>,
): Promise<void> {
  let next = 0
  let failure: { error: unknown } | undefined
  const worker = async () => {
    while (!failure && next < inputs.length) {
      const input = inputs[next++]!
      try {
        await read(input)
      } catch (error) {
        failure ??= { error }
      }
    }
  }
  // Catch inside each worker and drain every already-issued read before leaving the caller's
  // lock/scope. Promise.all's early rejection would leave background tasks crossing that boundary.
  await Promise.all(Array.from({ length: Math.min(8, inputs.length) }, worker))
  if (failure) throw failure.error
}
