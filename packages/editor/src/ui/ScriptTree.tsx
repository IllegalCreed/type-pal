/**
 * 脚本树查看器（只读）—— 把迁移出来的结构化脚本（ScriptStage[] / Command[]）渲成可读中文树。
 * 单人开发的「验证眼睛」:一眼看出迁移的剧情对不对(设计:script-model-m3-design §4 编辑器侧)。
 *
 * 只读:不 dispatch、不改数据。可视化编辑(拖拽/表单)是后续 C-track。
 */

import type {
  Command,
  Locale,
  ScriptCondition,
  ScriptIndexV1,
  ScriptStage,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { useEffect, useRef } from 'react'

/** locale 查文本;缺失回落显 id(不崩)。 */
function txt(id: string | undefined, locale: Locale): string {
  if (!id) return ''
  const s = lookupText(id, locale)
  return s === id ? `⟨${id}⟩` : s // 未翻译键用尖括号标出(而非静默显 id)
}

function describeCondition(c: ScriptCondition, locale: Locale): string {
  switch (c.kind) {
    case 'flag':
      return `旗标 ${c.flag} ${c.is ? '为真' : '为假'}`
    case 'var':
      return `变量 ${c.var} ${c.op} ${c.value}`
    case 'entityState':
      return `${c.entity} 状态 = ${c.is}`
    case 'entityInScene':
      return `${c.entity} 在本场景`
    case 'chance':
      return `${c.percent}% 概率`
    case 'hasItem':
      return `持有物品 ${c.itemId}${c.atLeast ? `≥${c.atLeast}` : ''}`
    case 'itemEquipped':
      return `装备物品 ${c.itemId}${c.atLeast && c.atLeast > 1 ? `≥${c.atLeast}` : ''}`
    case 'allFullHp':
      return '全队满血'
    case 'hasMoney':
      return `钱 ≥ ${c.atLeast}`
    case 'inParty':
      return `队伍含 ${c.actorId}`
    case 'all':
      return c.of.map((x) => describeCondition(x, locale)).join(' 且 ')
    case 'any':
      return c.of.map((x) => describeCondition(x, locale)).join(' 或 ')
    case 'not':
      return `非(${describeCondition(c.cond, locale)})`
  }
}

interface Described {
  icon: string
  label: string
  /** 灰色副文本(坐标/id 等）。 */
  detail?: string
  /** 嵌套子块（分支臂/战斗臂）。seg = 运行时路径段名(与 ScriptRunner onStep 对齐,预览高亮)。 */
  blocks?: { title: string; seg: string; body: readonly Command[] }[]
  /** 未翻译（逃生口）高亮。 */
  warn?: boolean
}

function describe(cmd: Command, locale: Locale, scriptIndex?: ScriptIndexV1): Described {
  switch (cmd.kind) {
    case 'chasePlayer':
      return {
        icon: '👣',
        label: `追逐玩家(范围 ${cmd.range ?? 8} 格 · 速度 ${cmd.speed ?? 4}${cmd.floating ? ' · 穿障' : ''})`,
      }
    case 'vanishEntity':
      return { icon: '⊘', label: `${cmd.entity ?? '自身'} 消失 ${cmd.seconds ?? 2}s(重生)` }
    case 'loadLastSave':
      return { icon: '📂', label: '读最近存档' }
    case 'gameOver':
      return { icon: '💀', label: '战败流程(渐红 + 文案 + 读档)' }
    case 'dialog': {
      const who = cmd.line.speaker ? `${txt(cmd.line.speaker, locale)}: ` : ''
      const slot = cmd.line.slot === 'top' ? '上' : cmd.line.slot === 'narration' ? '旁白' : '下'
      return {
        icon: '💬',
        label: `${who}${txt(cmd.line.text, locale)}`,
        detail: cmd.line.portrait ? `${slot}·立绘${cmd.line.portrait.icon}` : slot,
      }
    }
    case 'clearDialog':
      return { icon: '🧹', label: '清对话框' }
    case 'fade':
      return { icon: '🌓', label: cmd.dir === 'out' ? '淡出（黑）' : '淡入' }
    case 'ditherScreen':
      return { icon: '▦', label: `逐像素渐变 ${cmd.ms ?? 720}ms` }
    case 'playVideo':
      return { icon: '🎬', label: `播过场视频 videos/${cmd.videoId}.mp4` }
    case 'playRng':
      return { icon: '🎞', label: `播 RNG 序列 chunk ${cmd.chunkIdx}` }
    case 'wait':
      return { icon: '⏱', label: `等待 ${cmd.ms}ms` }
    case 'teleportParty':
      return { icon: '📍', label: '队伍瞬移', detail: `(${cmd.pos.col},${cmd.pos.row})` }
    case 'loadScene':
      return {
        icon: '🚪',
        label: `切到场景 ${cmd.scene}`,
        detail: cmd.pos ? `落点 (${cmd.pos.col},${cmd.pos.row})` : undefined,
      }
    case 'setPartyFacing':
      return {
        icon: '🧭',
        label: cmd.gesture
          ? `队伍姿势帧 ${cmd.gesture}(向 ${cmd.facing})`
          : `队伍转向 ${cmd.facing}`,
        detail: cmd.member ? `队员 ${cmd.member}` : undefined,
      }
    case 'setActorSprite':
      return { icon: '🎭', label: `${cmd.actor} 换精灵`, detail: cmd.sprite }
    case 'fleeBattle':
      return { icon: '🏃', label: '敌人逃离战场' }
    case 'endBattle':
      return {
        icon: '🏁',
        label: `战斗结束(${cmd.result === 'won' ? '判胜' : cmd.result === 'lost' ? '判负' : '终止无奖励'})`,
      }
    case 'stopScript':
      return { icon: '⛔', label: '终止脚本(跳转臂尾;阶段不转移)' }
    case 'quitToTitle':
      return { icon: '🏁', label: '游戏通关退出 → 回标题屏' }
    case 'setEntityState':
      return {
        icon: '👁',
        label: `${cmd.entity} 状态 → ${cmd.state}`,
        detail: cmd.state <= 0 ? '隐藏' : cmd.state >= 2 ? '现身+挡路' : '现身',
      }
    case 'setMultiEntityState':
      return {
        icon: '👁',
        label: `批量设 ${cmd.entities.length} 实体 → ${cmd.state}`,
        detail: cmd.state <= 0 ? '隐藏' : cmd.state >= 2 ? '现身+挡路' : '现身',
      }
    case 'setEntityPos':
      return { icon: '📍', label: `${cmd.entity} 定位`, detail: `(${cmd.pos.col},${cmd.pos.row})` }
    case 'setEntityPosRelParty':
      return {
        icon: '📍',
        label: `${cmd.entity} 相对队伍定位`,
        detail: `队伍±(${cmd.dcol},${cmd.drow})`,
      }
    case 'shakeScreen':
      return { icon: '📳', label: `震屏 ${cmd.frames} 帧 · 幅 ${cmd.level}` }
    case 'setScreenWave':
      return { icon: '🌊', label: `屏波 幅 ${cmd.level} · 推进 ${cmd.progression}` }
    case 'setEntityLayer':
      return { icon: '📐', label: `${cmd.entity} 图层 → ${cmd.layer}` }
    case 'increaseHpMp':
      return { icon: '❤', label: `全队 HP/MP ${cmd.delta >= 0 ? '+' : ''}${cmd.delta}` }
    case 'revivePartyAll':
      return { icon: '✨', label: `全队复活(HP=max×${cmd.tenths}/10)` }
    case 'learnSkill':
      return { icon: '📖', label: `角色 ${cmd.role} 习得仙术 ${cmd.skill}` }
    case 'unequip':
      return {
        icon: '🔓',
        label: `角色 ${cmd.role} 卸装 ${cmd.slot === 'all' ? '全部' : `槽${cmd.slot}`}`,
      }
    case 'toggleDayNight':
      return { icon: '🌗', label: `昼夜切换(${cmd.ms}ms)` }
    case 'setFollowers':
      return {
        icon: '👥',
        label: cmd.sprites.length ? `编外跟随者 ${cmd.sprites.join('/')}` : '清跟随者',
      }
    case 'setMapOverride':
      return { icon: '🗺', label: `换底图 → ${cmd.mapNum}`, detail: cmd.scene ?? '当前场景' }
    case 'halveMoney':
      return { icon: '💸', label: '金钱减半' }
    case 'setEntityFacing':
      return { icon: '🧭', label: `${cmd.entity} 转向 ${cmd.facing}` }
    case 'setEntityFrame':
      return { icon: '🎞', label: `${cmd.entity} 定帧 ${cmd.frame}` }
    case 'setSceneStage':
      return { icon: '📜', label: `${cmd.scene} 进场剧情 → 第 ${cmd.stage} 段` }
    case 'setActorAppearance': {
      const parts = [
        cmd.spriteId ? `精灵 ${cmd.spriteId}` : '',
        cmd.portrait !== undefined ? `立绘 ${cmd.portrait}` : '',
        cmd.battleSprite !== undefined ? `战斗精灵 ${cmd.battleSprite}` : '',
      ].filter(Boolean)
      return { icon: '🎭', label: `${cmd.actor} 换形象`, detail: parts.join(' · ') }
    }
    case 'giveItem':
      return {
        icon: '🎁',
        label: `获得物品 ${cmd.itemId}${cmd.count && cmd.count > 1 ? ` ×${cmd.count}` : ''}`,
      }
    case 'loseItem':
      return {
        icon: '📤',
        label: `失去物品 ${cmd.itemId}${cmd.count && cmd.count > 1 ? ` ×${cmd.count}` : ''}`,
      }
    case 'giveMoney':
      return { icon: '💰', label: `${cmd.delta >= 0 ? '获得' : '扣除'} ${Math.abs(cmd.delta)} 钱` }
    case 'setFlag':
      return { icon: '🚩', label: `旗标 ${cmd.flag} = ${cmd.value ? '真' : '假'}` }
    case 'setVar':
      return { icon: '🔢', label: `变量 ${cmd.var} = ${cmd.value}` }
    case 'addVar':
      return { icon: '🔢', label: `变量 ${cmd.var} ${cmd.delta >= 0 ? '+' : ''}${cmd.delta}` }
    case 'playSound':
      return { icon: '🔊', label: `音效 ${cmd.soundId}` }
    case 'setParty':
      return { icon: '👥', label: `队伍变更 → ${cmd.members.join(', ')}` }
    case 'mountParty':
      return { icon: '🛶', label: `挂载 → ${cmd.entity}` }
    case 'unmountParty':
      return { icon: '🚶', label: '下载具' }
    case 'ride':
      return { icon: '⛵', label: `骑行 ${cmd.entity}`, detail: `→(${cmd.to.col},${cmd.to.row})` }
    case 'takeEntity':
      return { icon: '🔒', label: `接管 ${cmd.entity}` }
    case 'releaseEntity':
      return { icon: '🔓', label: `归还 ${cmd.entity ?? '(全部)'}` }
    case 'playMusic':
      return { icon: '🎵', label: `音乐 ${cmd.musicId}` }
    case 'setAmbience':
      return {
        icon: '🌗',
        label: `切氛围 ${cmd.ambience === 'night' ? '夜晚' : cmd.ambience === 'day' ? '白天' : cmd.ambience}`,
      }
    case 'moveEntity':
      return {
        icon: '🚶',
        label: `${cmd.entity} 走到`,
        detail: `(${cmd.to.col},${cmd.to.row}) ${cmd.speed}`,
      }
    case 'stepEntity':
      return { icon: '👣', label: `${cmd.entity} 走一步 ${cmd.dir}` }
    case 'animEntity':
      return { icon: '🎞', label: `${cmd.entity} 推进动画` }
    case 'nudgeEntity':
      return { icon: '↔', label: `${cmd.entity} 位移`, detail: `(${cmd.dx},${cmd.dy})px` }
    case 'moveParty':
      return { icon: '🚶', label: '队伍走到', detail: `(${cmd.to.col},${cmd.to.row}) ${cmd.speed}` }
    case 'nudgeParty':
      return { icon: '↔', label: '队伍位移', detail: `(${cmd.dx},${cmd.dy})px` }
    case 'startBattle':
      return {
        icon: '⚔',
        label: `战斗 敌队 ${cmd.team}${cmd.auto ? ' · 自动' : ''}`,
        blocks: [
          ...(cmd.onLose ? [{ title: '战败', seg: 'onLose', body: cmd.onLose }] : []),
          ...(cmd.onFlee ? [{ title: '逃跑', seg: 'onFlee', body: cmd.onFlee }] : []),
        ],
      }
    case 'openShop':
      return { icon: '🏪', label: `商店 ${cmd.shop}`, detail: cmd.mode === 'buy' ? '买' : '卖' }
    case 'teleportOut':
      return {
        icon: '🌀',
        label: '传送出口(引路蜂)',
        blocks: cmd.onFail ? [{ title: '不灵(无出口)', seg: 'onFail', body: cmd.onFail }] : [],
      }
    case 'confirm':
      return {
        icon: '❓',
        label: '是/否 询问',
        blocks: [{ title: '选「否」', seg: 'onNo', body: cmd.onNo }],
      }
    case 'branch':
      return {
        icon: '🔀',
        label: `如果 ${describeCondition(cmd.cond, locale)}`,
        blocks: [
          { title: '则', seg: 'then', body: cmd.then },
          ...(cmd.else ? [{ title: '否则', seg: 'else', body: cmd.else }] : []),
        ],
      }
    case 'cameraPan':
      return { icon: '🎥', label: '镜头平移', detail: `(${cmd.dx},${cmd.dy})×${cmd.frames}` }
    case 'cameraSnap':
      return { icon: '🎥', label: cmd.to ? `镜头定位 (${cmd.to.col},${cmd.to.row})` : '镜头回正' }
    case 'setEntityAuto':
      return {
        icon: '🔁',
        label: `${cmd.entity} 换巡逻脚本`,
        detail: cmd.script
          ? `${scriptIndex?.library?.[cmd.script.id] ? '共享' : '内部'}引用 ${cmd.script.id}`
          : cmd.stages.length
            ? `${cmd.stages.length} 段`
            : '停用',
      }
    case 'setEntityTrigger':
      return {
        icon: '🔗',
        label: `${cmd.entity} 换触发脚本`,
        detail: cmd.script
          ? `${scriptIndex?.library?.[cmd.script.id] ? '共享' : '内部'}引用 ${cmd.script.id}`
          : cmd.stages.length
            ? `${cmd.stages.length} 段`
            : '停用',
      }
    case 'setSceneOnTeleport':
      return {
        icon: '🌀',
        label: `${cmd.scene} 装传送出口`,
        detail: cmd.script
          ? `${scriptIndex?.library?.[cmd.script.id] ? '共享' : '内部'}引用 ${cmd.script.id}`
          : `${cmd.stages.length} 段`,
      }
    case 'callScript':
      return {
        icon: '↪',
        label: scriptIndex?.library?.[cmd.ref.id] ? '调用共享脚本' : '调用内部子脚本',
        detail: `${cmd.ref.chunk} · ${cmd.ref.id}`,
      }
    case 'jumpScript':
      return {
        icon: '→',
        label: scriptIndex?.library?.[cmd.ref.id] ? '跳转共享脚本' : '跳转内部子脚本',
        detail: `${cmd.ref.chunk} · ${cmd.ref.id}`,
      }
    case 'setEntityTriggerMode':
      return {
        icon: '🔗',
        label: `${cmd.entity} 触发方式`,
        detail: cmd.on ? `${cmd.on}${cmd.range ?? ''}` : '关闭',
      }
    case 'unmigrated':
      return {
        icon: '⚠',
        label: `未翻译 op 0x${cmd.opcode.toString(16)}`,
        detail: cmd.note,
        warn: true,
      }
  }
}

/** 行级编辑操作(C-track v1)。 */
export type RowAction = 'insert' | 'up' | 'down' | 'remove'
/** 段级操作(多段 = 原版「再按一次继续下一段」的结构化版;宝箱防重两段等)。 */
export type StageAction =
  | { kind: 'addAfter' }
  | { kind: 'remove' }
  | { kind: 'next'; next: ScriptStage['next'] }

interface RowCtx {
  locale: Locale
  scriptIndex?: ScriptIndexV1
  activePath: string | null
  selectedPath: string | null
  onSelect?: (path: string, cmd: Command) => void
  onRowAction?: (path: string, action: RowAction) => void
  onStageAction?: (stageIdx: number, action: StageAction) => void
}

function CommandRow(props: { cmd: Command; depth: number; path: string; ctx: RowCtx }) {
  const { cmd, depth, path, ctx } = props
  const d = describe(cmd, ctx.locale, ctx.scriptIndex)
  const active = ctx.activePath === path
  const selected = ctx.selectedPath === path
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (active) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active])
  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: 树行点选(v1;键盘导航后续) */}
      <div
        ref={rowRef}
        className={`cmd-row${d.warn ? ' warn' : ''}${active ? ' active' : ''}${selected ? ' sel' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={ctx.onSelect ? () => ctx.onSelect?.(path, cmd) : undefined}
      >
        <span className="cmd-ico">{d.icon}</span>
        <span className="cmd-label">{d.label}</span>
        {d.detail ? <span className="cmd-detail">{d.detail}</span> : null}
        {ctx.onRowAction ? (
          // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: 仅挡冒泡防误选中;真交互是内部 button(可聚焦/键盘)
          <span className="cmd-ops" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              title="在此后插入"
              onClick={() => ctx.onRowAction?.(path, 'insert')}
            >
              ＋
            </button>
            <button type="button" title="上移" onClick={() => ctx.onRowAction?.(path, 'up')}>
              ↑
            </button>
            <button type="button" title="下移" onClick={() => ctx.onRowAction?.(path, 'down')}>
              ↓
            </button>
            <button
              type="button"
              className="del"
              title="删除"
              onClick={() => ctx.onRowAction?.(path, 'remove')}
            >
              ✕
            </button>
          </span>
        ) : null}
      </div>
      {d.blocks?.map((b, i) => (
        <div key={i}>
          <div className="cmd-block-title" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
            {b.title}
          </div>
          {b.body.map((c, j) => (
            <CommandRow
              key={j}
              cmd={c}
              depth={depth + 2}
              path={`${path}/${b.seg}/${j}`}
              ctx={ctx}
            />
          ))}
        </div>
      ))}
    </>
  )
}

/** 渲染一组 stages（触发段/进场段）。多段时显示段号 + next 转移语义。
 *  activePath = 演出预览当前指令(高亮+滚动跟随);selectedPath/onSelect/onRowAction = 编辑交互(v1)。 */
export function ScriptTree(props: {
  stages: readonly ScriptStage[]
  locale: Locale
  scriptIndex?: ScriptIndexV1
  activePath?: string | null
  selectedPath?: string | null
  onSelect?: (path: string, cmd: Command) => void
  onRowAction?: (path: string, action: RowAction) => void
  onStageAction?: (stageIdx: number, action: StageAction) => void
}) {
  const {
    stages,
    locale,
    scriptIndex,
    activePath = null,
    selectedPath = null,
    onSelect,
    onRowAction,
    onStageAction,
  } = props
  const ctx: RowCtx = { locale, scriptIndex, activePath, selectedPath, onSelect, onRowAction }
  if (stages.length === 0) return <div className="script-empty">（空脚本）</div>
  return (
    <div className="script-tree">
      {stages.map((st, i) => (
        <div key={i} className="stage">
          {stages.length > 1 || onStageAction ? (
            <div className="stage-head">
              第 {i + 1} 段
              {onStageAction ? (
                <>
                  <span className="stage-next">→ 跑完</span>
                  <select
                    className="stage-next-sel"
                    value={
                      st.next === 'advance'
                        ? 'advance'
                        : typeof st.next === 'number'
                          ? String(st.next)
                          : ''
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      onStageAction(i, {
                        kind: 'next',
                        next: v === '' ? undefined : v === 'advance' ? 'advance' : Number(v),
                      })
                    }}
                    title="本段跑完后的去向(多段 = 原版「再按一次继续下一段」;宝箱防重两段)"
                  >
                    <option value="">停在本段</option>
                    <option value="advance">推进下一段</option>
                    {stages.map((_, k) => (
                      <option key={k} value={k}>
                        回第 {k + 1} 段
                      </option>
                    ))}
                  </select>
                  <span className="spacer" />
                  <button
                    type="button"
                    className="mini-txt"
                    title="在本段之后插入新段"
                    onClick={() => onStageAction(i, { kind: 'addAfter' })}
                  >
                    ＋段
                  </button>
                  {stages.length > 1 ? (
                    <button
                      type="button"
                      className="mini-txt"
                      title="删除本段(指向它的跳转自动清除;可撤销)"
                      onClick={() => onStageAction(i, { kind: 'remove' })}
                    >
                      🗑段
                    </button>
                  ) : null}
                </>
              ) : (
                <span className="stage-next">
                  {st.next === 'advance'
                    ? '→ 跑完推进下一段'
                    : typeof st.next === 'number'
                      ? `→ 跑完回第 ${st.next + 1} 段`
                      : '→ 跑完停在本段'}
                </span>
              )}
            </div>
          ) : null}
          {st.body.length === 0 ? (
            ctx.onRowAction ? (
              <button
                type="button"
                className="tool"
                style={{ marginLeft: 24 }}
                onClick={() => ctx.onRowAction?.(`${i}/-1`, 'insert')}
              >
                ＋ 插入第一条指令
              </button>
            ) : (
              <div className="script-empty" style={{ paddingLeft: 24 }}>
                （空段）
              </div>
            )
          ) : (
            st.body.map((c, j) => (
              <CommandRow key={j} cmd={c} depth={0} path={`${i}/${j}`} ctx={ctx} />
            ))
          )}
        </div>
      ))}
    </div>
  )
}
