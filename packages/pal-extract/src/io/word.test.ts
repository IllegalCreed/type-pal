import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseWordDat } from './word.js'

const WORD_PATH = resolve(__dirname, '../../../../data/raw/WORD.DAT')

describe('parseWordDat', () => {
  const buf = new Uint8Array(readFileSync(WORD_PATH))
  const words = parseWordDat(buf)

  it('五类都不为空', () => {
    expect(words.items.length).toBeGreaterThan(0)
    expect(words.spells.length).toBeGreaterThan(0)
    expect(words.persons.length).toBeGreaterThan(0)
    expect(words.enemies.length).toBeGreaterThan(0)
    expect(words.scenes.length).toBeGreaterThan(0)
  })

  it('包含已知人物名"李逍遥"', () => {
    expect(words.persons).toContain('李逍遥')
  })

  it('包含已知物品名(药 / 葫芦 / 丸 / 针 / 剑 任一)', () => {
    expect(words.items.some((s) => /药|葫芦|丸|针|剑/.test(s))).toBe(true)
  })
})
