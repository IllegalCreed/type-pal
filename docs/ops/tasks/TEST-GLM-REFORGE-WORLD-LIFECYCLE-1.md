# TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 — world entity and scene lifecycle contracts

Status: review
Phase: phase2
Capability: reforge / world, entity and scene lifecycle
Coding Owner: GLM
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional
Contributor: GLM
Branch: `codex/glm-reforge-world-lifecycle-r1`

> 当前采用 [`AGENTS.md`](../../../AGENTS.md) 的“Codex 分派—贡献者执行—Codex 独立验收”模式。覆盖率、测试数量和通过率都不是本卡的单独完成条件。

## 目标

补齐 Reforge 世界层从场景准备/切换、实体生成与生命周期、网格移动/动态碰撞、输入路由、延迟触发和异步意图到演出时钟的真实合同。重点不是堆更多运动数字，而是核验生命周期所有权、取消/恢复、场景切换原子性、公开业务回执和跨帧清理；不改变 Reforge 产品架构或用户可见语义。

## 范围

- 范围内:
  - `scene-preparer.ts`、`scene-entry-session.ts`、`scene-switch-transaction.ts`、`scene-transition.ts`、`scene-resources.ts`、`scene-map.ts`、`active-scene.ts`：准备、提交、取消、旧场景隔离、资源失败和恢复；
  - `entity-lifecycle.ts`、`entity-lifecycle-command.ts`、`entity-action-player.ts`、`entity-walk.ts`、`entity-proximity.ts`、`deferred-trigger.ts`：spawn/despawn/hidden/awaiting-exit/reappear、动作 abort、延迟触发一次性语义和公开事件；
  - `entity-motion.ts`、`collision.ts`、`world-motion-runtime.ts`、`world-camera.ts`：多实体 reservation、阻挡/绕行/公平时钟、地形扫描、相同稳定 id、镜头跟随与恢复；
  - `input.ts`、`runtime-input-router.ts`、`async-intent.ts`、`gameplay-clock.ts`、`cutscene-controller.ts`：输入锁/释放、最新意图取消、暂停/恢复、时钟推进和 cutscene dispatch 边界；
  - `main.scene-flows.test.ts`、`main.entity-host-flows.test.ts`、`world-async-commit.test.ts` 等真实 host caller 的跨模块合同，必要时只增加专属合法 fixture；
- 范围外:
  - `packages/reforge/src/battle/` 战斗选择/结算合同（已由已归档 battle-flow 卡处理）；
  - 已完成的 asset resolver/audio/editor authoring 卡、PAL 剧情 E2E、浏览器视觉演出、真实内容工程重迁；
  - 把私有 `state/visual/__rf*` 变成测试 oracle，或将原版隐式全局变量重新带入 Reforge。
- 明确不做:
  - 不修改产品实现、schema、公开 API、旧测、配置、baseline 或 `projects/pal`；
  - 不用 `as unknown as`/`as never`、核心 mock、skip/ignore、扩大 timeout、私有状态读取或自造 world backdoor；
  - 不把同一个 entity 的不同坐标/速度数字包装成多个合同，不因覆盖率缺口强造不可合法输入。

## 前提真值门

### 一句话行为 / 工程前提

Reforge 世界生命周期必须由显式 typed owner 和可取消事务驱动；本卡只为既有公开 API 增加原子合同，不改变架构或用户可见行为。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：Reforge 不以旧引擎实现为架构真值；旧内容仅作输入语义参考 | `docs/phase2/READ-FIRST.md` 铁律 1–7 |
| 第一阶段 | 仅用于理解资产坐标/演出观感，不复制旧生命周期实现 | `docs/phase2/reference/phase1-knowledge-harvest.md` world/motion/scene 段；`CLAUDE.md` 仅作参考 |
| 当前二阶段 | 场景事务、实体生命周期、motion planner、input router、async intent 是当前公开分层 | `packages/reforge/src/scene-*.ts`、`entity-*.ts`、`entity-motion.ts`、`runtime-input-router.ts`、`async-intent.ts` |
| 本任务目标 | 测试现有公开 caller 的 commit/abort/restore/cleanup 业务结果，不改变实现 | 本卡白名单与验收条件 |

### 反证与替代解释

- 最强替代解释: 某个失败可能来自 fixture 破坏 scene/world 所有权、测试时钟未推进或资源缺失，而非产品生命周期缺陷；先用公开 fixture 和真实 host caller 排除。
- 什么观察会推翻当前前提: 只能通过私有状态、`__rf*`、手写 world backdoor 或未定义对象才能触达；登记 blocked/unreachable，不改产品接口。
- 已排查替代根因:
  - runtime 语义 / 命令分类: 先核 scene transaction 与 entity command 的公开边界；
  - 原版 / 第一阶段理解: 不把 sdlpal 状态复制到 Reforge，仅核当前二阶段设计；
  - extractor / 地图 / 数据解码: 测试采用合成合法 ProjectMap/EntityDef，数据问题不冒充生命周期合同；
  - audit / test model: fullName/caller/oracle/取消相位逐条核，collection/runtime/pending 红不计反控。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: Reforge 当前世界事务行为 -> 行为不变、所有权/取消/恢复边界可反证
