/**
 * 旧作者工程的单向结构升级器。
 *
 * 只做 `dialog.line -> dialog.cue.rows` 与 `Dialogue.lines -> Dialogue.cues` 的无损字段平移，
 * 不解释 `$NN` 等原版控制码。
 * 控制码解码只属于 migrate；升级后的内存与保存产物只保留 canonical cue。
 */

import { legacyPalPortraitAssetId } from './asset.js'

export interface DialogueUpgradeResult<T> {
  value: T
  upgraded: number
}

interface LegacyDialogueLine {
  text: string
  speaker?: string
  speed?: number
  autoAdvance?: number
  slot?: 'top' | 'bottom' | 'narration' | 'center'
  portrait?: { icon: number; side: 'left' | 'right' }
  cursorFrame?: 0 | 1 | 2
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cueFromLegacyLine(line: LegacyDialogueLine): Record<string, unknown> {
  const portrait = line.portrait
  const portraitAsset = portrait === undefined ? undefined : legacyPalPortraitAssetId(portrait.icon)
  return {
    ...(line.speaker !== undefined ? { speaker: line.speaker } : {}),
    rows: [{ text: line.text, ...(line.speed !== undefined ? { speed: line.speed } : {}) }],
    ...(line.autoAdvance !== undefined ? { autoAdvance: line.autoAdvance } : {}),
    ...(line.slot !== undefined ? { slot: line.slot } : {}),
    ...(portraitAsset !== undefined && portrait !== undefined
      ? { portrait: { asset: portraitAsset, side: portrait.side } }
      : {}),
    ...(line.cursorFrame !== undefined ? { cursorFrame: line.cursorFrame } : {}),
  }
}

function normalizeLegacyCuePortrait(cueValue: unknown): {
  cue: Record<string, unknown>
  changed: boolean
} {
  if (!isRecord(cueValue)) throw new Error('dialog.cue 期望对象')
  const cue = Object.fromEntries(Object.entries(cueValue))
  if (cue.portrait === undefined) return { cue, changed: false }
  if (!isRecord(cue.portrait)) throw new Error('dialog.cue.portrait 期望对象')
  const portrait = cue.portrait
  if (!('icon' in portrait)) return { cue, changed: false }
  if ('asset' in portrait) throw new Error('dialog.cue.portrait 同时含 icon 与 asset')
  if (typeof portrait.icon !== 'number') throw new Error('dialog.cue.portrait.icon 期望数字')
  const asset = legacyPalPortraitAssetId(portrait.icon)
  if (asset) cue.portrait = { asset, side: portrait.side }
  else delete cue.portrait
  return { cue, changed: true }
}

export function upgradeLegacyDialogues<T>(input: T): DialogueUpgradeResult<T> {
  let upgraded = 0

  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit)
    if (!isRecord(value)) return value

    if (value.kind === 'dialog' && value.line !== undefined) {
      if (value.cue !== undefined)
        throw new Error('dialog 同时含 line 与 cue，无法确定 canonical 内容')
      if (!isRecord(value.line) || typeof value.line.text !== 'string')
        throw new Error('旧 dialog.line 缺 text，无法升级')
      const line = value.line as unknown as LegacyDialogueLine
      const { line: _line, ...command } = value
      upgraded++
      return {
        ...Object.fromEntries(Object.entries(command).map(([key, child]) => [key, visit(child)])),
        cue: cueFromLegacyLine(line),
      }
    }

    if (value.kind === 'dialog' && value.cue !== undefined) {
      const normalized = normalizeLegacyCuePortrait(value.cue)
      if (normalized.changed) upgraded++
      return {
        ...Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => key !== 'cue')
            .map(([key, child]) => [key, visit(child)]),
        ),
        cue: visit(normalized.cue),
      }
    }

    if (typeof value.id === 'string' && value.lines !== undefined) {
      if (value.cues !== undefined)
        throw new Error('Dialogue 同时含 lines 与 cues，无法确定 canonical 内容')
      if (
        !Array.isArray(value.lines) ||
        !value.lines.every((line) => isRecord(line) && typeof line.text === 'string')
      )
        throw new Error('旧 Dialogue.lines 含非法 line，无法升级')
      const { lines, ...dialogue } = value
      upgraded++
      return {
        ...Object.fromEntries(Object.entries(dialogue).map(([key, child]) => [key, visit(child)])),
        cues: lines.map((line) => cueFromLegacyLine(line as unknown as LegacyDialogueLine)),
      }
    }
    if (typeof value.id === 'string' && Array.isArray(value.cues)) {
      let changed = false
      const cues = value.cues.map((cue) => {
        const normalized = normalizeLegacyCuePortrait(cue)
        changed ||= normalized.changed
        return visit(normalized.cue)
      })
      if (changed) upgraded++
      return {
        ...Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => key !== 'cues')
            .map(([key, child]) => [key, visit(child)]),
        ),
        cues,
      }
    }

    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
  }

  return { value: visit(input) as T, upgraded }
}
