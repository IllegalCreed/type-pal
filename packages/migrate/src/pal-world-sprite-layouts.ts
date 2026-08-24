import type { SpriteLayout } from '@type-pal/content'

/**
 * 仅用于 PAL 迁移边界的逐项审计覆盖。
 *
 * 这些条目无法仅凭 0x65/0x1A 的资源号确定脚本所需布局；部分还同时有 scene 布局证据。
 * 每项都钉住实际物理帧数和出处；新增条目必须经数据审计，禁止按编号、标签或帧数推广。
 */
export interface PalWorldSpriteLayoutOverlay {
  spriteNum: number
  layout: SpriteLayout
  expectedFrameCount: number
  usage: string
  evidence: string
}

/**
 * 场景实体可以复用角色已登记 SpriteDef 的逐项视觉等价审计。
 *
 * semanticId 只指稳定视觉定义，不赋予 Actor 身份。每个引用必须有 extracted 场景锚点，
 * 且资源、布局与动作容器严格等价；新增项禁止从 spriteNum 或资源哈希批量推广。
 */
export const PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES = [
  {
    semanticId: 'li-xiaoyao',
    references: [
      { sceneId: 's020', entityId: 'e344' },
      { sceneId: 's172', entityId: 'e2858' },
      { sceneId: 's196', entityId: 'e3343' },
      { sceneId: 's198', entityId: 'e3346' },
      { sceneId: 's203', entityId: 'e3423' },
      { sceneId: 's233', entityId: 'e4197' },
      { sceneId: 's281', entityId: 'e4803' },
    ],
    evidence:
      'scene s020/e344、s172/e2858、s196/e3343、s198/e3346、s203/e3423、s233/e4197、s281/e4803：extracted spriteNum=2、nSpriteFrames=3；归一只复用视觉定义且保持无 actor 绑定',
  },
  {
    semanticId: 'zhao-linger',
    references: [
      { sceneId: 's003', entityId: 'e68' },
      { sceneId: 's016', entityId: 'e221' },
      { sceneId: 's019', entityId: 'e270' },
      { sceneId: 's021', entityId: 'e399' },
      { sceneId: 's034', entityId: 'e572' },
      { sceneId: 's059', entityId: 'e983' },
    ],
    evidence:
      'scene s003/e68、s016/e221、s019/e270、s021/e399、s034/e572、s059/e983：extracted spriteNum=3、nSpriteFrames=3；归一只复用视觉定义且保持无 actor 绑定',
  },
  {
    semanticId: 'lin-yueru',
    references: [
      { sceneId: 's021', entityId: 'e397' },
      { sceneId: 's032', entityId: 'e548' },
      { sceneId: 's039', entityId: 'e633' },
      { sceneId: 's052', entityId: 'e887' },
      { sceneId: 's059', entityId: 'e984' },
      { sceneId: 's081', entityId: 'e1541' },
      { sceneId: 's084', entityId: 'e1614' },
      { sceneId: 's086', entityId: 'e1631' },
      { sceneId: 's089', entityId: 'e1659' },
      { sceneId: 's097', entityId: 'e1786' },
      { sceneId: 's097', entityId: 'e1787' },
      { sceneId: 's115', entityId: 'e2146' },
      { sceneId: 's117', entityId: 'e2154' },
      { sceneId: 's145', entityId: 'e2400' },
      { sceneId: 's145', entityId: 'e2401' },
      { sceneId: 's193', entityId: 'e3332' },
      { sceneId: 's198', entityId: 'e3347' },
      { sceneId: 's199', entityId: 'e3350' },
    ],
    evidence:
      '18 个逐项 extracted 锚点见 references：spriteNum=7、nSpriteFrames=3；归一只复用视觉定义且保持无 actor 绑定',
  },
  {
    semanticId: 'anu',
    references: [
      { sceneId: 's172', entityId: 'e2860' },
      { sceneId: 's182', entityId: 'e2984' },
      { sceneId: 's183', entityId: 'e2993' },
      { sceneId: 's188', entityId: 'e3156' },
      { sceneId: 's201', entityId: 'e3362' },
      { sceneId: 's203', entityId: 'e3426' },
      { sceneId: 's203', entityId: 'e3428' },
      { sceneId: 's215', entityId: 'e3664' },
      { sceneId: 's233', entityId: 'e4196' },
      { sceneId: 's278', entityId: 'e4747' },
      { sceneId: 's281', entityId: 'e4801' },
    ],
    evidence:
      '11 个逐项 extracted 锚点见 references：spriteNum=5、nSpriteFrames=3；归一只复用视觉定义且保持无 actor 绑定',
  },
  {
    semanticId: 'gai-luojiao',
    references: [
      { sceneId: 's083', entityId: 'e1572' },
      { sceneId: 's106', entityId: 'e1979' },
      { sceneId: 's109', entityId: 'e2040' },
      { sceneId: 's110', entityId: 'e2056' },
      { sceneId: 's110', entityId: 'e2058' },
      { sceneId: 's205', entityId: 'e3449' },
      { sceneId: 's215', entityId: 'e3657' },
      { sceneId: 's232', entityId: 'e4192' },
      { sceneId: 's245', entityId: 'e4332' },
    ],
    evidence:
      '9 个逐项 extracted 锚点见 references：spriteNum=26、nSpriteFrames=3；归一只复用视觉定义且保持无 actor 绑定',
  },
] as const

