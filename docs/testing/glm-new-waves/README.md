# GLM 新增并行 Wave F–J：当前公开合同补测

[冻结目标](targets.json) · [只读校验](verify-targets.mjs) ·
[Wave H Codex r1 审核](codex-review-H-013abf99.md) ·
[Wave H r1 返工验收](codex-accept-H-r1-6a25727c.md) ·
[Wave G Codex r1 审核](codex-review-G-07140f75.md) ·
[Wave G r2 候选验收](codex-accept-G-r2-fd1189a3.md) ·
[Wave F Codex r1 审核](codex-review-F-9b015064.md) ·
[Wave F r2 候选验收](codex-accept-F-r2-c5ecf694.md) ·
[Wave I Codex r1 审核](codex-review-I-2534b72c.md) ·
[Wave I r2 候选验收](codex-accept-I-r2-044d3fa4.md) ·
[Wave J Codex r1 审核](codex-review-J-009c5578.md) · [测试总览](../README.md) ·
[Wave J r2 候选验收](codex-accept-J-r2-acd67499.md) ·
[F](../../ops/tasks/TEST-GLM-NEW-F-1-editor-shell.md) ·
[G](../../ops/tasks/TEST-GLM-NEW-G-1-reforge-host.md) ·
[H](../../ops/tasks/TEST-GLM-NEW-H-1-game-battle.md) ·
[I](../../ops/tasks/TEST-GLM-NEW-I-1-game-shell.md) ·
[J](../../ops/tasks/TEST-GLM-NEW-J-1-migrate-orchestration.md)

交付证据目录：[F](wave-F/README.md) · [G](wave-G/README.md) ·
[I](wave-I/README.md) · [J](wave-J/README.md)。Wave H 证据为
`wave-H/*.json`，无 Markdown 子目录索引。

用户 2026-09-29 明确：先前[大型 A–E 五批](../glm-large-wave/README.md)已经有 GLM 在执行，
**不得重排或抢其工作树**。F–J 是另外五个可由五个 GLM 会话并行领取的 wave；
每 wave 六组/12 个互异生产源，总计新增 60 源，与 A–E 及此前四条已收口队列零交集。
各 wave 写独立测试、fixture、证据、分支和工作树，不读取同伴未接收的结论，不相互 cherry-pick。

## 冻结与覆盖目标的真实口径

- 生产源冻结于 `ced193f4f590c57d25ad2d48e2aa256e4b70a902`；官方 fast 基线
  SHA256 `a682d4e1b970df7c2f5a100ca6a1c8ed9cc23e7a612b7328998949db9fa75b41`，
  当前全仓 49,081/63,398 分支（77.42%）。达 85% 至少要新增 4,808 个命中分支，
  且任何新生产分支会改变分母。**这不是 F–J 的保证增量或每日硬验收门。**
- F–J 是按一份较早的文件级报告选出的高缺口候选；该报告与当前正式基线不完全同日，
  不能把旧报告未命中臂相加当今天的当前缺口，更不能把候选文件总缺口当可达收益。
  `node docs/testing/glm-new-waves/verify-targets.mjs` 只证目标、源码 hash、正式基线和去重，
  不证明合同新颖性。每组先核现行 caller 和所有相邻/跨文件旧断言，必要时登记
  `existing-proof`、`unreachable` 或 `blocked`，不得为覆盖率凑非法路径。
- 新波次与正在执行的 A–E 不共享产品源目标；若 Codex 的 E2E 或其它任务使某源码漂移，
  只暂停受影响组交 Codex 核，其他组继续。绝不自行改 freeze/hash、产品、旧测试或官方基线。

## Wave F — 编辑器主工作台与预览

当前入口见 `packages/editor/src/main.tsx:24–28`；二阶段先读
[`READ-FIRST`](../../phase2/READ-FIRST.md)。只测真实公开 UI/作者动作边界，
不从主壳推断剧情、战斗或已知朝向清除缺陷。浏览器取两条最小功能视觉，
分别是导航/编辑回显、预览或上传失败恢复；自有空闲端口 6091，1440×900/1000×720。

