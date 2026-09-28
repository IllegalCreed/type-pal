// TEST-KIMI-EDITOR-WORKFLOWS-1 批A 注入针清单（判据见 counter-control/README.md）。
// find 串必须精确唯一；control 针先于注入针建立同文件集的执行数基线。
const A = 'packages/editor/src'

export const injections = [
  // ── 控制针（无注入，必须全绿）──────────────────────────────
  {
    label: 'control-k01-library',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/BattleSpriteLibrary.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k01-preview',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/BattleSpriteInlinePreview.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k02-library',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/WorldSpriteLibrary.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k02-viewer',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/SpriteResourceViewer.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k03-action-editor',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/SpriteActionEditor.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k03-behavior',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/core/world-sprite-behavior.kimi-workflows.test.ts`],
    expectFailed: [],
  },
  {
    label: 'control-k04-tileset',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/TilesetTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },

  // ── K01 ──────────────────────────────────────────────────
  {
    // alive 归属闸失效 → 迟到 A 覆盖已切换的 B → 归属断言红。
    label: 'k01-alive-guard',
    target: `${A}/ui/BattleSpriteInlinePreview.tsx`,
    find: '.then(([sprite, palette]) => {\n        if (!alive) return\n',
    replace: '.then(([sprite, palette]) => {\n',
    tests: [`${A}/ui/BattleSpriteInlinePreview.kimi-workflows.test.tsx`],
    expectFailed: ['K01 BattleSpriteInlinePreview 异步归属 迟到解码结果不得覆盖已切换的新选择'],
  },
  {
    // 缩帧修复事务被掏空 → 命令层拒绝 → 删除用例的放行侧断言红。
    label: 'k01-shrink-repairs-dropped',
    target: `${A}/ui/BattleSpriteLibrary.tsx`,
    find: '              repairs: deletionPlan?.repairs ?? {},',
    replace: '              repairs: {},',
    tests: [`${A}/ui/BattleSpriteLibrary.kimi-workflows.test.tsx`],
    expectFailed: [
      'K01 BattleSpriteLibrary 真实源帧工作流 删除原始帧走敌人分段 ABI 修复事务；确认取消零提交',
    ],
  },

  // ── K02 ──────────────────────────────────────────────────
  {
    // 四向默认帧数 floor→ceil → 6 帧资产得出 2/向 → 命令层真实拒绝 → proof 绑定断言红。
    label: 'k02-framesperdir-ceil',
    target: `${A}/ui/WorldSpriteLibrary.tsx`,
    find: 'Math.floor(actualFrameCount / 4)',
    replace: 'Math.ceil(actualFrameCount / 4)',
    tests: [`${A}/ui/WorldSpriteLibrary.kimi-workflows.test.tsx`],
    expectFailed: [
      'K02 WorldSpriteLibrary 真实资源 proof 工作流 proof 绑定真实帧数：解码在途时编辑禁用；新增四向用途默认帧数取 floor(实际帧数/4)',
    ],
  },
  {
    // 追加丢掉既有帧 → 缩帧缺修复被命令拒绝 → 追加用例红。
    label: 'k02-append-drops-existing',
    target: `${A}/ui/SpriteResourceViewer.tsx`,
    find:
      'await commitFrames([...loaded.sprite.frames, ...appended], `追加源帧 ×$' +
      '{appended.length}`)',
    replace: 'await commitFrames([...appended], `追加源帧 ×$' + '{appended.length}`)',
    tests: [`${A}/ui/SpriteResourceViewer.kimi-workflows.test.tsx`],
    expectFailed: [
      'K02 SpriteResourceViewer 真实帧编辑工作流 追加源帧：真实量化编码入库、共享用途逐字段保全、reader 重读 14 帧、undo/redo 对称',
    ],
  },

  // ── K03 ──────────────────────────────────────────────────
  {
    // 删除 confirm 闸失效 → 取消侧零提交断言红。
    label: 'k03-delete-confirm-bypassed',
    target: `${A}/ui/SpriteActionEditor.tsx`,
    find: 'if (!window.confirm(`删除预制动作“$' + '{action.label}”（$' + '{actionId}）？`)) return',
    replace: 'if (false) return',
    tests: [`${A}/ui/SpriteActionEditor.kimi-workflows.test.tsx`],
    expectFailed: [
      'K03 SpriteActionEditor 合法动作 pose 工作流 删除动作：confirm 取消零提交；确认后剩余 order 重排并逐个删空为 undefined，undo/redo 对称',
    ],
  },
  {
    // 相同帧序实例合并计数失效 → instanceCount=2 摘要断言红。
    label: 'k03-instance-count-not-merged',
    target: `${A}/core/world-sprite-behavior.ts`,
    find: '      group.instanceCount++',
    replace: '      group.instanceCount = group.instanceCount',
    tests: [`${A}/core/world-sprite-behavior.kimi-workflows.test.ts`],
    expectFailed: [
      'K03 collectSpriteAutomaticScriptBehaviorsForResource 同资产多定义分组、相同帧序跨实例合并计数，directional 定义聚合落 unavailable，混合资产拒绝',
    ],
  },
  {
    // 采样预算截断披露失效 → bounded note 断言红。
    label: 'k03-bounded-note-dropped',
    target: `${A}/core/world-sprite-behavior.ts`,
    find: '    if (tick === MAX_VISUAL_SAMPLE_TICKS - 1) bounded = true',
    replace: '    if (tick === -1) bounded = true',
    tests: [`${A}/core/world-sprite-behavior.kimi-workflows.test.ts`],
    expectFailed: [
      'K03 describeSpriteReferenceBehavior 引用归属边界 chance 采样超 48 tick 预算：披露截断且仍报代表性 variants，不伪装唯一循环',
    ],
  },

  // ── K04 ──────────────────────────────────────────────────
  {
    // 分页夹取失效 → 缩减后页码越界 → 分页断言红。
    label: 'k04-page-clamp-dropped',
    target: `${A}/ui/TilesetTab.tsx`,
    find: 'const safePage = Math.min(page, pageCount - 1)',
    replace: 'const safePage = page',
    tests: [`${A}/ui/TilesetTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K04 TilesetTab 真实图集工作流 向导分页：超页帧数导航、改瓦宽缩减夹回首页，取消上传零提交且选中保持',
    ],
  },
  {
    // 地图越界引用判定放宽（仅 maps 分支单点）→ 越界面板不出现 → fail-closed 断言红。
    label: 'k04-oob-map-guard-opened',
    target: `${A}/ui/TilesetTab.tsx`,
    find: 'const maxTileId = fact.maxTileIdByTileset[tilesetId] ?? -1\n      if (!replacementTilesetIds.has(tilesetId) || maxTileId < quantized.length) return []',
    replace:
      'const maxTileId = fact.maxTileIdByTileset[tilesetId] ?? -1\n      if (!replacementTilesetIds.has(tilesetId) || maxTileId <= quantized.length) return []',
    tests: [`${A}/ui/TilesetTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K04 TilesetTab 真实图集工作流 替换：越界缩帧面板与提交双重 fail-closed；增帧正控真实换字节可撤销',
    ],
  },
  {
    // 替换竞态守卫失效 → 改写后提交不再拒绝 → 竞态用例红。
    label: 'k04-replace-race-guard-dropped',
    target: `${A}/ui/TilesetTab.tsx`,
    find: "        if (\n          liveTarget?.asset !== capturedAsset ||\n          liveRecord?.kind !== 'tileset' ||\n          liveRecord.sha256 !== previousBytesSha256\n        )\n          throw new Error('待替换瓦片集或源资源已变化；请重新选择文件。')",
    replace:
      "        if (false)\n          throw new Error('待替换瓦片集或源资源已变化；请重新选择文件。')",
    tests: [`${A}/ui/TilesetTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K04 TilesetTab 真实图集工作流 替换竞态：读取在途时源资源被改写则 fail-closed 保留草稿，重试正控成功',
    ],
  },
]
