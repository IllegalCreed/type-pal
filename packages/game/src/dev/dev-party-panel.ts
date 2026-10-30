import { updateAllEquipments } from '../core/equip-effect.js'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from '../core/inspect/battle-inspect.js'
import { indexImageToCanvas } from './dev-indexed-image.js'
import type { DevPanelDeps } from './dev-panel.js'

/**
 * 队伍在队开关纯逻辑(devpanel 队伍 tab 用):返回 toggle roleId 后的 partyMembers。
 * - role 0(队首李逍遥)常驻,toggle 无效(user 2026-06-04:至少保留队首)。
 * - 不在队 → push 末尾(站位顺序);在队 → 保序移除。
 * - 纯函数,不 mutate 入参。
 */
export function togglePartyMembership(members: readonly number[], roleId: number): number[] {
  if (roleId === 0) return [...members]
  if (members.includes(roleId)) return members.filter((m) => m !== roleId)
  return [...members, roleId]
}

/** 正数补 `+` 号(场效 signed 显示用)。 */
function signedText(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

type PartyPanelDeps = Pick<DevPanelDeps, 'gs' | 'portraitFrames' | 'palette'> & {
  resources: Pick<DevPanelDeps['resources'], 'playerRoles' | 'objectPoisons' | 'items'>
}

/** 队伍页编辑走既有装备/清毒入口；战况读数沿用纯inspect投影。 */
export function mountDevPartyPanel(body: HTMLDivElement, deps: PartyPanelDeps): void {
  // ── 👥 队伍 tab:6 角色在队开关(头像 + 灯,绿=在队/红=离队;队首李逍遥 role0 常驻)──
  const partyH = document.createElement('h4')
  partyH.textContent = '👥 队伍编辑(点头像切换在队;队首李逍遥常驻)'
  partyH.className = 'tp-dev-section-h'
  body.appendChild(partyH)

  const partyGrid = document.createElement('div')
  partyGrid.style.cssText =
    'display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin:4px 0' // 2 行 × 3 列
  const partyStatusList = document.createElement('div')
  partyStatusList.style.cssText =
    'margin:6px 0 8px; padding:6px; border:1px solid #444; background:#18181d; font-size:11px; line-height:1.45'

  const renderPartyStatusList = (): void => {
    partyStatusList.textContent = ''
    const title = document.createElement('div')
    title.style.cssText = 'color:#fdf6a8; font-weight:bold; margin-bottom:4px'
    title.textContent = '当前队伍状态'
    partyStatusList.appendChild(title)

    const readouts = collectPartyStatusReadouts(
      deps.gs,
      deps.resources.playerRoles,
      deps.resources.objectPoisons,
      deps.resources.items,
    )
    if (readouts.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color:#888'
      empty.textContent = '无队员'
      partyStatusList.appendChild(empty)
      return
    }

    for (const r of readouts) {
      const row = document.createElement('div')
      row.style.cssText =
        'display:grid; grid-template-columns:70px 1fr; gap:6px; padding:2px 0; border-top:1px solid #2a2a32'
      const name = document.createElement('div')
      name.style.cssText = 'color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis'
      name.textContent = `P${r.slot + 1} ${r.roleName}`
      name.title = `role ${r.roleId} · ${r.source === 'battle' ? '战斗局部状态' : '持久/装备状态'}`
      const status = document.createElement('div')
      status.style.cssText = r.entries.length > 0 ? 'color:#bde0ff' : 'color:#777'
      status.textContent = r.entries.length > 0 ? r.entries.join(' / ') : '无 buff / 异常 / 毒'
      row.append(name, status)
      partyStatusList.appendChild(row)
    }
  }

  const renderPartyCards = (): void => {
    partyGrid.textContent = ''
    for (let roleId = 0; roleId <= 5; roleId++) {
      const role = deps.resources.playerRoles.roles.find((r) => r.id === roleId)
      const inParty = deps.gs.partyMembers.includes(roleId)
      const isLeader = roleId === 0
      const partyEditingDisabled = deps.gs.mode === 'battle'
      const card = document.createElement('button')
      card.style.cssText =
        `display:flex; flex-direction:column; align-items:center;` +
        ` padding:0; overflow:hidden; height:140px; cursor:${isLeader || partyEditingDisabled ? 'default' : 'pointer'};` +
        ` background:${inParty ? '#1f3a24' : '#3a1f1f'};` +
        ` border:1px solid ${inParty ? '#4c8' : '#c55'}; border-radius:4px`
      if (partyEditingDisabled && !isLeader) card.disabled = true
      // 头像:object-fit:cover 自适应裁剪(统一尺寸、不变形、顶对齐显示脸);缺 palette/帧 → 名字占位块
      const sprite = deps.portraitFrames?.get(role?.avatar ?? -1)
      if (sprite && deps.palette) {
        const c = indexImageToCanvas(sprite, deps.palette)
        c.style.cssText =
          'width:100%; height:90px; object-fit:cover; object-position:top center; display:block'
        card.appendChild(c)
      } else {
        const ph = document.createElement('div')
        ph.style.cssText =
          'width:100%; height:90px; background:#555; display:flex; align-items:center; justify-content:center; font-size:9px; color:#ccc'
        ph.textContent = role?._name ?? `R${roleId}`
        card.appendChild(ph)
      }
      const nm = document.createElement('div')
      nm.style.cssText = 'font-size:11px; white-space:nowrap; margin-top:4px'
      nm.textContent = role?._name ?? `role${roleId}`
      card.appendChild(nm)
      // 灯:绿=在队 / 红=离队;margin-top:auto 推到卡片底部 → 6 个灯统一对齐
      const lamp = document.createElement('div')
      lamp.style.cssText =
        `width:9px; height:9px; border-radius:50%; margin:auto 0 7px;` +
        ` background:${inParty ? '#4f4' : '#f44'}; box-shadow:0 0 4px ${inParty ? '#4f4' : '#f44'}`
      card.appendChild(lamp)
      card.title = isLeader
        ? '队首李逍遥常驻,不可离队'
        : partyEditingDisabled
          ? '战斗中不可编辑队伍'
          : inParty
            ? '点击离队'
            : '点击入队'
      if (!isLeader) {
        card.addEventListener('click', () => {
          if (deps.gs.mode === 'battle') return
          deps.gs.partyMembers = togglePartyMembership(deps.gs.partyMembers, roleId)
          deps.gs.rgPoisonStatus = {} // 队伍重组后毒槽不继承给新成员（SDLPal 0x75）。
          updateAllEquipments(deps.gs, deps.resources.items)
          // Dev 切队后同步当前队首 runtime sprite;present 会按 partyMembers[0] 的 rgwSpriteNum 渲染。
          const leader = deps.gs.partyMembers[0]
          if (leader !== undefined) {
            const spriteNum = deps.resources.playerRoles.roles.find(
              (r) => r.id === leader,
            )?.spriteNum
            if (spriteNum !== undefined) deps.gs.PlayerRolesRuntime.rgwSpriteNum[leader] = spriteNum
            if (leader === 0 && deps.gs.PlayerRolesRuntime.rgwSpriteNum[0] !== undefined) {
              deps.gs.partyLeaderSpriteId = deps.gs.PlayerRolesRuntime.rgwSpriteNum[0]
            }
          }
          renderPartyCards()
        })
      }
      partyGrid.appendChild(card)
    }
    renderPartyStatusList()
  }
  renderPartyCards()
  body.appendChild(partyGrid)
  body.appendChild(partyStatusList)

  // ── 敌方状态 + 场地信息(战斗中读 battleState;user 2026-06-08)——挨着「当前队伍状态」放,
  //    三块合成"当前战况"快照。带 🔄 刷新(逐回合 state 会变,而面板是开局快照)。──
  const enemyStatusList = document.createElement('div')
  enemyStatusList.style.cssText =
    'margin:6px 0 8px; padding:6px; border:1px solid #553f2a; background:#1d1813; font-size:11px; line-height:1.5'
  const renderEnemyStatusList = (): void => {
    enemyStatusList.textContent = ''
    const title = document.createElement('div')
    title.style.cssText = 'color:#ffcaa0; font-weight:bold; margin-bottom:4px'
    title.textContent = '敌方状态'
    enemyStatusList.appendChild(title)
    const readouts = collectEnemyStatusReadouts(
      deps.gs,
      deps.resources.objectPoisons,
      deps.resources.items,
    )
    if (readouts.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color:#888'
      empty.textContent = '不在战斗中(无敌方单位)'
      enemyStatusList.appendChild(empty)
      return
    }
    for (const r of readouts) {
      const block = document.createElement('div')
      block.style.cssText = 'padding:3px 0; border-top:1px solid #332a22'
      const head = document.createElement('div')
      head.style.cssText = `color:${r.defeated ? '#888' : '#ffd9b3'}; font-weight:bold`
      const ratio = r.maxHp > 0 ? Math.round((r.hp / r.maxHp) * 100) : 0
      head.textContent = `E${r.slot + 1} ${r.name}#${r.enemyId}  HP ${r.hp}/${r.maxHp}(${ratio}%)${r.defeated ? ' [已倒]' : ''}`
      block.appendChild(head)
      const stats = document.createElement('div')
      stats.style.cssText = 'color:#cdbfa8'
      stats.textContent = r.stats.map((s) => `${s.label}${s.value}`).join(' ')
      block.appendChild(stats)
      const resist = document.createElement('div')
      resist.style.cssText = 'color:#b8c9a8'
      resist.textContent = `抗性 ${r.resistances.map((s) => `${s.label}${s.value}`).join(' ')}`
      block.appendChild(resist)
      const steal = document.createElement('div')
      steal.style.cssText = `color:${r.canSteal ? '#ffe08a' : '#777'}`
      steal.textContent = `偷 ${r.steal}`
      block.appendChild(steal)
      if (r.attackEquivPoison) {
        const equiv = document.createElement('div')
        equiv.style.cssText = 'color:#b88fd6' // 紫 = 毒,同工具面板 s-poison
        equiv.textContent = `普攻毒 ${r.attackEquivPoison}`
        block.appendChild(equiv)
      }
      if (r.statusEntries.length > 0) {
        const st = document.createElement('div')
        st.style.cssText = 'color:#ffb0b0'
        st.textContent = `异常/毒 ${r.statusEntries.join(' / ')}`
        block.appendChild(st)
      }
      enemyStatusList.appendChild(block)
    }
  }

  const fieldInfoList = document.createElement('div')
  fieldInfoList.style.cssText =
    'margin:6px 0 8px; padding:6px; border:1px solid #3a445c; background:#15181d; font-size:11px; line-height:1.5'
  const renderFieldInfo = (): void => {
    fieldInfoList.textContent = ''
    const title = document.createElement('div')
    title.style.cssText = 'color:#a8d0ff; font-weight:bold; margin-bottom:4px'
    title.textContent = '场地信息'
    fieldInfoList.appendChild(title)
    const info = collectFieldInfoReadout(deps.gs)
    if (!info) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color:#888'
      empty.textContent = '不在战斗中'
      fieldInfoList.appendChild(empty)
      return
    }
    const head = document.createElement('div')
    head.style.cssText = 'color:#cfe0ff'
    head.textContent = `场地#${info.fieldId}${info.isBoss ? ' · BOSS战' : ''}  屏幕波纹 ${info.screenWave}`
    fieldInfoList.appendChild(head)
    const el = document.createElement('div')
    el.style.cssText = 'color:#bcd'
    el.textContent = `元素场效 ${info.elements.map((s) => `${s.label}${signedText(s.value)}`).join(' ')}`
    fieldInfoList.appendChild(el)
    const note = document.createElement('div')
    note.style.cssText = 'color:#778; font-size:10px; margin-top:2px'
    note.textContent = '(场效=该元素法术在本场地的增/减成,signed;正=增伤)'
    fieldInfoList.appendChild(note)
  }

  const refreshBtn = document.createElement('button')
  refreshBtn.textContent = '🔄 刷新战况(队伍/敌方/场地)'
  refreshBtn.style.cssText = 'display:block; width:100%; padding:4px; margin:4px 0; cursor:pointer'
  refreshBtn.addEventListener('click', () => {
    renderPartyStatusList()
    renderEnemyStatusList()
    renderFieldInfo()
  })

  body.appendChild(refreshBtn)
  body.appendChild(enemyStatusList)
  body.appendChild(fieldInfoList)
  renderEnemyStatusList()
  renderFieldInfo()
}