- 代表场景: 场景切换资源加载失败时旧场景仍可用；动作 abort 后不会继续提交；实体重现只在合法门满足时发生；输入锁释放后最新意图才执行
- 用户裁决: N/A（测试-only）

## 上下文锚点

- 已拍板决策 / 铁律: `AGENTS.md` 测试少而精、零诊断和单一 Owner；`docs/phase2/READ-FIRST.md` 铁律 1–6、8–11；不引入全局槽、隐式跨场景残留和下标身份。
- 代码锚点(`file:line`): `packages/reforge/src/scene-preparer.ts`、`scene-entry-session.ts`、`scene-switch-transaction.ts`、`scene-transition.ts`、`scene-resources.ts`；`entity-lifecycle.ts`、`entity-lifecycle-command.ts`、`entity-action-player.ts`、`entity-motion.ts`、`world-motion-runtime.ts`；`runtime-input-router.ts`、`async-intent.ts`、`cutscene-controller.ts`。
- 已知坑 / 审计文档: [`docs/phase2/reference/phase1-knowledge-harvest.md`](../../phase2/reference/phase1-knowledge-harvest.md) world/scene/motion 段；现有 `world-async-commit.test.ts`、`scene-switch-transaction.test.ts`、`entity-motion.c85-arms.test.ts` 的恢复/公平判例；不得把 visual/presentation 私有状态当业务 oracle。
- 不得重新引入: 旧引擎隐式脚本暂停、`sys:*` 全局变量、数组位置身份、未经清理的 timer/listener、双写事务、真实用户数据和剧情后门。
- 相关测试: `scene-*.test.ts`、`entity-*.test.ts`、`collision.test.ts`、`world-motion-runtime*.test.ts`、`runtime-input-router*.test.ts`、`async-intent.test.ts`、`deferred-trigger.test.ts`、`cutscene-controller*.test.ts`、`main.*scene/entity*.test.ts`。

## 验收条件

测试任务另核[统一质量标准](../agent-workflow.md)：原子业务合同、合法 typed 输入、真实 caller/oracle、逐轴排重、高判别力反控和隔离；不得仅以通过率/数量/覆盖率 accept。

- 功能:
  - 建立 world lifecycle family ledger，逐条写 source/caller/input/oracle/fullName/旧测差异；已有合同只登记 existing-proof，缺合法入口登记 blocked/unreachable；
  - 覆盖场景 prepare→commit、失败→abort、旧资源隔离、实体 lifecycle phase、动作取消、延迟触发、碰撞 reservation、公平排序、输入锁和 async intent 最新值等真实业务轴；
  - 测试必须通过公开 host/runtime caller，断言 committed world、公开事件、资源所有权、清理或恢复结果，不读取私有 visual/debug 状态；
  - 反控必须绿→指定业务红→恢复绿，恰一指定 AssertionError，保留 JSON/raw/exit/signal/spawn、完整执行集、原始/变异/恢复 hash、临时树 finally 清理证明；
- 测试:
  - 定向 + 相邻 world/entity/scene 测试、`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test/typecheck`；
  - `pnpm lint` 0/0/0、`node scripts/docs/check.mjs`、`git diff --check`；
  - 不设例数/覆盖率门槛，质量以合同原子性、判别力和无重复为准；
- 文档:
  - 证据只放 `docs/ops/evidence/TEST-GLM-REFORGE-WORLD-LIFECYCLE-1/`，明确 product untouched、blocked/unreachable 和环境清理；
- 视觉 / 手工验证: 纯功能生命周期，N/A；发现用户可见架构偏离时停线，不自行改产品；
- E2E 用例登记: 不跑剧情 E2E；需要 browser 才能观察的演出仅登记集中 E2E 入口，不把视觉探针计为本卡合同。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: GLM / `codex/glm-reforge-world-lifecycle-r1` / 仅 `packages/reforge` 本卡测试、合法 fixture、专属证据和本卡回执。
- 前提核验: verified（Reforge 当前公开事务/生命周期分层已核；若输入必须越过私有状态则 blocked）。
- 范围、设计和验收条件: agree（先排重和证明合法输入，再补 atomics）。
- 高风险用户产品裁决: N/A（测试-only，不改 schema/API/产品）
- build 准入结论: Codex build allowed

### 进入 done 前：独立验收