| 组 | 冻结源对 | 可证伪窄合同 |
|---|---|---|
| F01 | `App.tsx` + `ScriptEditor.tsx` | 当前路由/选择→命令编辑回显与取消/undo；与 A/B 的表单及会话断言去重，不冒充完整保存/E2E。 |
| F02 | `PreviewCanvas.tsx` + `FrameAnimationEditor.tsx` | 小资源帧顺序、时间/选择切换及失败态；不生成或改写产品资源。 |
| F03 | `DesignLab.tsx` + `ActorMode.tsx` | 当前设计状态/角色编辑选择与禁用回显；无真实消费入口的展示分支登记未证。 |
| F04 | `BattleSpriteUploader.tsx` + `SpriteFrameWorkbench.tsx` | 合法小字节/尺寸输入、预览及取消零提交；不接资产发布管线。 |
| F05 | `BattleSimulatorWorkbench.tsx` + `battle-trial-launch.ts` | 显式配置到 trial launch 端口和失败释放；不证明战斗机制等价。 |
| F06 | `battle-sprite-commands.ts` + `sprite-commands.ts` | 稳定 ID、输入保真、最小 command undo/redo；不改模型。 |

## Wave G — Reforge 战斗与场景宿主边界

二阶段只测现行调用者/公开端口；涉及战斗公式须先读
[`game-mechanics`](../../phase1/game-mechanics.md)相应条与
[`phase1-knowledge-harvest`](../../phase2/reference/phase1-knowledge-harvest.md)，但不把一阶段模块
结构当二阶段真值。只取一条隔离 battle trial 菜单/错误恢复功能视觉，自有空闲端口 6092；
不进入主场景路线、碰撞或完整战斗 E2E。

| 组 | 冻结源对 | 可证伪窄合同 |
|---|---|---|
| G01 | `battle-session.ts` + `battle-core.ts` | 固定合法战斗输入的公开回合/结算边界及取消保真；不裁决新数值规则。 |
| G02 | `battle-command-selection.ts` + `battle-trial-host.ts` | 当前可选命令、无效选择反馈和 trial host 生命周期；不 mock 核心。 |
| G03 | `assets.ts` + `render.ts` | 资产端口错误、释放和有界渲染结果；不把截图当完整场景证明。 |
| G04 | `entity-motion.ts` + `world-scene-presentation.ts` | 显式 motion/presentation 输入与有限 tick；碰撞/走位语义争议立即停该轴。 |
| G05 | `debug-tools.ts` + `magic-menu-state.ts` | 当前调试选择和魔法菜单状态/不可用项；不改 UX 形态。 |
| G06 | `menu-session.ts` + `screen-fx.ts` | 菜单会话释放与有限屏幕效果时序；不接剧情 E2E。 |

## Wave H — 一阶段战斗当前合同

一阶段测试遵守 [`CLAUDE.md`](../../../CLAUDE.md)、
[`engineering-notes`](../../phase1/engineering-notes.md) 与
[`game-mechanics`](../../phase1/game-mechanics.md)。数值/机制预期必须用一手原始数据或
reference/sdlpal 与一阶段代码核实，不能由被测实现自造 oracle；未核的争议停组。
本 wave 仅纯/有界状态测试，无新增视觉要求。

| 组 | 冻结源对 | 可证伪窄合同 |
|---|---|---|
| H01 | `battle-opcodes.ts` + `battle-system.ts` | 直接证据支撑的 opcode 输入→公开状态/结果，不重做已覆盖的大流程。 |
| H02 | `actions/magic.ts` + `battle-progression.ts` | 合法法术行动与回合推进精确变化；边界数值依一手规则。 |
| H03 | `equip-effect.ts` + `equipment-state.ts` | 装备效果叠加/撤销和当前槽身份保真，不用旧下标猜名字。 |
| H04 | `game-state.ts` + `battle-state.ts` | 当前状态创建/快照/失败不变性，避免私有态替身。 |
| H05 | `actions/attack.ts` + `actions/coop-magic.ts` | 当前可执行攻击/合击目标和结果，直接核对应机制。 |
| H06 | `anim-timeline.ts` + `battle-settlement.ts` | 固定帧/结算顺序和终态，内容观感留 E2E。 |

## Wave I — 一阶段壳层、菜单与呈现

一阶段 UX/资源约定以 [`CLAUDE.md`](../../../CLAUDE.md)、工程经验、现行 game
代码及原始资源为依据。仅一条自有空闲端口 6093 的 dev-panel/菜单功能视觉，
不启动正式通关或重跑 E2E；壳层浏览器/FS 端口替身必须说明能证明的协议。

