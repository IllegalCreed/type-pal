import type { AssetRole } from '@type-pal/content'
import type { Sequencer, WorkletSynthesizer } from 'spessasynth_lib'
import spessaPackage from 'spessasynth_lib/package.json' with { type: 'json' }

export interface SpessaRoleReader {
  readRoleBytes(role: AssetRole): Promise<ArrayBuffer>
}

/** The initializer owns the worklet until it hands the ready synth to the caller. */
export async function initializeBrowserSpessaSynth(
  context: AudioContext,
  resolver: SpessaRoleReader,
  destination: AudioNode,
  soundBankName: string,
  signal: AbortSignal,
): Promise<{ synth: WorkletSynthesizer; Sequencer: typeof Sequencer }> {
  signal.throwIfAborted()
  const worklet = context.audioWorklet
  if (!worklet) {
    const secure = typeof window !== 'undefined' ? window.isSecureContext : false
    throw new Error(`AudioWorklet 不可用（secure context=${secure}），请使用 HTTPS 或 localhost。`)
  }

  let synth: WorkletSynthesizer | undefined
  let onAbort: (() => void) | undefined
  const initialize = async () => {
    await worklet.addModule(`/spessasynth_processor.min.js?v=${spessaPackage.version}`)
    signal.throwIfAborted()
    const { WorkletSynthesizer, Sequencer } = await import('spessasynth_lib')
    signal.throwIfAborted()

    const candidate = new WorkletSynthesizer(context)
    synth = candidate
    candidate.connect(destination)
    const soundfont = await resolver.readRoleBytes('audio.midiSoundfont')
    signal.throwIfAborted()
    const magic = String.fromCharCode(...new Uint8Array(soundfont.slice(0, 4)))
    if (magic !== 'RIFF')
      throw new Error('MIDI 音色库不是有效 RIFF 文件，请检查 audio.midiSoundfont。')
    await candidate.soundBankManager.addSoundBank(soundfont, soundBankName)
    signal.throwIfAborted()
    await candidate.isReady
    signal.throwIfAborted()
    const reverb = 91 as Parameters<typeof candidate.controllerChange>[1]
    for (let channel = 0; channel < 16; channel++) {
      candidate.controllerChange(channel, reverb, 0)
      candidate.midiChannels[channel]?.lockController(reverb, true)
    }
    return { synth: candidate, Sequencer }
  }

  try {
    const cancellation = new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason)
      signal.addEventListener('abort', onAbort, { once: true })
    })
    // addModule, soundfont reads and the vendor's ready promise may outlive the audio owner.
    const backend = await Promise.race([initialize(), cancellation])
    signal.throwIfAborted()
    return backend
  } catch (cause) {
    synth?.destroy()
    throw cause
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort)
  }
}
