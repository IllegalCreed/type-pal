# TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — Reforge host lifecycle contract wave

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / host lifecycle
Visual Verification Timing: mixed
Base: `origin/main` `12247f7e3`（r1 初版基 `70a56f6bc` 的外来 e2e 混入按 Codex 返工令剔除）
Branch: `codex/glm-reforge-host-lifecycle-r2`

## Codex build allowed（dispatch 2026-10-04）

前卡 [TEST-COVERAGE85-GLM-REFORGE-1](TEST-COVERAGE85-GLM-REFORGE-1.md) 诚实收口于 80.49%，本卡为
后续专项窄波：只攻 host lifecycle 六轴，不做覆盖率百分比承诺。

独占范围（dispatch 指定重点核验）：

- `src/main.ts:477-600`（启动视频序列、标题菜单决策、AsyncIntentController、awaitRunner 单次结算）
- `src/main.ts:914-942`（commitSceneSwitch 场景 BGM 三态、switchScene 世界失效门）
- `src/main.ts:2090-2184`（host.wait/teleportParty/loadScene 事务、entry reveal、cleanup 恢复）
- `src/script-runner-core.ts`、`src/script-runner.ts`、`src/script-host-adapter.ts` 全文。

关注轴：启动/取消、promise 只结算一次、场景替换、存档入口、continuation cursor、signal、
host capability 缺席、后台错误恢复。

明确不在范围：battle-session private state、`__rf*`/`__tp*` debug 口、新增产品观察接口、
覆盖率百分比达标。

## 白名单

只允许新增本卡测试（`*.host-lifecycle-1.test.ts`）、合法 typed fixture、本卡证据脚本与
`docs/ops/evidence/TEST-GLM-REFORGE-HOST-LIFECYCLE-1/`。不得修改产品、旧测、配置、baseline、
真实 PAL 数据或共享文档；禁反射私有状态、业务核心 mock、强转、skip/ignore、扩大 timeout。

每条合同记录 source:line、公开 caller、合法输入、业务 oracle、唯一 fullName；反控按
原始绿→指定业务红→恢复绿 + 唯一 AssertionError + raw/JSON + exit + 四态 hash + clean-tree +
mkdtemp 清理交付。不标 done，等 Codex 独立验收。

## 排重与不可达账（build 期核验，2026-10-04）

- 既有覆盖（不重复）：H5/H6 存档与场景竞态（main.save-flows/main.scene-flows）、H1 标题入口选择
  （main.boot-flows）、H2 读档浏览器（opening-menu.flows，runOpeningMenu 直测）、auto-save 波的
  F5/F9 剧情取消（main.auto-save-flows / main.auto-pose-authority）、gate/settlement 门族
  （script-runner-core.gates.glm-q）、adapter 命令分发既有族（script-host-adapter.*）。
- 本卡新增不与之重叠：bootGame 级标题读档入口（bootLoadSlot 全链无测试）、视频启动/取消窗口、
  gameOver 读最近档/无档重开、场景 music null、ScriptRunner 12 个未分发命令 kind、
  续跑控制帧（confirm/startBattle/teleportOut）、autoMotionCheckpoint 公开合同、
  setCheckpointReady 空帧门、帧深 256、setEntityPos 显式 height、setSceneOnEnter 既有槽。
- 不可达臂登记（证据见证据目录 README U 节）：core L305/442/445/448/451（author 校验前置拒绝，
  content/src/author-script-core.ts:737-767）、L175/L595（compilerVersion 为 literal 3 类型，
  合法 typed 值无法过期）、L553/L573/575（validateScriptContinuation 前置拒绝）、L328/L366/L540
  （稠密编译产物/帧栈不变量防御）、L370 B43#1（叶子命令恒为带 kind 对象）、main L937/L2116
  （world 为 const + replaceWorld 原地变更，引用恒等）、L520（DEV 观察臂测试环境恒真）、
  L533（菜单只回传注入的 items id）、L535#1（shouldPlayEntryIntro('menu-entry') 字面量恒真）、
  L478 入口臂（派发前 await 窗口各自带 abort 检查）、L2092 ?? 臂（host.wait 调用方全部显式传
  signal）。

## GLM 交付回执（r1，2026-10-04，待 Codex 独立验收）

（交付时回填）
