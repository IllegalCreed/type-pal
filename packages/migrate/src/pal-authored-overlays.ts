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
}

const PAL_SKILL_EXECUTION_OVERLAYS: Readonly<Record<string, PalSkillExecutionOverlay>> = {
  // 0x35 ShakeScreen：施法特效开始时并发震屏，末尾 shake 仍由 MAGIC 表保留。
  '330': { animation: { preShake: { frames: 20, level: 3 } } },
  '334': { animation: { preShake: { frames: 20, level: 3 } } },
  '342': { animation: { preShake: { frames: 14, level: 3 } } },
  '357': { animation: { preShake: { frames: 24, level: 3 } } },
  '378': { animation: { preShake: { frames: 14, level: 3 } } },
  '380': { animation: { preShake: { frames: 14, level: 3 } } },
  '385': { animation: { preShake: { frames: 14, level: 3 } } },

  // 敌方分支的 303/304/305 不共享玩家分支：源脚本对敌方是直接改 HP/即死。
  '303': {
    execution: {
      enemy: {
        effects: [
          { kind: 'gate', chance: 60 },
          { kind: 'resourceDelta', resource: 'hp', delta: -1 },
        ],
      },
    },
  },
  '304': {
    execution: {
      enemy: {
        effects: [{ kind: 'gate', chance: 33 }, { kind: 'instantKill' }],
      },
    },
  },
  '305': {
    execution: {
      enemy: {
        effects: [
          { kind: 'gate', chance: 44 },
          { kind: 'resourceDelta', resource: 'hp', delta: -1 },
        ],
      },
    },
  },

  // 酒神：原版 scriptOnUse 先扣 1 个酒，再按剩余酒量 × 8 直接扣敌方 HP。
  // summon 只保留在玩家分支的 effects，避免再叠加占位 damage=3。
  '370': {
    cost: { mp: 1, items: [{ itemId: '86', amount: 1 }] },
    execution: {
      player: {
        prepare: [{ kind: 'remainingResourceDamage', resource: 'mp', multiplier: 8, consume: 'all' }],
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

/** 已审计动态公式的数据化结果；保持原迁移顺序，缺项稳定追加。 */
export function applyPalSkillOverlays(input: readonly SkillData[]): SkillData[] {
  const overlays = new Map(SPECIAL_SKILLS.map((skill) => [skill.id, skill]))
  const output = input.map((skill) => {
    const special = overlays.get(skill.id)
    const executionOverlay = PAL_SKILL_EXECUTION_OVERLAYS[skill.id]
    if (special) return structuredClone(special)
    if (!executionOverlay) return structuredClone(skill)
    const merged: SkillData = {
      ...structuredClone(skill),
      ...(executionOverlay.cost ? { cost: structuredClone(executionOverlay.cost) } : {}),
      ...(executionOverlay.animation
        ? { animation: { ...structuredClone(skill.animation), ...structuredClone(executionOverlay.animation) } }
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
