/**
 * 指令目录(opcode 库,2026-07-05 作者定义:「能查询都有哪些可用的 opcode」)。
 * 单一真源手册:kind / 名 / 参数 / 语义 / 原版 opcode 对照(源自 content/script.ts 注释考证)。
 * TODO(重构):EventMode 插入菜单与 ScriptTree 标签逐步迁移到本目录驱动。
 */
import type { Command } from '@type-pal/content'

export interface CatalogEntry {
  kind: Command['kind']
  icon: string
  name: string
  group: '演出/对话' | '流程/存档' | '队伍/场景' | '实体' | '世界状态' | '音频/战斗配置' | '走位/相机' | '战斗/商店' | '控制流'
  /** 参数名: 说明。 */
  params: [string, string][]
  desc: string
  /** 原版 opcode 对照(无 = clean 新增)。 */
  origin?: string
}

export const COMMAND_CATALOG: CatalogEntry[] = [
  // 演出/对话
  { kind: 'dialog', icon: '💬', name: '对话', group: '演出/对话', params: [['line.speaker', '说话人(缺省旁白)'], ['line.text', '正文(locale 键或字面量)'], ['line.speed', '打字速度 ms/字'], ['line.autoMs', '尾停顿自动翻页']], desc: '弹对话框逐字打印,按键翻页。', origin: '0xFFFF 文本系' },
  { kind: 'clearDialog', icon: '🧹', name: '清对话框', group: '演出/对话', params: [], desc: '立即清掉对话框(含立绘)。', origin: '0x05 redrawScreen 语义核' },
  { kind: 'fade', icon: '🌓', name: '淡入/淡出', group: '演出/对话', params: [['dir', 'in 淡入 / out 淡出'], ['ms', '时长'], ['color', 'black/red(战败红)']], desc: '整屏渐变;演出转场。', origin: '0x3A/0x3B 系' },
  { kind: 'wait', icon: '⏱', name: '等待', group: '演出/对话', params: [['ms', '毫秒']], desc: '脚本暂停 N 毫秒。', origin: '0x0A 系延时' },
  // 流程/存档
  { kind: 'loadLastSave', icon: '📂', name: '读最近档', group: '流程/存档', params: [], desc: '读时间最新的存档(auto/quick/manual);无档重开。', origin: '0x4E' },
  { kind: 'gameOver', icon: '💀', name: '战败流程', group: '流程/存档', params: [], desc: '渐红 +「胜败乃兵家常事也」+ 读最近档。', origin: 'GameOver 枢纽段' },
  // 队伍/场景
  { kind: 'teleportParty', icon: '📍', name: '队伍瞬移', group: '队伍/场景', params: [['pos', '目标格'], ['facing', '朝向(可选)']], desc: '场景内瞬移(不换场景)。', origin: '0x46' },
  { kind: 'loadScene', icon: '🚪', name: '切场景', group: '队伍/场景', params: [['scene', '目标场景 id'], ['pos', '落点(缺省=目标进场点)'], ['facing', '朝向']], desc: '门传送/剧情转场。', origin: '0x59(+0x46+0x50 折叠)' },
  { kind: 'setPartyFacing', icon: '🧭', name: '队伍转向', group: '队伍/场景', params: [['facing', '四向'], ['gesture', '姿势帧(0=站立)'], ['member', '队员序(0=队长)']], desc: '转向 + 可选脚本姿势(演出用)。', origin: '0x15' },
  // 实体
  { kind: 'setEntityState', icon: '👁', name: '实体显隐/状态', group: '实体', params: [['entity', '实体 id'], ['state', '≤0 隐藏 / 1 可走 / ≥2 挡路']], desc: '控制在场与碰撞;宝箱开盖/尸体消失等。', origin: '0x49' },
  { kind: 'setEntityFacing', icon: '🧭', name: '实体转向', group: '实体', params: [['entity', '实体 id'], ['facing', '四向']], desc: 'NPC 转身。', origin: '0x0F/0x16' },
  { kind: 'setEntityFrame', icon: '🖼', name: '实体定帧', group: '实体', params: [['entity', '实体 id'], ['frame', '帧偏移']], desc: '演出定格(宝箱开盖帧等);覆盖优先于行走帧。', origin: '0x14/0x0F' },
  { kind: 'setActorSprite', icon: '👤', name: '换角色精灵', group: '实体', params: [['actor', '角色 id'], ['sprite', '精灵 id']], desc: '大世界换装(练武/疯跑);持续到下次显式切换。', origin: '0x65' },
  { kind: 'vanishEntity', icon: '💨', name: '实体消失重现', group: '实体', params: [['entity', '实体(缺省=触发者)'], ['seconds', '重现秒数(缺省不重现)']], desc: '野怪战败重生窗;临时态不进存档。', origin: 'B8 拆解' },
  // 世界状态
  { kind: 'giveItem', icon: '🎁', name: '给物品', group: '世界状态', params: [['itemId', '物品 id'], ['count', '数量(缺省 1)']], desc: '入背包。', origin: '0x27' },
  { kind: 'loseItem', icon: '➖', name: '收物品', group: '世界状态', params: [['itemId', '物品 id'], ['count', '数量']], desc: '从背包扣除。', origin: '0x26' },
  { kind: 'giveMoney', icon: '💰', name: '增减钱', group: '世界状态', params: [['delta', '正加负减']], desc: '金钱变动(下限 0)。', origin: '0x22 系' },
  { kind: 'setFlag', icon: '🚩', name: '设 flag', group: '世界状态', params: [['flag', '开关名'], ['value', 'true/false']], desc: '手工剧情开关(迁移内容走 entityState)。' },
  { kind: 'setVar', icon: '🔢', name: '设变量', group: '世界状态', params: [['var', '变量名'], ['value', '数值']], desc: '手工剧情数值。' },
  { kind: 'addVar', icon: '➕', name: '变量增减', group: '世界状态', params: [['var', '变量名'], ['delta', '增量']], desc: '计数器(收集/次数)。' },
  // 音频/战斗配置
  { kind: 'playSound', icon: '🔊', name: '音效', group: '音频/战斗配置', params: [['soundId', '音效号(sounds/<id>.wav)']], desc: '播一发音效。', origin: '0x4D' },
  { kind: 'playMusic', icon: '🎵', name: '音乐', group: '音频/战斗配置', params: [['musicId', '曲号(0=停)']], desc: '切 BGM;进场景槽曲被本指令覆盖。', origin: '0x43' },
  // (overrideSceneBattle 已退役:战场/曲走场景属性 battleFieldId/battleMusicId 或 startBattle 一次性参数,无持久覆写)
  // 走位/相机
  { kind: 'moveEntity', icon: '🚶', name: '实体走到', group: '走位/相机', params: [['entity', '实体 id'], ['to', '目标格'], ['speed', 'slow/normal/fast/run']], desc: '阻塞直线走位。', origin: 'NPCWalkTo 系' },
  { kind: 'stepEntity', icon: '👣', name: '实体单步', group: '走位/相机', params: [['entity', '实体 id'], ['dir', '方向']], desc: '设向+走半格(原版 NPC 步长)。', origin: '0x0B-0x0E' },
  { kind: 'animEntity', icon: '🎞', name: '实体动画帧', group: '走位/相机', params: [['entity', '实体 id']], desc: '只推动画帧不位移(原地踏步/施法感)。', origin: '0x87' },
  { kind: 'nudgeEntity', icon: '↔️', name: '实体像素位移', group: '走位/相机', params: [['entity', '实体 id'], ['dx/dy', '像素']], desc: '瞬时微调(贴合演出)。', origin: '0x7D/0x6C' },
  { kind: 'moveParty', icon: '🚶', name: '队伍走到', group: '走位/相机', params: [['to', '目标格'], ['speed', '速度']], desc: '阻塞队伍走位(演出)。', origin: '0x70/0x7A/0x7B' },
  { kind: 'nudgeParty', icon: '👣', name: '队伍相对步', group: '走位/相机', params: [['dx/dy', '像素(带走姿)']], desc: '楼梯登阶类演出碎步。', origin: '0x6E' },
  { kind: 'chasePlayer', icon: '🏃', name: '追玩家一步', group: '走位/相机', params: [['range', '追逐格半径'], ['speed', '快慢'], ['floating', '穿障']], desc: '放 auto 里=持续追逐(野怪);数据化版本用实体 hostile 字段。', origin: '0x4C 拆解' },
  { kind: 'cameraPan', icon: '🎥', name: '镜头平移', group: '走位/相机', params: [['dx/dy', '每帧位移'], ['frames', '帧数']], desc: '相对平移(阻塞);跨房间演出。⚠ 不许绝对回正打断。', origin: '0x7F' },
  { kind: 'cameraSnap', icon: '🎯', name: '镜头落定', group: '走位/相机', params: [['to', '目标格(缺省=回正跟随)']], desc: '绝对跳到/回正。', origin: '0x7F 形态' },
  // 战斗/商店
  { kind: 'startBattle', icon: '⚔', name: '开战', group: '战斗/商店', params: [['team', '敌队号'], ['onLose', '败后指令(缺省 gameOver)'], ['onFlee', '逃后指令'], ['auto', '全自动(过场战)']], desc: '进战斗;剧情战配 onLose 输了也继续。', origin: '0x30 系' },
  { kind: 'fleeBattle', icon: '🏳', name: '敌逃离', group: '战斗/商店', params: [], desc: '战斗演出:敌人逃走,无奖励结束。', origin: '0x69' },
  { kind: 'endBattle', icon: '🛑', name: '终止战斗', group: '战斗/商店', params: [['result', 'terminate/won/lost']], desc: '脚本裁决战斗结果(林天南撑 7 回合)。', origin: '0x89' },
  { kind: 'openShop', icon: '🏪', name: '商店', group: '战斗/商店', params: [['shop', '商店号'], ['mode', 'buy/sell']], desc: '开买/卖界面。', origin: '0x32 系' },
  { kind: 'teleportOut', icon: '🌀', name: '传送出口', group: '战斗/商店', params: [['onFail', '无出口时指令(「引路蜂不灵」)']], desc: '引路蜂/土灵珠:跑当前场景传送出口脚本;场景没配出口走 onFail。出口本身在场景属性配。', origin: '0x38' },
  { kind: 'confirm', icon: '❓', name: '是/否框', group: '战斗/商店', params: [['onNo', '选「否」的指令']], desc: '二择;「是」继续往下。', origin: '0x0A' },
  // 定位权威(E6b)
  { kind: 'takeEntity', icon: '🔒', name: '接管实体', group: '控制流', params: [['entity', '实体 id']], desc: '显式接管实体定位权威:其 auto 巡逻暂停,位置归本脚本控制(位移指令会隐式接管,此指令用于「先锁再演」的精细控制)。', origin: 'E6 新增' },
  { kind: 'releaseEntity', icon: '🔓', name: '归还实体', group: '控制流', params: [['entity', '实体 id(缺省=全部)']], desc: '演出中途归还实体(恢复 auto 巡逻);脚本结束会自动归还全部,不写也不泄漏。', origin: 'E6 新增' },
  // 载具/挂载(E7)
  { kind: 'mountParty', icon: '🛶', name: '挂载队伍', group: '走位/相机', params: [['entity', '载具实体 id'], ['dx/dy', '偏移(缺省 0=重叠)']], desc: '队伍挂上载具(位置=载具+偏移,每帧跟随);骑乘不迈步。', origin: '0xA1 聚拢语义' },
  { kind: 'unmountParty', icon: '🚶', name: '下载具', group: '走位/相机', params: [], desc: '解除挂载,位置留当下。' },
  { kind: 'setParty', icon: '👥', name: '队伍变更', group: '队伍/场景', params: [['members', '角色模板 id 有序表(站位序)']], desc: '把队伍变成指定阵容:在队保留原实例、reserve 搬回、新人实例化;落选进 reserve 状态不丢(D22)。', origin: '0x75' },
  { kind: 'ride', icon: '⛵', name: '骑行走位', group: '走位/相机', params: [['entity', '载具实体 id'], ['to', '目标格'], ['speed', '速度']], desc: '驱动载具走位,队伍跟随(未挂载自动挂重叠);可连发拼路线。芦苇漂/坐船/骑驴同此契约。', origin: '0x3F/0x44/0x97' },
  // 控制流
  { kind: 'branch', icon: '🔀', name: '条件分支', group: '控制流', params: [['cond', 'flag/var/hasItem/chance/all/any/not…'], ['then', '成立指令'], ['else', '不成立指令']], desc: '结构化条件;可嵌套。', origin: 'jump-on-X 系折叠' },
  { kind: 'setEntityAuto', icon: '🔁', name: '换自动脚本', group: '控制流', params: [['entity', '实体 id'], ['stages', '新段(空=停)']], desc: '运行时切实体巡逻行为。', origin: '0x24' },
  { kind: 'setEntityTrigger', icon: '🔗', name: '换触发脚本', group: '控制流', params: [['entity', '实体 id'], ['stages', '新段']], desc: '运行时切实体触发行为。', origin: '0x25' },
  { kind: 'setEntityTriggerMode', icon: '🎚', name: '触发方式', group: '控制流', params: [['entity', '实体 id'], ['on', 'interact/touch(缺省关)'], ['range', '触发距离']], desc: '开关/改距(演出后启用门等)。', origin: '0x40' },
  { kind: 'unmigrated', icon: '⚠️', name: '未翻译(逃生口)', group: '控制流', params: [['opcode', '原版 op'], ['operands', '原始参数'], ['note', '备注']], desc: '迁移器翻不动的原版 op;结构保留语义未译,引擎打日志跳过 —— 人工改写成上面的指令。' },
]
