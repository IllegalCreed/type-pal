import { type ItemData, palSoundAssetId, type SkillData } from '@type-pal/content'

export const PAL_RESOLVED_SKILL_IDS = new Set([314, 344, 392, 394])
export const PAL_RESOLVED_ITEM_USE_IDS = new Set([141])

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
  const output = input.map((skill) => structuredClone(overlays.get(skill.id) ?? skill))
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
