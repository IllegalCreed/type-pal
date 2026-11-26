import type { GridPos, WorldState } from '@type-pal/content'
import type {
  DebugMotionAuthority,
  DebugMotionSnapshot,
  DebugRegisteredMotion,
} from './debug-tools.js'
import { createDebugElement as el, createDebugSection as section } from './debug-tools-styles.js'

function formatDebugNumber(value: number): string {
  return String(Number.isInteger(value) ? value : Math.round(value * 1000) / 1000)
}

export function createDebugInspector(
  readWorld: () => WorldState,
  readMotion: () => DebugMotionSnapshot,
) {
  const motionSection = section('实体位置控制权（运行态，只读）')
  const motionList = el('div', { className: 'tpd-motion-list' })
  motionList.setAttribute('role', 'list')
  motionSection.appendChild(motionList)

  const authorityText = (authority: DebugMotionAuthority): string => {
    switch (authority.kind) {
      case 'world':
        return '世界'
      case 'script':
        return '脚本'
      case 'follow':
        return '跟随'
      case 'mount':
        return `载具 ${authority.parent} (${authority.dx},${authority.dy})`
    }
  }
  const positionText = (pos: GridPos): string =>
    `${formatDebugNumber(pos.col)},${formatDebugNumber(pos.row)},${formatDebugNumber(pos.height)}`
  const registeredMotionText = (motion: DebugRegisteredMotion): string => {
    const owner = motion.activationOwnerId
      ? ` owner ${motion.activationOwnerId}@${String(motion.activationEpoch ?? '—')}`
      : ''
    const queuedAuthority =
      motion.authorityEpochAtEnqueue === undefined
        ? ''
        : ` authority@${motion.authorityEpochAtEnqueue}`
    return `${motion.source} ${motion.kind}#${motion.commandEpoch}${owner}${queuedAuthority}${
      motion.pausedByAuthority ? '（被控制权暂停）' : ''
    }`
  }
  const appendMotionRow = (input: {
    kind: 'leader' | 'party-follower' | 'extra-follower' | 'entity'
    id: string
    title: string
    authority: DebugMotionAuthority
    details: string[]
  }): void => {
    const row = el('div', { className: 'tpd-motion-row' })
    row.setAttribute('role', 'listitem')
    row.dataset.motionKind = input.kind
    row.dataset.motionId = input.id
    row.dataset.authority = input.authority.kind
    const identity = el('div', { className: 'tpd-motion-identity' })
    identity.appendChild(el('strong', { text: input.title }))
    identity.appendChild(el('code', { text: input.id }))
    const authority = el('span', {
      className: 'tpd-motion-authority',
      text: authorityText(input.authority),
    })
    authority.dataset.authority = input.authority.kind
    row.append(identity, authority)
    row.appendChild(
      el('div', {
        className: 'tpd-motion-meta',
        text: input.details.filter(Boolean).join(' · '),
      }),
    )
    motionList.appendChild(row)
  }
  const renderMotionState = (snapshot: DebugMotionSnapshot): void => {
    motionList.replaceChildren()
    appendMotionRow({
      kind: 'leader',
      id: snapshot.player.id,
      title: '队长',
      authority: snapshot.player.authority,
      details: [
        snapshot.player.template !== snapshot.player.id ? `角色 ${snapshot.player.template}` : '',
        `位置 ${positionText(snapshot.player.pos)}`,
        `朝向 ${snapshot.player.facing}`,
        `authority@${snapshot.player.authorityEpoch}`,
        snapshot.player.partyMove
          ? `partyMove → ${positionText(snapshot.player.partyMove.to)} ${snapshot.player.partyMove.speed}`
          : '',
        snapshot.player.walking ? 'walking' : 'idle',
        `scene ${snapshot.scene} · tick ${snapshot.worldTick}`,
      ],
    })
    for (const follower of snapshot.followers)
      appendMotionRow({
        kind: 'party-follower',
        id: follower.id,
        title: `队员 ${follower.partyIndex}`,
        authority: follower.authority,
        details: [
          follower.template !== follower.id ? `角色 ${follower.template}` : '',
          `位置 ${positionText(follower.pos)}`,
          `朝向 ${follower.facing}`,
        ],
      })
    for (const follower of snapshot.extraFollowers)
      appendMotionRow({
        kind: 'extra-follower',
        id: follower.spriteId,
        title: `编外跟随 ${follower.runtimeSlot + 1}`,
        authority: follower.authority,
        details: [
          `runtime slot ${follower.runtimeSlot}`,
          `位置 ${positionText(follower.pos)}`,
          `朝向 ${follower.facing}`,
          follower.renderable ? '资源已就绪' : '资源未就绪',
        ],
      })
    for (const entity of snapshot.entities) {
      const enabledGates = Object.entries(entity.gates)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(',')
      appendMotionRow({
        kind: 'entity',
        id: entity.id,
        title: '实体',
        authority: entity.authority,
        details: [
          `位置 ${positionText(entity.pos)}`,
          `朝向 ${entity.facing}`,
          `authority@${entity.authorityEpoch}`,
          entity.scriptMotion ? `已注册 ${registeredMotionText(entity.scriptMotion)}` : '',
          entity.autoMotion ? `已注册 ${registeredMotionText(entity.autoMotion)}` : '',
          entity.gait === null ? '' : `gait ${entity.gait}`,
          `gate ${enabledGates || '全部关闭'}`,
        ],
      })
    }
  }

  const inspectSection = section('世界变量检视（只读）')
  const inspectEl = el('pre', { className: 'tpd-inspector' })
  const refreshInspect = (): void => {
    const w = readWorld()
    const motion = readMotion()
    inspectEl.textContent = JSON.stringify(
      {
        money: w.money,
        party: w.party.map((c) => ({
          id: c.id,
          level: c.level,
          hp: `${c.hp}/${c.maxHP}`,
          mp: `${c.mp}/${c.maxMP}`,
          equipment: c.equipment,
          statuses: c.extraStatuses?.map((s) => `${s.status}:${s.turns}`),
          poisons: c.poisons?.map((p) => p.poisonId),
        })),
        inventory: w.inventory,
        learnedSkills: w.learnedSkills,
        collectValue: w.collectValue,
        flags: Object.keys(w.script?.flags ?? {}).length,
        vars: w.script?.vars,
        entityStates: Object.keys(w.script?.entityState ?? {}).length,
      },
      null,
      1,
    )
    renderMotionState(motion)
  }
  refreshInspect()
  const inspectBtn = el('button', { text: '刷新状态' })
  inspectBtn.type = 'button'
  inspectBtn.addEventListener('click', refreshInspect)
  inspectSection.appendChild(inspectEl)
  inspectSection.appendChild(inspectBtn)
  return { motionSection, inspectSection, refresh: refreshInspect }
}