export const PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIAS_IDS: ReadonlySet<string> = new Set(
  PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES.map(({ semanticId }) => semanticId),
)

export const PAL_WORLD_SPRITE_LAYOUT_OVERLAYS = [
  // 物理帧不足 4×3，且脚本用 0x15 gesture 把它们当无方向绝对帧带。
  {
    spriteNum: 236,
    layout: { kind: 'static' },
    expectedFrameCount: 1,
    usage: '李逍遥剧情换装；只使用绝对帧 #0',
    evidence: 'events/all.json:L_6786，随后 0x15 gesture #0',
  },
  {
    spriteNum: 242,
    layout: { kind: 'static' },
    expectedFrameCount: 5,
    usage: '李逍遥剧情动作帧带；场景与脚本统一使用 stable base，绝对帧 #0..#4',
    evidence: 'scene s193/e3331 nSpriteFrames=0；events/all.json:L_7796 后使用 #0..#4',
  },
  {
    spriteNum: 259,
    layout: { kind: 'static' },
    expectedFrameCount: 27,
    usage: '钓竿剧情动作帧带；使用绝对帧 #0..#26',
    evidence: 'events/all.json:L_9952；L_9954..L_10020 使用 #0..#26',
  },
  {
    spriteNum: 273,
    layout: { kind: 'static' },
    expectedFrameCount: 4,
    usage: '李逍遥剧情动作帧带；依次使用绝对帧 #0..#3',
    evidence: 'events/all.json:L_12187，随后 0x15 gesture #0..#3',
  },
  {
    spriteNum: 361,
    layout: { kind: 'static' },
    expectedFrameCount: 5,
    usage: '李逍遥剧情动作帧带；使用绝对帧 #0..#4',
    evidence: 'events/all.json:L_5243/L_24735，随后 0x15 gesture #0..#4',
  },
  {
    spriteNum: 379,
    layout: { kind: 'static' },
    expectedFrameCount: 5,
    usage: '李逍遥剧情动作帧带；场景与脚本统一使用 stable base，绝对帧 #0..#4',
    evidence: 'scene s197/e3345 nSpriteFrames=0；events/all.json:L_13683 后使用 #0..#4',
  },
  {
    spriteNum: 385,
    layout: { kind: 'static' },
    expectedFrameCount: 2,
    usage: '李逍遥剧情动作帧带；使用绝对帧 #0..#1',
    evidence: 'events/all.json:L_14343，随后 0x15 gesture #0..#1',
  },
  {
    spriteNum: 394,
    layout: { kind: 'static' },
    expectedFrameCount: 2,
    usage: '李逍遥剧情动作帧带；使用绝对帧 #0..#1',
    evidence: 'events/all.json:L_12679，随后 0x15 gesture #0..#1',
  },
  {
    spriteNum: 541,
    layout: { kind: 'static' },
    expectedFrameCount: 1,
    usage: '李逍遥乘坐剧情换装；场景与脚本统一使用 stable base，只使用绝对帧 #0',
    evidence: 'scene s266/e4659 nSpriteFrames=0；events/all.json:L_25184/L_25211 使用 #0',
  },
  {
    spriteNum: 550,
    layout: { kind: 'static' },
    expectedFrameCount: 2,
    usage: '李逍遥剧情换装；当前脚本只使用绝对帧 #0',
    evidence: 'events/all.json:L_28302，随后 0x15 gesture #0',
  },
  {
    spriteNum: 627,
    layout: { kind: 'static' },
    expectedFrameCount: 4,
    usage: '李逍遥剧情动作帧带；使用绝对帧 #0..#3',
    evidence: 'events/all.json:L_3614，随后 0x15 gesture #0..#3',
  },
  {
    spriteNum: 630,
    layout: { kind: 'static' },
    expectedFrameCount: 4,
    usage: '李逍遥剧情动作帧带；使用绝对帧 #0..#3',
    evidence: 'events/all.json:L_35317，随后 0x15 gesture #0..#3',
  },
  {
    spriteNum: 631,
    layout: { kind: 'static' },
    expectedFrameCount: 7,
    usage: '李逍遥剧情动作帧带；使用绝对帧 #0..#6',
    evidence: 'events/all.json:L_35340，随后 0x15 gesture #0..#6',
  },
  {
    spriteNum: 632,
    layout: { kind: 'static' },
    expectedFrameCount: 7,
    usage: '李逍遥剧情动作帧带；使用绝对帧 #0..#6',
    evidence: 'events/all.json:L_35359，随后 0x15 gesture #0..#6',
  },

  // 有足够物理容量但本卡没有充分证据重分类：逐项保留既有四向语义，不设通用 fallback。
  // 193/228/232 同时有 static 场景实例；overlay 只固定脚本换装所用的稳定 base，场景
  // 仍保留独立 -f0 定义，避免把本卡范围外的真实双语义资源误合并。
  {
    spriteNum: 193,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 14,
    usage: '李逍遥多处换装；本卡保留既有四向三帧 base 与场景 static 变体',
    evidence: 'events/all.json:L_5 等 0x65；scene s020/s067 另有 nSpriteFrames=0 实例',
  },
  {
    spriteNum: 228,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 20,
    usage: '李逍遥剧情换装；本卡保留既有四向三帧 base 与场景 static 变体',
    evidence: 'events/all.json:L_5985/L_24694；scene s196 另有 nSpriteFrames=0 实例',
  },
  {
    spriteNum: 232,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 64,
    usage: '李逍遥多处换装；本卡保留既有四向三帧 base 与场景 static 变体',
    evidence: 'events/all.json:L_3502 等 0x65；scene s119/s124 另有 nSpriteFrames=0 实例',
  },
  {
    spriteNum: 245,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 13,
    usage: '林月如入队换装；场景明确四向每向三帧，第 13 帧不在本卡猜姿势',
    evidence: 'scene s035/e596、s037/e616、s195/e3337 nSpriteFrames=3；events/all.json:L_8824',
  },
  {
    spriteNum: 521,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 24,
    usage: '李逍遥剧情换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_26368；物理 24 帧，待后续逐项姿势审计',
  },
  {
    spriteNum: 531,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 12,
    usage: '李逍遥队伍换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_33561；物理恰为 4×3',
  },
  {
    spriteNum: 532,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 12,
    usage: '李逍遥队伍换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_24771；物理恰为 4×3',
  },
  {
    spriteNum: 533,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 12,
    usage: '林月如队伍换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_24773；物理恰为 4×3',
  },
  {
    spriteNum: 534,
    layout: { kind: 'directional', framesPerDir: 4 },
    expectedFrameCount: 16,
    usage: '赵灵儿队伍换装；四向每向四帧',
    evidence: 'events/all.json:L_24772 后紧接 L_24774 以 0x1A field64 把赵灵儿 walkFrames 设为 4',
  },
  {
    spriteNum: 538,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 12,
    usage: '李逍遥剧情换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_27799；物理恰为 4×3',
  },
  {
    spriteNum: 563,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 12,
    usage: '李逍遥剧情换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_32748/L_33991；物理恰为 4×3',
  },
  {
    spriteNum: 576,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 13,
    usage: '巫后队伍换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_33562；物理 13 帧，前 12 帧承载四向三帧',
  },
  {
    spriteNum: 607,
    layout: { kind: 'directional', framesPerDir: 3 },
    expectedFrameCount: 12,
    usage: '李逍遥剧情换装；本卡保留既有四向三帧布局',
    evidence: 'events/all.json:L_30477；物理恰为 4×3',
  },
] as const satisfies readonly PalWorldSpriteLayoutOverlay[]

