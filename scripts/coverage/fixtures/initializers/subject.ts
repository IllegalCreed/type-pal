export const calls = { value: 0 }
export class Example {
  static ceiling = 128
  running = false
  run(value: number) {
    calls.value++
    if (value !== 1) throw new Error('version rejected')
    return 'accepted'
  }
}
