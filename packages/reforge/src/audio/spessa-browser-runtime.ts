import type { AssetRole } from '@type-pal/content'
import type { WorkletSynthesizer } from 'spessasynth_lib'

export interface SpessaRoleReader {
  readRoleBytes(role: AssetRole): Promise<ArrayBuffer>
}

/**
 * 游戏 BGM 与作者试听共用的浏览器 MIDI 合成初始化。
 * 调用方各自拥有 sequencer 状态机，但 worklet、音色库与原版干声守卫只能有一份真值。
 */
export async function initializeBrowserSpessaSynth(
  context: AudioContext,
  resolver: SpessaRoleReader,
  destination: AudioNode,
  soundBankName: string,
): Promise<WorkletSynthesizer> {
  if (!context.audioWorklet) {
    const secure = typeof window !== 'undefined' ? window.isSecureContext : false
    throw new Error(
      `AudioWorklet 不可用（secure context=${secure}），请使用 HTTPS 或 localhost。`,
    )
  }
  await context.audioWorklet.addModule('/spessasynth_processor.min.js')
  const { WorkletSynthesizer } = await import('spessasynth_lib')
  const synth = new WorkletSynthesizer(context)
  try {
    synth.connect(destination)
    const soundfont = await resolver.readRoleBytes('audio.midiSoundfont')
    const magic = String.fromCharCode(...new Uint8Array(soundfont.slice(0, 4)))
    if (magic !== 'RIFF')
      throw new Error('MIDI 音色库不是有效 RIFF 文件，请检查 audio.midiSoundfont。')
    await synth.soundBankManager.addSoundBank(soundfont, soundBankName)
    await synth.isReady
    const reverb = 91 as Parameters<typeof synth.controllerChange>[1]
    for (let channel = 0; channel < 16; channel++) {
      synth.controllerChange(channel, reverb, 0)
      synth.midiChannels[channel]?.lockController(reverb, true)
    }
    return synth
  } catch (cause) {
    synth.destroy()
    throw cause
  }
}
