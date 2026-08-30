import type {
  BattleSpriteDef,
  BattleSpriteProfile,
  BattleSpriteProfileKind,
  PlayerFighterFrames,
} from '@type-pal/content'
import type { SemanticFrameGroup } from './SpriteFrameWorkbench.js'

export const BATTLE_SPRITE_PROFILE_LABEL: Record<BattleSpriteProfileKind, string> = {
  'player-fighter': '玩家战斗',
  enemy: '敌人',
  summon: '召唤现身',
}

interface PlayerActionSpec {
  key: string
  label: string
  slots: readonly { key: keyof PlayerFighterFrames; label: string; optional?: boolean }[]
  returnToIdle?: boolean
  frameMs: number
  timing?: string
}

export interface BattleSpriteNamedAction {
  key: string
  label: string
  frames: number[]
  frameMs: number
  timing?: string
}

export const PLAYER_BATTLE_ACTIONS: readonly PlayerActionSpec[] = [
  { key: 'idle', label: '待机', slots: [{ key: 'idle', label: '姿势' }], frameMs: 200 },
  {
    key: 'attack',
    label: '普通攻击',
    slots: [
      { key: 'attackWindup', label: '蓄力' },
      { key: 'attackRush', label: '冲刺' },
      { key: 'attackStrike', label: '命中' },
    ],
    returnToIdle: true,
    frameMs: 140,
    timing: '姿势序列；实战还包含冲刺、位移与命中特效',
  },
  {
    key: 'cast',
    label: '施法',
    slots: [
      { key: 'preMagic', label: '施法前' },
      { key: 'magic', label: '释放' },
    ],
    returnToIdle: true,
    frameMs: 180,
    timing: '姿势序列；实战节奏由具体技能与特效决定',
  },
  { key: 'defend', label: '防御', slots: [{ key: 'defend', label: '姿势' }], frameMs: 200 },
  {
    key: 'hurt',
    label: '受伤',
    slots: [{ key: 'hurt', label: '姿势' }],
    returnToIdle: true,
    frameMs: 160,
  },
  { key: 'dying', label: '濒死', slots: [{ key: 'dying', label: '姿势' }], frameMs: 200 },
  { key: 'dead', label: '死亡', slots: [{ key: 'dead', label: '姿势' }], frameMs: 200 },
  {
    key: 'steal',
    label: '偷窃',
    slots: [{ key: 'steal', label: '偷窃动作', optional: true }],
    returnToIdle: true,
    frameMs: 160,
    timing: '专属姿势；实战还包含冲刺与敌方闪白',
  },
]

export function battleSpriteActionsForProfile(
  profile: BattleSpriteProfile | undefined,
  actualFrameCount: number,
): BattleSpriteNamedAction[] {
  const actions: BattleSpriteNamedAction[] = []
  if (profile?.kind === 'player-fighter') {
    for (const spec of PLAYER_BATTLE_ACTIONS) {
      const slotFrames = spec.slots
        .map((slot) => profile.frames[slot.key])
        .filter((frame): frame is number => frame !== undefined)
      actions.push({
        key: spec.key,
        label: spec.label,
        frames:
          slotFrames.length && spec.returnToIdle
            ? [...slotFrames, profile.frames.idle]
            : slotFrames,
        frameMs: spec.frameMs,
        timing: spec.timing,
      })
    }
  } else if (profile?.kind === 'enemy') {
    for (const [label, section] of [
      ['待机', profile.idle],
      ['施法', profile.magic],
      ['攻击', profile.attack],
    ] as const) {
      const frames =
        section.count === 0
          ? []
          : label !== '待机' && profile.actTicksPerFrame === 0
            ? [section.start + section.count - 1]
            : label === '攻击'
              ? Array.from({ length: section.count + 1 }, (_, index) => section.start + index - 1)
              : Array.from({ length: section.count }, (_, index) => section.start + index)
      actions.push({
        key: label,
        label,
        frames,
        frameMs:
          label === '待机'
            ? profile.idleTicksPerFrame * 40
            : Math.max(1, profile.actTicksPerFrame) * 40,
        timing:
          label === '待机'
            ? `${profile.idleTicksPerFrame * 40} 毫秒/帧`
            : profile.actTicksPerFrame === 0
              ? '零时长：直接落到末帧'
              : `${profile.actTicksPerFrame * 40} 毫秒/帧`,
      })
    }
  } else if (profile?.kind === 'summon' && actualFrameCount) {
    actions.push({
      key: 'summon-all',
      label: '召唤现身',
      frames: Array.from({ length: actualFrameCount }, (_, index) => index),
      frameMs: 200,
      timing: '这里只预览帧序；实际播放节奏由技能决定',
    })
  }
  return actions
}

/** 编辑器动态格是持续观察面：多帧动作循环预览，不改变运行时动作是否循环的语义。 */
export function battleSpriteSemanticGroup(
  definition: BattleSpriteDef,
  actualFrameCount: number,
  active = false,
): SemanticFrameGroup {
  return {
    id: definition.id,
    label: definition.label,
    typeLabel: BATTLE_SPRITE_PROFILE_LABEL[definition.profile.kind],
    active,
    rows: battleSpriteActionsForProfile(definition.profile, actualFrameCount).map((action) => ({
      id: `${definition.id}:${action.key}`,
      label: action.label,
      frames: action.frames,
      playbackFrames: action.frames,
      frameMs: action.frameMs,
      ...(action.frames.length > 1 ? { loopFrom: 0 } : {}),
      note: action.timing,
    })),
  }
}
