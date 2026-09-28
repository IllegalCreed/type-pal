// TEST-KIMI-EDITOR-WORKFLOWS-1 批B 注入针清单（判据见 counter-control/README.md）。
// find 串精确唯一；control 针先于注入针建立同文件集的执行数基线。
const A = 'packages/editor/src'

export const injections = [
  // ── 控制针 ──────────────────────────────────────────────
  {
    label: 'control-k05-image',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/ImageTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k06-cutscene',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/CutsceneTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k07-audio',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/AudioAssetWorkbench.kimi-workflows.test.tsx`],
    expectFailed: [],
  },
  {
    label: 'control-k08-project',
    control: true,
    target: null,
    find: '',
    replace: '',
    tests: [`${A}/ui/ProjectWorkbenchTab.kimi-workflows.test.tsx`],
    expectFailed: [],
  },

  // ── K05 ──────────────────────────────────────────────────
  {
    // 替换丢失旧 label → 替换链 label 保全断言红。
    label: 'k05-replace-label-dropped',
    target: `${A}/ui/ImageTab.tsx`,
    find: 'prepareAuthoredImage(file, kind, palette?.colors, previous?.label)',
    replace: 'prepareAuthoredImage(file, kind, palette?.colors)',
    tests: [`${A}/ui/ImageTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K05 ImageTab 真实图像工作流 替换链：保留 label 真实换字节、撤销物化旧字节可解码、预览按新 sha 重载',
    ],
  },
  {
    // 拖拽平移方向反转 → scroll 换算断言红。
    label: 'k05-pan-direction-inverted',
    target: `${A}/ui/ImageTab.tsx`,
    find: 'gesture.scrollLeft - (event.clientX - gesture.clientX)',
    replace: 'gesture.scrollLeft + (event.clientX - gesture.clientX)',
    tests: [`${A}/ui/ImageTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K05 ImageTab 真实图像工作流 预览 viewer：fit 几何、键盘/滚轮/工具条缩放与拖拽平移真实合同',
    ],
  },

  // ── K06 ──────────────────────────────────────────────────
  {
    // 乱序帧队列不再保序 → TPFS 帧序断言红。
    label: 'k06-queue-order-dropped',
    target: `${A}/ui/CutsceneTab.tsx`,
    find: 'decodeFrameImages(pendingFrames.files, { preserveOrder: true })',
    replace: 'decodeFrameImages(pendingFrames.files)',
    tests: [`${A}/ui/CutsceneTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K06 CutsceneTab 真实过场工作流 帧队列乱序输入自然排序、按钮重排与排除后真实创建：TPFS 帧序等于队列序且 undo/redo 对称',
    ],
  },
  {
    // 删除时实时引用不再阻断（命令层单点）→ 在途引用拒绝断言红。
    label: 'k06-delete-in-use-bypassed',
    target: `${A}/core/asset-commands.ts`,
    find: 'if (references.length) throw new AssetInUseError(this.assetId, references)',
    replace: 'if (false) throw new AssetInUseError(this.assetId, references)',
    tests: [`${A}/ui/CutsceneTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K06 CutsceneTab 真实过场工作流 删除在途期间实时引用出现则真实拒绝；解除后真实删除且 undo 字节级还原',
    ],
  },

  // ── K07 ──────────────────────────────────────────────────
  {
    // 同字节重复导入不再派生 -2 后缀 → 碰撞断言红。
    label: 'k07-music-id-collision',
    target: `${A}/ui/MusicTab.tsx`,
    find: 'if (!catalog.assets[base]) return base',
    replace: 'return base',
    tests: [`${A}/ui/AudioAssetWorkbench.kimi-workflows.test.tsx`],
    expectFailed: [
      'K07 MusicTab 真实 wrapper 策略连接 同字节重复导入分配 -2 后缀 id；非法扩展名与坏魔数零提交且选择保全',
    ],
  },
  {
    // 删除/替换预读丢失 previousBytes → 在途失败用例的退出见证红（实际唯一命中）。
    label: 'k07-previous-bytes-dropped',
    target: `${A}/ui/AudioAssetWorkbench.tsx`,
    find: '      const previousBytes = await reader.readBytes(targetId, strategy.kind)',
    replace: '      const previousBytes = undefined as unknown as ArrayBuffer',
    tests: [`${A}/ui/AudioAssetWorkbench.kimi-workflows.test.tsx`],
    expectFailed: [
      'K07 SoundTab 真实 wrapper 与 WAV transport 所有权 删除在途磁盘读取失败：错误身份透传、对话框保持开启、选择/记录保全、取消收尾',
    ],
  },

  // ── K08 ──────────────────────────────────────────────────
  {
    // patchEntry 丢弃 patch → 入口编辑/队伍/库存/新增入口四例同区域红（实测失败集合）。
    label: 'k08-entry-patch-dropped',
    target: `${A}/ui/ProjectWorkbenchTab.tsx`,
    find: 'entry.id === id ? { ...entry, ...patch } : entry',
    replace: 'entry.id === id ? { ...entry } : entry',
    tests: [`${A}/ui/ProjectWorkbenchTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K08 ProjectWorkbenchTab 项目页真实业务工作流 entrypoint 页标签、起始场景与入口视频经 SetStartupEntriesCommand 原子提交，undo/redo 对称且全程过保存门',
      'K08 ProjectWorkbenchTab 项目页真实业务工作流 初始道具与世界资源行在合法项目下增删改：行内切换、数量与资源值编辑均过保存门',
      'K08 ProjectWorkbenchTab 项目页真实业务工作流 初始队伍与金钱在合法项目下编辑：金钱、种子 HP、开局状态弹窗、移出与重新加入均单命令可撤销',
      'K08 ProjectWorkbenchTab 项目页真实业务工作流 新增入口默认深拷直接启动入口且数据隔离；删除选中入口后回选直接启动入口并通知 focus',
    ],
  },
  {
    // derived 问题列表被掏空 → advanced 页真实问题呈现断言红。
    label: 'k08-derived-issues-emptied',
    target: `${A}/ui/ConnectedEditorPages.tsx`,
    find: 'issues={derivedData?.projectIssues ?? []}',
    replace: 'issues={[]}',
    tests: [`${A}/ui/ProjectWorkbenchTab.kimi-workflows.test.tsx`],
    expectFailed: [
      'K08 ProjectWorkbenchTab 项目页真实业务工作流 ConnectedProjectWorkbench 真实调用域：derived 发布驱动诊断态，编辑偏航即 stale，failed 显示上一版',
    ],
  },
]
