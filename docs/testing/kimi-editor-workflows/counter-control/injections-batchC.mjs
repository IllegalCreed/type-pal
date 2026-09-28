// TEST-KIMI-EDITOR-WORKFLOWS-1 批C 注入针清单（判据见 counter-control/README.md）。
// find 串精确唯一；control 针先于注入针建立同文件集的执行数基线。
const A = 'packages/editor/src'

export const injections = [
  // ── 控制针 ──────────────────────────────────────────────
  {
    label: 'control-k09-skill',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/SkillTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k09-curve',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/LevelCurveEditor.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k10-item',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/ItemTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k10-effect',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/ItemUseEffectEditor.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k11-enemy',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/EnemyTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k11-team',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/EnemyTeamTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k12-mapmode',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/MapMode.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k12-scenecanvas',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/SceneCanvas.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k12-scenestage',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/scene-stage.kimi-workflows.test.ts`],
    expectFailed: [],
  },

  // ── K09 ──────────────────────────────────────────────────
  {
    // 选中回退方向反转：删中间落前驱而非后继 → 回退断言红。
    label: 'k09-delete-fallback-reversed',
    target: `${A}/ui/SkillTab.tsx`,
    find: 'skills[index + 1] ?? skills[index - 1]',
    replace: 'skills[index - 1] ?? skills[index + 1]',
    tests: [`${A}/ui/SkillTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K09 SkillTab 引用与生命周期工作流 删除选中回退：删中间落到后继、删末尾落到前驱，undo 按原索引还原数组顺序',
    ],
  },
  {
    // commit 重复入史：单次提交落两条命令 → 全文件 undo 步数语义四例红（实测集合）。
    label: 'k09-commit-double-dispatched',
    target: `${A}/ui/LevelCurveEditor.tsx`,
    find: '    session.dispatch(\n      new UpdateActorCommand(actor.id, {\n        battler: { ...actor.battler, leveling: { expTable: next } },\n      }),\n    )',
    replace:
      '    session.dispatch(\n      new UpdateActorCommand(actor.id, {\n        battler: { ...actor.battler, leveling: { expTable: next } },\n      }),\n    )\n    session.dispatch(\n      new UpdateActorCommand(actor.id, {\n        battler: { ...actor.battler, leveling: { expTable: next } },\n      }),\n    )',
    tests: [`${A}/ui/LevelCurveEditor.kimi-workflows.test.tsx`],
    expectFailed: [
      'K09 LevelCurveEditor 曲线绘图交互 拖点调值：在途只动本地草稿，松手单命令入史，undo/redo 对称还原且单拖拽恰一步',
      'K09 LevelCurveEditor 曲线绘图交互 拖点边界：下沿钳 0 触发回落警告、上沿外推扩量程、回拖原值与无移动松手均零提交',
      'K09 LevelCurveEditor 曲线绘图交互 级数改级落到实际数组：加长按末段增量外推、缩短截断、同值与越界草稿零提交',
      'K09 LevelCurveEditor 曲线绘图交互 按增量生成与点选精调提交实际数组；学技能标记渲染与返回入口',
    ],
  },

  // ── K10 ──────────────────────────────────────────────────
  {
    // 关闭使用时不再配对删除私有脚本 → 配对删除与通知断言红。
    label: 'k10-private-script-leftover',
    target: `${A}/ui/ItemTab.tsx`,
    find: 'if (!currentPrivateId || keepsPrivate) {',
    replace: 'if (true) {',
    tests: [`${A}/ui/ItemTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K10 ItemTab 物品页真实业务工作流 关闭使用能力配对删除私有脚本并通知；缺历史协调器时拒绝且双侧零提交',
    ],
  },
  {
    // 场景钩子不再锁定 target → 联动断言红。
    label: 'k10-scene-target-unlocked',
    target: `${A}/ui/ItemUseEffectEditor.tsx`,
    find: "...(needsSceneTarget ? { target: 'scene' as const } : {}),",
    replace: "...(false ? { target: 'scene' as const } : {}),",
    tests: [`${A}/ui/ItemUseEffectEditor.kimi-workflows.test.tsx`],
    expectFailed: [
      'K10 ItemUseEffectEditor 效果链真实会话工作流 独占场景钩子锁定使用目标与仅战斗开关并摘除 battleOnly，退回后复原',
    ],
  },

  // ── K11 ──────────────────────────────────────────────────
  {
    // 新建敌人模板 HP 漂移 → 模板深值断言红。
    label: 'k11-new-enemy-template-drift',
    target: `${A}/ui/EnemyTab.tsx`,
    find: 'health: 50,',
    replace: 'health: 51,',
    tests: [`${A}/ui/EnemyTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K11 EnemyTab 敌定义真实业务工作流 新建敌人：无 enemy profile 战斗精灵时禁用守卫；播种后经 CompositeCommand 落生产模板并递增',
    ],
  },
  {
    // 尾部空槽不再裁剪 → 槽位形态断言红（实测同区域两例）。
    label: 'k11-trailing-slot-kept',
    target: `${A}/ui/EnemyTeamTab.tsx`,
    find: 'next.at(-1) === null',
    replace: 'next.at(-1) === undefined',
    tests: [`${A}/ui/EnemyTeamTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K11 EnemyTeamTab 敌队预制真实业务工作流 槽位选择：空洞保留不挤压、尾部空槽裁剪、汇总与目录标题联动，undo/redo 逐格对称',
      'K11 EnemyTeamTab 敌队预制真实业务工作流 槽位上移/下移按钮真实交换到 session 并通报，首槽上移边界禁用零命令',
    ],
  },

  // ── K12 ──────────────────────────────────────────────────
  {
    // 缩放夹取下限上移 → 「未夹」窗口断言红。
    label: 'k12-zoom-floor-raised',
    target: `${A}/ui/scene-stage.ts`,
    find: 'clamp(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.04, 16)',
    replace: 'clamp(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.05, 16)',
    tests: [`${A}/ui/scene-stage.kimi-workflows.test.ts`],
    expectFailed: ['K12 scene-stage 共享层真实工作流 滚轮光标锚缩放：精数、往返对称与下限夹回'],
  },
  {
    // 指针取消不再清按下态 → 取消后补交落账，取消侧零提交断言红（实测同区域两例）。
    label: 'k12-pointer-cancel-committed',
    target: `${A}/ui/SceneCanvas.tsx`,
    find: '  const onPointerCancel = (): void => {\n    downRef.current = null\n    panDragRef.current = null\n    setDrag(null)',
    replace: '  const onPointerCancel = (): void => {\n    panDragRef.current = null',
    tests: [`${A}/ui/SceneCanvas.kimi-workflows.test.tsx`],
    expectFailed: [
      'K12 SceneCanvas 真实布置画布工作流 默认/命名落点：画布点选、拖动提交到真实命令并可撤销；拖动在途取消零提交',
      'K12 SceneCanvas 真实布置画布工作流 真实解码精灵帧命中 actor 实体：拖动提交 MoveEntityCommand 可撤销，拖动在途取消零提交',
    ],
  },
  {
    // 覆盖确认被绕过直接拒绝 → 弹窗/覆盖/不变分支三例红。
    label: 'k12-overwrite-bypassed',
    target: `${A}/ui/MapMode.tsx`,
    find: 'requestTransformOverwrite(intent)',
    replace: "commitTransform('reject', intent)",
    tests: [`${A}/ui/MapMode.kimi-workflows.test.tsx`],
    expectFailed: [
      'K12 MapMode 真实地图变换工作流 cells 选区→复制→粘贴预览→越界拒绝→冲突弹窗返回调整→覆盖粘贴→undo/redo 全链',
      'K12 MapMode 真实地图变换工作流 预览进行中锁定/隐藏活动层：Enter 提交被 permission 拒绝零写，剪贴板保全且解锁后可提交',
      'K12 MapMode 真实地图变换工作流 键盘全选/删除/不变粘贴与指针取消：计数真实、撤销对称、中断零提交',
    ],
  },
]