- 贡献者交付与自验: r1 已推（2026-10-05，见下方回执；作者证据不代替 Codex）
- Codex 独立复核: pending
- 用户体验/产品验收: N/A（测试-only）
- done 准入结论: blocked；由 Codex 独立复核后决定

## GLM 交付回执（r1，2026-10-05，待 Codex 独立验收）

- 分支/基线: `codex/glm-reforge-world-lifecycle-r1`，基于 `origin/main` `53bf97e01`；business 提交
  `5d1d197a5`（仅 3 个新增测试文件，产品/schema/API/旧测/config/baseline/真实数据零 diff）。
- 排重结论: 四家族逐轴排重（[dedup-ledger.md](../evidence/TEST-GLM-REFORGE-WORLD-LIFECYCLE-1/dedup-ledger.md)）。
  卡面轴中 prepare-commit-abort、旧场景隔离、entity phase/reappear、动作 abort、reservation/fairness、
  输入锁、最新意图取消均 existing-proof，不重复堆叠；仅补 4 条真实未证明合同：
  - DT-CLEAR-1: `DeferredTouchTrigger.clear()` 原子复位 claim+deliveryFence（caller main.ts:4408 teardown）；
  - DT-FIRE-DROP-1: drain fire 失败按 'dropped' 收口且不设围栏（模块公开状态机；main.ts wiring 同步窗
    内自带复检，不宣称 host 当前可自然触达，见 identity.json 可达性注记）；
  - AI-CAPTURE-1: `AsyncIntentController.capture()` 只读快照（caller main.ts:931-932/1168/1902）；
  - GC-REGRESS-1: GameplayClock realNow 回退钳 0 + gameplayNow 单调（实测修正真值：恢复帧自重锚点
    起算受 100ms 钳，非放宽断言）。
- unreachable 登记: `SceneResources.map()` LRU `oldest === id` 保护分支（插入序下不可触达，防御）。
- 反控: 4/4 针 VALID——每针红相位 exit 1、恰 1 指定业务 AssertionError（防 `-t` 零匹配假绿守卫）、
  git 字节还原（sha256 原始=恢复）、还原绿、final-replay 4/4；四态 raw + 逐针原始/变异/恢复 hash +
  mkdtemp 临时树 finally 移除证明见 [counterproof.json](../evidence/TEST-GLM-REFORGE-WORLD-LIFECYCLE-1/counterproof.json)。
- 门: 定向+相邻 38 文件 356/356（adjacent.raw）；`tsc --noEmit` 0 错；全仓 lint 3385 文件 0/0/0；
  `check:docs` PASS；`git diff --check` 干净。覆盖率/例数未设门槛；不标 done。
- 判例: vitest4 `-t` 含 ASCII 括号零匹配全 skipped exit 0；GameplayClock 回退重锚真值；biome
  format/organizeImports 修正证据脚本后反控整体重跑（回执由最终字节产生）。

## Draft: 设计与风险

### 设计结论

按 scene transaction、entity lifecycle、motion/collision、input/async 四族分别排重，尽量使用真实 host fixture；每个注入点只杀一个公开业务合同，恢复阶段复跑原套件并检查所有产品文件 clean。对跨族组合只在确有独立状态转换和业务 oracle 时保留。

### 已知风险

- 风险: motion/entity 测试容易只断言坐标或调用次数，无法证明所有权/清理。
  - 缓解: 必须断言公开 commit/abort/restore、实体 phase、事件、资源 ownership 或后续可继续运行。
- 风险: async/cutscene 测试被 fake timer 或 pending promise 污染。
  - 缓解: 明确 clock 推进和 finally 清理，拒收 pending/collection/runtime 红；不把 timeout 放宽当修复。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/reference/phase1-knowledge-harvest.md、本卡及已归档 Reforge host/runtime/scene/entity 卡。
只在 codex/glm-reforge-world-lifecycle-r1 工作；先对 scene-preparer/entry-session/switch-transaction/transition/resources、entity-lifecycle/action-player/walk/motion/proximity、collision/world-motion-runtime、runtime-input-router/async-intent/deferred-trigger/gameplay-clock/cutscene-controller 的旧 fullName/caller/input/oracle 排重。
只补真实未证明的 prepare-commit-abort、旧场景隔离、entity phase/reappear、动作 abort、deferred trigger、reservation/fairness、输入锁和最新 async intent 合同；不要重复 battle-flow/asset/audio 卡。
只写本卡测试、合法 typed fixture、证据与本卡回执；禁止改产品/schema/API/旧测/config/baseline/真实数据，禁止私有 state、__rf*、核心 mock、强转、skip、ignore、扩大 timeout 或剧情后门。
反控必须绿→指定业务红→恢复绿、恰一业务 AssertionError、完整执行集/hash/清理证明；交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
