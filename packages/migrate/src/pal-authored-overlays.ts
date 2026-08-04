import { type ItemData, palSoundAssetId, type SkillData } from '@type-pal/content'

export const PAL_RESOLVED_SKILL_IDS = new Set([314, 344, 392, 394])
export const PAL_RESOLVED_ITEM_USE_IDS = new Set([141])

/**
 * R13-6B 的源语义补录。
 *
 * 这些不是运行时特例：它们是从 PAL events/all.json 的分支脚本和 MAGIC 表
 * 重新核对后，写回 canonical skill data 的结构化语义。保留在迁移器而不是
 * projects/pal，避免下一次 bake 把修复覆盖掉。
 */
type PalSkillExecutionOverlay = {
  cost?: SkillData['cost']
  animation?: Partial<SkillData['animation']>
  execution?: SkillData['execution']
  lifetimeLimit?: SkillData['lifetimeLimit']
}

const PAL_SKILL_EXECUTION_OVERLAYS: Readonly<Record<string, PalSkillExecutionOverlay>> = {
  // 0x35 ShakeScreen：施法特效开始时并发震屏，末尾 shake 仍由 MAGIC 表保留。
  '330': { animation: { preShake: { frames: 20, level: 4 } } },
  '334': { animation: { preShake: { frames: 20, level: 4 } } },
  '342': { animation: { preShake: { frames: 14, level: 4 } } },
  '357': { animation: { preShake: { frames: 24, level: 4 } } },
  '378': { animation: { preShake: { frames: 14, level: 4 } } },
  '380': { animation: { preShake: { frames: 14, level: 4 } } },
  '385': { animation: { preShake: { frames: 14, level: 4 } } },

  // 敌方分支的 303/304/305 不共享玩家分支：概率、状态回合和处决形态都来自
  // events/all.json 的 0x68 敌方分支，不能复用玩家分支的 MAGIC 表结果。
  '303': {
    execution: {
      enemy: {
        effects: [
          { kind: 'gate', chance: 70 },
          { kind: 'applyStatus', status: 'sleep', turns: 3 },
          { kind: 'resourceDelta', resource: 'hp', delta: -1 },
        ],
      },
    },
  },
  '304': {
    execution: {
      enemy: {
        effects: [{ kind: 'gate', chance: 30 }, { kind: 'instantKill' }],
      },
    },
  },
  '305': {
    execution: {
      enemy: {
        effects: [
          { kind: 'gate', chance: 50 },
          { kind: 'applyStatus', status: 'confused', turns: 3 },
          { kind: 'resourceDelta', resource: 'hp', delta: -1 },
        ],
      },
    },
  },

  // 三条蛊术敌方 0x68 分支(原始脚本解码 2026-08-05)。毒模型已结构化到
  // PoisonDef counters/lethalWith,且原版实证「巫术下毒不带致死/相克检查」:
  // 敌方施法 = 普通 0x29 下毒(lethalWith 仅投掷、counters 仅 use-on-self 触发)。
  // - 352 三尸咒:scriptOnSuccess@43052 `0x68 → L_39419`(三尸蛊道具 use 链 555)。
  // - 372 万蛊蚀天:scriptOnSuccess@43044 `0x68 → L_43047` = `0x29 [1,555]` 全队 555。
  // - 373 毒吞天下:scriptOnSuccess@43036 `0x68 → L_43039` = `0x29 [1,560]` 全队 560。
  '352': {
    execution: {
      enemy: {
        effects: [{ kind: 'applyPoison', poisonId: '555' }],
      },
    },
  },
  '372': {
    execution: {
      enemy: {
        effects: [{ kind: 'applyPoison', poisonId: '555' }],
      },
    },
  },
  '373': {
    execution: {
      enemy: {
        effects: [{ kind: 'applyPoison', poisonId: '560' }],
      },
    },
  },

  // 酒神：原版 scriptOnUse 先扣 1 个酒(0x20 RemoveItem)，再按剩余真气 × 8 直接扣敌方
  // HP(0x57 set magic damage by MP)并清空真气。一生只能使用 9 次：第 9 次成功后移除
  // 技能并提示“酒神咒使用次数已用尽”（原版脚本 0x56 RemoveMagic + dlg.13366）。
  // summon 只保留在玩家分支的 effects，避免再叠加占位 damage=3。
  '370': {
    cost: { mp: 1, items: [{ itemId: '86', amount: 1 }] },
    lifetimeLimit: 9,
    execution: {
      player: {
        prepare: [
          { kind: 'remainingResourceDamage', resource: 'mp', multiplier: 8, consume: 'all' },
        ],
      },
    },
  },
}

