# GLM 编辑器 UI 十二模块 · Codex 独立集成回执

任务卡：[TEST-GLM-EDITOR-UI-WAVE-1](../../ops/archive/tasks/done/TEST-GLM-EDITOR-UI-WAVE-1-twelve-surfaces.md)。
贡献者 GLM，隔离候选 `codex/glm-editor-ui-wave-r1@071a39d8`；
R1/R2 历史 counter 见[首轮](../glm-editor-ui-wave-codex-review.md)与
[二轮](../glm-editor-ui-wave-codex-r2-review.md)。GLM 自验不是独立第三方证明。

## 独立验收

- U1–U3 的正式 blank 项目经 loader、当前结构/引用/保存门；U4b 的合法对话
  `legalStages` 作为真实组件实参并进入 `playback.play` 断言，回放控制器
  仍是明确手写桩，只计局部委派。U4a 实传同工程 catalog/maps/tilesets/
  assetReader/assetBase；真实 `useSceneAssets` 完成准备，pointer 命中回调
  在 ready 绘制路径生成的实体命中区之后发生。G2 残项闭合，不把局部测试
  夸成完整试玩工作流。
- 两张隔离截图经 Codex 直看：精灵 12 帧/预览和场景素材可见，无首轮
  缺失资产的加载失败横幅。仅为最小可加载视觉证据，非全地图、布局审美、
  E2E 或音画录制验收；沿用二轮已登记的临时图 SHA，不重复占用用户 6010。
- 直接复跑 U4 **6/6**、十二文件 **39/39**、editor typecheck exit0、
  14代码文件 Biome **0 error/warning/info**、`pnpm check:docs` PASS；
  `ui-wave-mutants.mjs wave` 判据自测10类、绿对照及四针精确钉名
  `AssertionError` 业务红均通过。候选相对合并基点仅测试/fixture/回执/导航，
  产品、旧测试、脚本与官方配置零 diff。

## 最新主线统一门

合并候选至最新主线的集成提交 `4fb03a57`；串行 `pnpm check` exit0：
全仓 **10,104** 项，严格 lint 扫描 **2,369** 文件零 error/warning/info。
随后 `pnpm coverage:ratchet` exit0，再以
`TYPE_PAL_COVERAGE_BASE_REF=b1755f77 pnpm coverage:fast` 单次受保护
严格复核 exit0。两次 fast 同为 **9,643** 项/730生产文件；全仓分支
**47,325/63,323（74.74%）**。本测试包相对合并前净增 **216** 个已覆盖
分支、分母不变；editor **21,229→21,445/28,416**，其它六包基线不变。

这是本地 fast 与独立测试接收结果，不等于远端 CI、full、Q1/Q2 或用户
可见产品变更验收。本卡按当前模式由 Codex 核定 done；历史 counter 原文保留。