/** C2-PAL 冻结的 13 条虚假 directional/3 债；其中 242/379/541 由场景 static 声明修正。 */
export const PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT = [
  { spriteNum: 236, expectedFrameCount: 1, evidence: 'overlay L_6786' },
  { spriteNum: 242, expectedFrameCount: 5, evidence: 'scene s193/e3331 nSpriteFrames=0' },
  { spriteNum: 273, expectedFrameCount: 4, evidence: 'overlay L_12187' },
  { spriteNum: 361, expectedFrameCount: 5, evidence: 'overlay L_5243/L_24735' },
  { spriteNum: 379, expectedFrameCount: 5, evidence: 'scene s197/e3345 nSpriteFrames=0' },
  { spriteNum: 385, expectedFrameCount: 2, evidence: 'overlay L_14343' },
  { spriteNum: 394, expectedFrameCount: 2, evidence: 'overlay L_12679' },
  { spriteNum: 541, expectedFrameCount: 1, evidence: 'scene s266/e4659 nSpriteFrames=0' },
  { spriteNum: 550, expectedFrameCount: 2, evidence: 'overlay L_28302' },
  { spriteNum: 627, expectedFrameCount: 4, evidence: 'overlay L_3614' },
  { spriteNum: 630, expectedFrameCount: 4, evidence: 'overlay L_35317' },
  { spriteNum: 631, expectedFrameCount: 7, evidence: 'overlay L_35340' },
  { spriteNum: 632, expectedFrameCount: 7, evidence: 'overlay L_35359' },
] as const

