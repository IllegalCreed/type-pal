# TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 — project persistence, recovery and history contracts

Status: build
Phase: phase2
Capability: editor / project persistence, recovery and history
Coding Owner: GLM
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional
Contributor: GLM
Branch: `codex/glm-editor-persistence-recovery-r1`

> 当前采用 [`AGENTS.md`](../../../AGENTS.md) 的“Codex 分派—贡献者执行—Codex 独立验收”模式。覆盖率、测试数量和通过率都不是本卡的单独完成条件。

## 目标

补齐 Editor 当前 canonical 工程在打开、解析、保存、增量写入、恢复、并发冲突、undo/redo 历史、项目复制和 ZIP 导出边界的高质量合同。每条合同必须走真实 typed project/session/author IO 入口，能证明 bytes、身份、锁、恢复前缀、历史提交或零写拒绝；不修改产品行为和当前 schema。

## 范围

- 范围内:
  - `project-io.ts`、`project-diagnostics.ts`、`project-read-admission.ts`、`project-open-workflows.ts`、`project-save-route.ts`、`project-serialization-boundaries.test.ts`：current manifest/catalog/scene index 双向一致、路径集合、解析/序列化、坏输入 fail-loud、零写 admission；
  - `author-save-plan.ts`、`author-save-prefix.ts`、`author-save-journal.ts`、`author-save-store.ts`、`author-save-conflict.test.ts`、`save-batch-*`：plan cursor、prepared/committed receipt、锁、首存/增量、部分写、恢复/cleanup、外部漂移和权限失败；
  - `editor-history-coordinator.ts`、`editor-history-foundations.ts`、`editor-history-timeline.ts`、`editor-history-paired-workflows.ts`、`edit-session.ts`：跨 main/script/map participant 的原子 dispatch、undo/redo、失败重试、observer 隔离、hydrate/markSaved 非事务边界；
  - `project-copy-source.ts`、`project-copy.test.ts`、`project-transfer-validation.test.ts`、`export-zip.ts`、`file-system-access.ts`、`fsa-copy.ts`：复制/导出路径合法性、目录 traversal、资源 hash/大小/type、空目录、取消和零下载/零写保证；
  - 真实 `Root`/workspace/open/save caller 与相邻 `project-reference`/`asset-reader` 合同，只在旧 fullName/caller/oracle 确实缺口时补组合流；
- 范围外:
  - DataMode/BattleField/Enemy/Item/Poison UI 合同（刚收口的 `TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1`）；
  - 产品 schema、迁移器、共享配置、旧测试、真实 `projects/pal`、浏览器剧情 E2E 和视觉布局；
  - 用私有 history state、数据库直接写入、核心 mock 或固定假 bytes 代替真实 IO/公开 caller。
- 明确不做:
  - 不改产品实现、schema、公开 API 或保存策略；发现真正产品缺陷只写 counter/defect，不夹带修复；
  - 不用 `as unknown as`/`as never`、skip/ignore、扩大 timeout、全局 prune、跨目录真实用户数据或覆盖率数字来完成；
  - 不把“JSON 能 parse”“函数返回 promise”“调用一次 writer”当业务 oracle。

## 前提真值门

### 一句话行为 / 工程前提

Editor 的 canonical 工程保存必须是可验证、可恢复、可重放的事务；本卡只对现有公开持久化/历史入口增加判别性合同，不主动改变写入语义。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：Editor canonical save/history 是 Reforge 新架构，不以旧 PAL 存档格式为实现真值 | `docs/phase2/READ-FIRST.md` 铁律 1–5、10–11 |
| 第一阶段 | 仅作为输入/内容形态参考，不复制第一阶段 save 或菜单实现 | `docs/phase2/reference/phase1-knowledge-harvest.md`；`CLAUDE.md` 仅作旧系统参考 |
| 当前二阶段 | current manifest、author save receipt/plan、workspace identity、history coordinator 和 export/copy 是公开分层 | `packages/editor/src/core/project-io.ts`、`author-save-*`、`editor-history-coordinator.ts`、`export-zip.ts` |
| 本任务目标 | 证明打开/保存/恢复/历史/导出在合法 typed 输入与真实 IO 下的原子结果，零产品改动 | 本卡白名单与验收条件 |

### 反证与替代解释

- 最强替代解释: 失败可能来自 fixture 不满足 current manifest/catalog、临时目录未隔离、fake FSA 不符合公开 capability 或历史合同已存在；先独立核 admission 与 caller。
- 什么观察会推翻当前前提: 合同只能通过直接调用私有 `execute`/数据库或 `as unknown as` 触发，或保存语义本身与任务目标冲突；停止并记 blocked/counter。
- 已排查替代根因:
  - runtime 语义 / 命令分类: 先核 `project-io`、save journal、history coordinator 的边界，不把 IO 错误写成历史 bug；
  - 原版 / 第一阶段理解: 本卡不以原版实现推导 Reforge save；
  - extractor / 地图 / 数据解码: fixture 由当前 loader/serializer 生成，数据供应链问题另卡处理；
  - audit / test model: fullName/caller/input/oracle/零写与恢复 prefix 逐项核验，runtime/collection/pending 红无效。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: 当前 canonical 工程持久化行为 -> 行为不变、失败/恢复/历史边界可反证
- 代表场景: 写到一半断电后只从已验证 prefix 恢复；外部文件漂移拒绝 stale writer；配对命令失败不发布半状态；导出坏资源零下载
- 用户裁决: N/A（测试-only）

## 上下文锚点

