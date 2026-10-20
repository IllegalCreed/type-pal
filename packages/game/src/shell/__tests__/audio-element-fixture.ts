/** OGG后端的媒体IO替身；仅记录资源释放与音量，不模拟解码、时间或听感。 */
export function createAudioElementFixture() {
  const created: AudioElement[] = []

  class AudioElement {
    loop = false
    volume = 1
    paused = false
    loaded = false

    constructor(public src: string) {
      created.push(this)
    }

    play(): Promise<void> {
      return Promise.resolve()
    }

    pause(): void {
      this.paused = true
    }

    load(): void {
      this.loaded = true
    }

    removeAttribute(name: string): void {
      if (name === 'src') this.src = ''
    }
  }

  return { Audio: AudioElement, created }
}
