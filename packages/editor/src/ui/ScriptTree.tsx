/**
 * 脚本树查看器（只读）—— 把迁移出来的结构化脚本（ScriptStage[] / Command[]）渲成可读中文树。
 * 单人开发的「验证眼睛」:一眼看出迁移的剧情对不对(设计:script-model-m3-design §4 编辑器侧)。
 *
 * 只读:不 dispatch、不改数据。可视化编辑(拖拽/表单)是后续 C-track。
 */
import { lookupText } from '@type-pal/content'
import type { Command, Locale, ScriptCondition, ScriptStage } from '@type-pal/content'

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
    case 'chance':
      return `${c.percent}% 概率`
    case 'hasItem':
      return `持有物品 ${c.itemId}${c.atLeast ? `≥${c.atLeast}` : ''}`
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
  /** 嵌套子块（分支臂/战斗臂）。 */
  blocks?: { title: string; body: readonly Command[] }[]
  /** 未翻译（逃生口）高亮。 */
  warn?: boolean
}

function describe(cmd: Command, locale: Locale): Described {
  switch (cmd.kind) {
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
    case 'wait':
      return { icon: '⏱', label: `等待 ${cmd.ms}ms` }
    case 'teleportParty':
      return { icon: '📍', label: '队伍瞬移', detail: `(${cmd.pos.col},${cmd.pos.row})` }
    case 'loadScene':
      return { icon: '🚪', label: `切到场景 ${cmd.scene}`, detail: cmd.pos ? `落点 (${cmd.pos.col},${cmd.pos.row})` : undefined }
    case 'setPartyFacing':
      return {
        icon: '🧭',
        label: cmd.gesture ? `队伍姿势帧 ${cmd.gesture}(向 ${cmd.facing})` : `队伍转向 ${cmd.facing}`,
        detail: cmd.member ? `队员 ${cmd.member}` : undefined,
      }
    case 'setActorSprite':
      return { icon: '🎭', label: `${cmd.actor} 换精灵`, detail: cmd.sprite }
    case 'setEntityState':
      return { icon: '👁', label: `${cmd.entity} 状态 → ${cmd.state}`, detail: cmd.state <= 0 ? '隐藏' : cmd.state >= 2 ? '现身+挡路' : '现身' }
    case 'setEntityFacing':
      return { icon: '🧭', label: `${cmd.entity} 转向 ${cmd.facing}` }
    case 'setEntityFrame':
      return { icon: '🎞', label: `${cmd.entity} 定帧 ${cmd.frame}` }
    case 'giveItem':
      return { icon: '🎁', label: `获得物品 ${cmd.itemId}${cmd.count && cmd.count > 1 ? ` ×${cmd.count}` : ''}` }
    case 'loseItem':
      return { icon: '📤', label: `失去物品 ${cmd.itemId}${cmd.count && cmd.count > 1 ? ` ×${cmd.count}` : ''}` }
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
    case 'playMusic':
      return { icon: '🎵', label: `音乐 ${cmd.musicId}` }
    case 'setBattleMusic':
      return { icon: '🎵', label: `战斗音乐 ${cmd.musicId}` }
    case 'setBattleField':
      return { icon: '🗺', label: `战场 ${cmd.fieldId}` }
    case 'moveEntity':
      return { icon: '🚶', label: `${cmd.entity} 走到`, detail: `(${cmd.to.col},${cmd.to.row}) ${cmd.speed}` }
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
        label: `战斗 敌队 ${cmd.team}`,
        blocks: [
          ...(cmd.onLose ? [{ title: '战败', body: cmd.onLose }] : []),
          ...(cmd.onFlee ? [{ title: '逃跑', body: cmd.onFlee }] : []),
        ],
      }
    case 'openShop':
      return { icon: '🏪', label: `商店 ${cmd.shop}`, detail: cmd.mode === 'buy' ? '买' : '卖' }
    case 'confirm':
      return { icon: '❓', label: '是/否 询问', blocks: [{ title: '选「否」', body: cmd.onNo }] }
    case 'branch':
      return {
        icon: '🔀',
        label: `如果 ${describeCondition(cmd.cond, locale)}`,
        blocks: [
          { title: '则', body: cmd.then },
          ...(cmd.else ? [{ title: '否则', body: cmd.else }] : []),
        ],
      }
    case 'cameraPan':
      return { icon: '🎥', label: '镜头平移', detail: `(${cmd.dx},${cmd.dy})×${cmd.frames}` }
    case 'cameraSnap':
      return { icon: '🎥', label: cmd.to ? `镜头定位 (${cmd.to.col},${cmd.to.row})` : '镜头回正' }
    case 'setEntityAuto':
      return { icon: '🔁', label: `${cmd.entity} 换巡逻脚本`, detail: cmd.stages.length ? `${cmd.stages.length} 段` : '停用' }
    case 'setEntityTrigger':
      return { icon: '🔗', label: `${cmd.entity} 换触发脚本`, detail: cmd.stages.length ? `${cmd.stages.length} 段` : '停用' }
    case 'setEntityTriggerMode':
      return { icon: '🔗', label: `${cmd.entity} 触发方式`, detail: cmd.on ? `${cmd.on}${cmd.range ?? ''}` : '关闭' }
    case 'unmigrated':
      return { icon: '⚠', label: `未翻译 op 0x${cmd.opcode.toString(16)}`, detail: cmd.note, warn: true }
  }
}

function CommandRow(props: { cmd: Command; locale: Locale; depth: number }) {
  const { cmd, locale, depth } = props
  const d = describe(cmd, locale)
  return (
    <>
      <div className={`cmd-row${d.warn ? ' warn' : ''}`} style={{ paddingLeft: 8 + depth * 16 }}>
        <span className="cmd-ico">{d.icon}</span>
        <span className="cmd-label">{d.label}</span>
        {d.detail ? <span className="cmd-detail">{d.detail}</span> : null}
      </div>
      {d.blocks?.map((b, i) => (
        <div key={i}>
          <div className="cmd-block-title" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>{b.title}</div>
          {b.body.map((c, j) => (
            <CommandRow key={j} cmd={c} locale={locale} depth={depth + 2} />
          ))}
        </div>
      ))}
    </>
  )
}

/** 渲染一组 stages（触发段/进场段）。多段时显示段号 + next 转移语义。 */
export function ScriptTree(props: { stages: readonly ScriptStage[]; locale: Locale }) {
  const { stages, locale } = props
  if (stages.length === 0) return <div className="script-empty">（空脚本）</div>
  return (
    <div className="script-tree">
      {stages.map((st, i) => (
        <div key={i} className="stage">
          {stages.length > 1 ? (
            <div className="stage-head">
              第 {i + 1} 段
              <span className="stage-next">
                {st.next === 'advance' ? '→ 跑完推进下一段' : typeof st.next === 'number' ? `→ 跑完回第 ${st.next + 1} 段` : '→ 跑完停在本段'}
              </span>
            </div>
          ) : null}
          {st.body.length === 0 ? (
            <div className="script-empty" style={{ paddingLeft: 24 }}>（空段）</div>
          ) : (
            st.body.map((c, j) => <CommandRow key={j} cmd={c} locale={locale} depth={0} />)
          )}
        </div>
      ))}
    </div>
  )
}
