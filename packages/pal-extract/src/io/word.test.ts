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

  // K3 防回归(M5.6 hotfix:WORD.DAT 全表 565 条,非旧 510;系统/战斗 UI 标签计数)。
  it('全表 565 条 + 子表计数 + MAINMENU id7="新的故事"', () => {
    expect(words.flat.length).toBe(565)
    expect(words.flat[7]).toBe('新的故事') // MAINMENU_LABEL_NEWGAME(sdlpal 真值,非"新游戏")
    expect(words.system.length).toBe(36)
    expect(words.battleUi.length).toBe(19)
  })
})