| 组 | 冻结源对 | 可证伪窄合同 |
|---|---|---|
| I01 | `dev-panel.ts` + `bootstrap.ts` | dev 面板显式控制与启动失败/释放；不加载正式工程或更改一阶段机制。 |
| I02 | `menu-driver.ts` + `event-opcode-player.ts` | 当前菜单输入/返回和公开 opcode 边界，避免重证剧情主线。 |
| I03 | `present.ts` + `dialog-box.ts` | 已核资源/像素或 DOM 输出的最小呈现态；不自创 UX 形态。 |
| I04 | `scene-system.ts` + `menu/magic-script.ts` | 当前场景读取和菜单脚本返回边界，不改事件系统。 |
| I05 | `ending-player.ts` + `rng-player.ts` | 小字节/帧端口时序、取消后释放；不以固定 sleep 证明异步。 |
| I06 | `avi-player.ts` + `splash-fallback.ts` | 可用/不可用资源的降级边界和生命周期，不声称完整过场观看。 |

## Wave J — 迁移编排与发布前校验

当前二阶段迁移只证既有纯结果与**临时目录 dry-run**；原始数据映射预期先核
`data/raw` 或 `reference/sdlpal` 和 [`READ-FIRST`](../../phase2/READ-FIRST.md) 上游原则。
不得运行真实迁移 CLI、extract/bake/publish，不写 `data`、`projects`、正式 baseline；
有真实产品缺陷留隔离红诊断，不给生成产物打补丁。纯/临时 FS 测试不要求视觉。

| 组 | 冻结源对 | 可证伪窄合同 |
|---|---|---|
| J01 | `pal-migration.ts` + `pal-assets.ts` | 显式计划/资源身份与缺失反馈，所有 IO 根限自有 mkdtemp。 |
| J02 | `migrate-content.ts` + `pal-current-publication.ts` | 当前 canonical 输入→计划/发布前校验；不真正发布。 |
| J03 | `translate-event-motion.ts` + `migration-baseline.ts` | 已核原始运动字段映射和 baseline 只读比较；争议停组。 |
| J04 | `migration-project-io.ts` + `legacy-dialog.ts` | 隔离临时项目 IO/对白转换的精确结果，不引旧版兼容政策。 |
| J05 | `migrate-enemies.ts` + `sound-migration.ts` | 合成输入的显式敌人/声音映射和缺失诊断，不冒称原版实测。 |
| J06 | `migration-write-plan.ts` + `pal-derived-content.ts` | 纯计划排序/冲突与当前派生对象保全，不写正式产物。 |

## 所有 wave 的共同验收

1. 各 GLM 只在自己的分支实施；每个冻结源最多一个必要的同目录
   `<stem>.glm-next-wave.test.ts(x)`，专属 fixture 仅本包
   `src/__tests__/glm-next-wave/<wave>/**`；证据/反控仅
   `docs/testing/glm-new-waves/wave-<wave>/**`。共享 README/targets/verifier、任务卡/看板只读。
2. 正控使用现行构造器/guard 和真实公开 API；负输入从合法输入单点变异或公开 unknown 边界进入。
   禁止 `any`、`as never`、双强转、`@ts-ignore`/`@ts-expect-error`、mock 被测核心、私有态读取、
   固定 sleep 充当取消证明；调用前深快照并校完整非空业务结果。
3. 每 wave 自己做约 2–4 枚代表反控，判据隔离：对照 exit0、针恰 exit1 业务红、绝对
   test file/fullName、唯一注入与真实执行数；混错、timeout、skip、零执行、exit2 均 invalid。
4. 只跑本 wave 新增及相邻定向测试（maxWorkers 1）、相关包 typecheck、精确新增文件 Biome
   error/warning/info 全零、docs check、diff check；不与其它 wave 并跑全包或官方 coverage 门。
   视觉只取卡面最小证据，截图存 `/tmp/type-pal-glm-new-wave/<wave>/` 并报 SHA256、URL、
   视口、步骤、预期/实际、console；没有实际看图须标未证。
5. 各 wave 单独提交推送固定完整候选 SHA，交逐组旧证→新增差异、Vitest JSON
   `file/fullName/status`、反控、视觉和未证/真缺陷。GLM 不合 main/标 done；Codex 独立复核、
   与 A–E 去重选择性集成后，串行全仓 check → 官方 ratchet → 受保护 fast；
   **85% 仅按 main 并集严格实测判断，隔离分支百分比不得相加。**
