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

  // L28:sdlpal PAL_InitText 在 GBK→宽字符转换后剥每个词条结尾的标记字符 '1'(text.c:785-786)——
  //   BIG5→GBK 不彻底简体化遗留。3 个仙术名玩家在施法/练成屏可见。
  it('L28:剥词条结尾标记「1」(风雪冰天/弦月斩/御剑伏魔 等 8 条)', () => {
    expect(words.spells[28]).toBe('风雪冰天') // 非「风雪冰天1」
    expect(words.spells[43]).toBe('弦月斩')
    expect(words.spells[66]).toBe('御剑伏魔')
    expect(words.enemies[81]).toBe('女飞贼')
    expect(words.enemies[99]).toBe('石长老')
    // 不误剥正常内容:正常仙术名仍完整
    expect(words.spells.some((s) => s.endsWith('1'))).toBe(false)
  })

  // K3 content-pin(byte-truth 内容回归):counts 已上面钉,此处钉 system(36)+battleUi(19)
  //   两类**全部内容**(GBK 解码值),防 parser / 编码 / 偏移漂移导致菜单/战斗 UI 文案变味。
  it('content-pin:system 全 36 条内容(GBK byte-truth)', () => {
    expect(words.system).toEqual([
      '',
      '',
      'Exp',
      '状态',
      '仙术',
      '物品',
      '系统',
      '新的故事',
      '旧的回忆',
      '打败敌人得',
      '文钱',
      '储存进度',
      '读取进度',
      '音乐',
      '音效',
      '结束游戏',
      '储存完毕',
      '关',
      '开',
      '否',
      '是',
      '金钱',
      '装备',
      '使用',
      '投掷',
      '售价',
      '封',
      '定',
      '眠',
      '乱',
      '获得经验值',
      '逃跑失败',
      '提升',
      '练成',
      '获得',
      '现有',
    ])
  })

  it('content-pin:battleUi 全 19 条内容(GBK byte-truth)', () => {
    expect(words.battleUi).toEqual([
      '炼出',
      '进度一',
      '进度二',
      '进度三',
      '进度四',
      '进度五',
      '修行',
      '体力',
      '真气',
      '武术',
      '灵力',
      '防御',
      '身法',
      '吉运',
      '围攻',
      '道具',
      '防御',
      '逃跑',
      '状态',
    ])
  })

  // 游戏代码 getWord(id) 实际引用的 label —— 内容漂移 = 玩家可见错字。逐 id 钉死,
  //   注明引用点(grep getWord 字面 + 菜单 def 数组真 WORD id)。
  it('content-pin:代码引用的 flat[id] 菜单/UI 文案', () => {
    // OpeningMenu(opening-menu.ts:35-36,ui.h:48-49 MAINMENU_LABEL_NEWGAME/LOADGAME)
    expect(words.flat[7]).toBe('新的故事')
    expect(words.flat[8]).toBe('旧的回忆')
    // 主菜单 GAMEMENU(in-game-menu.ts:29-32,ui.h:61-64)
    expect(words.flat[3]).toBe('状态')
    expect(words.flat[4]).toBe('仙术')
    expect(words.flat[5]).toBe('物品')
    expect(words.flat[6]).toBe('系统')
    // 系统子菜单 SYSMENU(in-game-menu.ts:42-46,ui.h:66-70)
    expect(words.flat[11]).toBe('储存进度')
    expect(words.flat[12]).toBe('读取进度')
    expect(words.flat[13]).toBe('音乐')
    expect(words.flat[14]).toBe('音效')
    expect(words.flat[15]).toBe('结束游戏')
    // CASH 金钱(draw-menu.ts:361,ui.h:56)/ 物品动作(inventory-action-menu.ts:37-38,ui.h:80-81)
    expect(words.flat[21]).toBe('金钱')
    expect(words.flat[22]).toBe('装备')
    expect(words.flat[23]).toBe('使用')
    // 战斗结算升级(draw-battle-settlement.ts:118)/ L1 炼丹物品框(event-system 0x34,script.c:1481)
    expect(words.flat[32]).toBe('提升')
    expect(words.flat[42]).toBe('炼出')
  })
})