- 已拍板决策 / 铁律: `AGENTS.md` 测试少而精、静态门零诊断、单 Owner；`docs/phase2/READ-FIRST.md` 铁律 4/5/10/11；当前 canonical 版本不保留开发期旧兼容。
- 代码锚点(`file:line`): `packages/editor/src/core/project-io.ts`、`project-diagnostics.ts`、`author-save-plan.ts`、`author-save-prefix.ts`、`author-save-journal.ts`、`author-save-store.ts`、`editor-history-coordinator.ts`、`edit-session.ts`、`project-copy-source.ts`、`export-zip.ts`。
- 已知坑 / 审计文档: 归档 `TEST-COVERAGE85-GLM-EDITOR-1` 与 `TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1`；现有 `save-batch-*` 的 receipt/lock/recovery 判例；`docs/phase2/archive/audits/` 的 canonical save/asset closure 审计；不得把旧历史未验证文本当当前证据。
- 不得重新引入: 双读双写/旧版本 fallback、路径 traversal、半提交可见状态、跨 workspace receipt 认领、observer 失败回滚已提交状态、把数组位置当身份、真实用户目录写入。
- 相关测试: `project-io*.test.ts`、`project-diagnostics*.test.ts`、`save-batch-*.test.ts`、`author-save-*.test.ts`、`editor-history-*.test.ts`、`project-copy*.test.ts`、`project-transfer-validation.test.ts`、`export-zip.test.ts`、`project-leave-guard.test.ts`。

## 验收条件

测试任务另核[统一质量标准](../agent-workflow.md)：原子业务合同、合法 typed 输入、真实 caller/oracle、逐轴排重、高判别力反控和隔离；不得仅以通过率/数量/覆盖率 accept。

- 功能:
  - 建立 persistence/history family ledger，逐合同记录 source/caller/input/oracle/fullName/旧测差异；重复、无业务 oracle、不可合法输入必须登记而非凑数；
  - 对保存/恢复合同同时证明磁盘 bytes、manifest identity、receipt/prefix、lock/retry、dirty/history 状态和 zero-write/zero-download 结果；
  - 对 history 合同证明完整 participant atomicity、失败重试、redo 分支清理、observer 可见性和 markSaved/hydrate 非事务边界；
  - 反控必须绿→指定业务红→恢复绿，恰一指定 AssertionError，保留 JSON/raw/exit/signal/spawn、完整 file×fullName 执行集、源/变异/恢复 hash 与 mkdtemp/finally 清理证明；
- 测试:
  - 定向 + 相邻 editor core test；`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`、typecheck；
  - `pnpm lint` error/warning/info 全零、`node scripts/docs/check.mjs`、`git diff --check`；
  - 不设例数或覆盖率门槛，官方覆盖率只在精简后的 main 并集上重算；
- 文档:
  - 证据只放 `docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/`，包含排重账、identity、反控三态、清理和未闭合风险；
- 视觉 / 手工验证: N/A（纯 core IO/history）；若触及用户可见保存提示行为必须停线并交 Codex/用户裁决；
- E2E 用例登记: 不跑剧情/浏览器 E2E；只登记需要端到端 workspace 的入口和停止点，不以 UI 代替字节/事务 oracle。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: GLM / `codex/glm-editor-persistence-recovery-r1` / 仅 `packages/editor` 本卡测试、合法 fixture、专属证据和本卡回执。
- 前提核验: verified（当前 canonical save/history 入口及失败边界已有一手代码锚点；未知输入不得猜测）。
- 范围、设计和验收条件: agree（先排重 existing-proof，再补有业务 oracle 的组合边界）。
- 高风险用户产品裁决: N/A（测试-only，不改 schema/API/产品）
- build 准入结论: Codex build allowed

### 进入 done 前：独立验收

- 贡献者交付与自验: pending（作者证据不代替 Codex）
- Codex 独立复核: pending
- 用户体验/产品验收: N/A（测试-only）
- done 准入结论: blocked；由 Codex 独立复核后决定

## Draft: 设计与风险

### 设计结论

按 project admission/serialization、author save receipt/recovery、history atomicity、copy/export 四族分别排重；测试 fixture 由当前 loader/serializer 和临时 FSA/IDB 生成。反控仅修改产品文件唯一锚点，任何源变动都必须重采对应针，恢复后核 zero dirty/zero staged artifact。

### 已知风险

- 风险: 持久化测试很容易只断言返回值，遗漏磁盘内容、身份或清理残留。
  - 缓解: 每条合同至少包含一个真实 IO 结果和一个拒绝/恢复/历史业务 oracle，并保留精确路径/bytes/hash。
- 风险: 巨大现有测试文件可能让 GLM 重复已有合同。
  - 缓解: 先生成旧 fullName×caller×input×oracle ledger；若一族已饱和，只写 existing-proof，不新增包装测试。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 的 Coding Owner（GLM）。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/phase2/reference/phase1-knowledge-harvest.md、本卡、归档 TEST-COVERAGE85-GLM-EDITOR-1 与 TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1。
只在 codex/glm-editor-persistence-recovery-r1 工作；先对 project-io/project-diagnostics/project-open/read-admission/save-route、author-save-plan/prefix/journal/store/conflict、save-batch-*、editor-history-*、edit-session、project-copy/export-zip/file-system-access 的旧 fullName/caller/input/oracle 排重。
只补真实未证明的 admission/serialization、receipt/prefix/recovery/lock、partial write/foreign drift、history paired atomicity/redo branch、copy/export zero-write/zero-download 合同；不要重复刚收口的 DataMode/BattleField/Enemy/Item/Poison UI 卡，也不要夹带产品或 schema 修复。
只写本卡测试、合法 typed fixture、证据与本卡回执；禁止私有 execute/DB 直写、核心 mock、强转、skip、ignore、扩大 timeout、旧版本 fallback、真实用户目录或共享配置改动。
反控必须绿→指定业务红→恢复绿、恰一业务 AssertionError、完整执行集/hash/清理证明；交付定向/相邻 test、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