const SPECIAL_SKILLS: SkillData[] = [
  {
    id: '314',
    name: '风卷残云',
    desc: '风系高级法术，攻击敌方全体。',
    cost: { mp: 42 },
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects: [{ kind: 'damage', power: 280, elemental: 1 }],
    animation: {
      effectSprite: 44,
      placement: 'attackField',
      xOffset: 0,
      yOffset: 0,
      speed: 0,
      fireDelay: 0,
      effectTimes: 2,
      shake: 0,
      wave: 0,
      sound: palSoundAssetId(103),
    },
  },
  {
    id: '344',
    name: '铜钱镖',
    desc: '将金钱当做暗器，攻击敌方单人，一次使用五百文钱。',
    cost: { mp: 1, money: 500 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 198, elemental: 0 }],
    animation: {
      effectSprite: 31,
      placement: 'normal',
      xOffset: 32,
      yOffset: 20,
      speed: 0,
      fireDelay: 0,
      effectTimes: 0,
      shake: 0,
      wave: 0,
      sound: palSoundAssetId(347),
    },
  },
  {
    id: '392',
    name: '金蝉脱壳',
    desc: '战斗中逃跑。',
    cost: { mp: 33 },
    usableOutsideBattle: false,
    target: 'allAllies',
    effects: [{ kind: 'fleeBattle' }],
    animation: {
      effectSprite: 65535,
      placement: 'normal',
      xOffset: 0,
      yOffset: 0,
      speed: 0,
      fireDelay: 0,
      effectTimes: 0,
      shake: 0,
      wave: 0,
    },
  },
  {
    id: '394',
    name: '乾坤一掷',
    desc: '使用金钱镖攻击敌方全体，会耗损大量金钱。',
    cost: { mp: 1 },
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects: [{ kind: 'moneyDamage', maxSpend: 5000, num: 2, den: 5, elemental: 0 }],
    animation: {
      effectSprite: 31,
      placement: 'attackAll',
      xOffset: 32,
      yOffset: 20,
      speed: 0,
      fireDelay: 0,
      effectTimes: 0,
      shake: 0,
      wave: 0,
      sound: palSoundAssetId(347),
    },
  },
]

export interface PalSkillOverlayOptions {
  /** R13-6B successor 专属；历史/current-6A producer 必须保持冻结技能输出。 */
  r13SixBExecution?: boolean
}

/** 已审计动态公式的数据化结果；保持原迁移顺序，缺项稳定追加。 */
export function applyPalSkillOverlays(
  input: readonly SkillData[],
  options: PalSkillOverlayOptions = {},
): SkillData[] {
  const overlays = new Map(SPECIAL_SKILLS.map((skill) => [skill.id, skill]))
  const output = input.map((skill) => {
    const special = overlays.get(skill.id)
    const executionOverlay = options.r13SixBExecution
      ? PAL_SKILL_EXECUTION_OVERLAYS[skill.id]
      : undefined
    if (special) return structuredClone(special)
    if (!executionOverlay) return structuredClone(skill)
    const merged: SkillData = {
      ...structuredClone(skill),
      ...(executionOverlay.cost ? { cost: structuredClone(executionOverlay.cost) } : {}),
      ...(executionOverlay.animation
        ? {
            animation: {
              ...structuredClone(skill.animation),
              ...structuredClone(executionOverlay.animation),
            },
          }
        : {}),
      ...(executionOverlay.lifetimeLimit !== undefined
        ? { lifetimeLimit: executionOverlay.lifetimeLimit }
        : {}),
      ...(executionOverlay.execution
        ? {
            execution: {
              ...structuredClone(skill.execution),
              ...structuredClone(executionOverlay.execution),
            },
          }
        : {}),
    }
    if (skill.id === '370' && merged.execution?.player) {
      // 保留迁移器从 MAGIC 表解析出的召唤速度/音效/染色，只剔除占位 damage=3。
      merged.execution.player.effects = structuredClone(
        skill.effects.filter((effect) => effect.kind === 'summon'),
      )
    }
    return merged
  })
  const present = new Set(output.map((skill) => skill.id))
  for (const skill of SPECIAL_SKILLS) {
    if (!present.has(skill.id)) output.push(structuredClone(skill))
  }
  return output
}

/** 隐蛊原脚本是战斗全队隐形 3 回合，目标 schema 已有 hideParty 精确表达。 */
export function applyPalItemOverlays(input: readonly ItemData[]): ItemData[] {
  return input.map((item) =>
    item.id === '141'
      ? {
          ...structuredClone(item),
          use: {
            target: 'allAllies',
            consuming: true,
            battleOnly: true,
            effects: [{ kind: 'hideParty', turns: 3 }],
          },
        }
      : structuredClone(item),
  )
}
