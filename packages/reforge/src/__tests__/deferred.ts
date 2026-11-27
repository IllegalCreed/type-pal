export function deferred<T = void>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** Let ready Promise continuations finish without advancing the gameplay clock. */
export const nextTestTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