function layoutFrameDemand(layout: SpriteLayout): number {
  return layout.kind === 'directional'
    ? layout.framesPerDir * 4
    : layout.kind === 'loop'
      ? layout.frameCount
      : 1
}

export function assertPalWorldSpriteLayoutOverlaySources(frameCounts: readonly number[]): void {
  if (frameCounts.length !== 636)
    throw new Error(`PAL 大世界精灵帧数表期望 636 项，收到 ${frameCounts.length}`)
  const seen = new Set<number>()
  for (const overlay of PAL_WORLD_SPRITE_LAYOUT_OVERLAYS) {
    if (seen.has(overlay.spriteNum))
      throw new Error(`PAL 大世界精灵布局 overlay 重复: ${overlay.spriteNum}`)
    seen.add(overlay.spriteNum)
    const actual = frameCounts[overlay.spriteNum - 1]
    if (actual !== overlay.expectedFrameCount)
      throw new Error(
        `PAL 大世界精灵 ${overlay.spriteNum} 物理帧漂移: overlay 期望 ${overlay.expectedFrameCount}，实际 ${String(actual)}`,
      )
    const demand = layoutFrameDemand(overlay.layout)
    if (demand > actual)
      throw new Error(
        `PAL 大世界精灵 ${overlay.spriteNum} overlay 布局需求 ${demand} 超过物理帧 ${actual}`,
      )
  }
}
