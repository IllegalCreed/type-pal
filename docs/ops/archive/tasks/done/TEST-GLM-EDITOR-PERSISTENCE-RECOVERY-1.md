# TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 — project persistence, recovery and history contracts

Status: done
Phase: phase2
Capability: editor / project persistence, recovery and history
Coding Owner: GLM
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional
Contributor: GLM
Branch: `codex/glm-editor-persistence-recovery-r1`

> 当前采用 [`AGENTS.md`](../../../../../AGENTS.md) 的“Codex 分派—贡献者执行—Codex 独立验收”模式。覆盖率、测试数量和通过率都不是本卡的单独完成条件。

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

测试任务另核[统一质量标准](../../../agent-workflow.md)：原子业务合同、合法 typed 输入、真实 caller/oracle、逐轴排重、高判别力反控和隔离；不得仅以通过率/数量/覆盖率 accept。

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

- 贡献者交付与自验: done（GLM r1 饱和档案已交付推送，见下方 r1 交付记录；作者证据不代替 Codex）
- Codex 独立复核: pending
- 用户体验/产品验收: N/A（测试-only）
- done 准入结论: blocked；由 Codex 独立复核后决定

## r1 交付记录（GLM，2026-10-05，branch `codex/glm-editor-persistence-recovery-r1`，base `53bf97e01` = origin/main）

**交付结论：五族饱和档案，零新增测试、零产品改动。** 按本卡 Draft「若一族已饱和，只写
existing-proof，不新增包装测试」与 AGENTS.md（2026-10-03 测试少而精），本轮不造换包装用例；
证据只放 [`docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/`](../../../evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/README.md)。

### 方法与核心证据

1. **轴级排重**：42 个家族测试文件（project-io*/admission/read-admission/save-route/open-workflows、
   author-save-plan/prefix/journal/store/conflict、save-batch-*、editor-history-*、edit-session、
   project-copy/transfer/zip/fsa-copy/file-system-access/leave-guard + workspace*/open-actions/clone 等）
   逐条清出 fullName×caller×input×oracle（约 900+ 用例）；卡面每个轴都有多条带精确 oracle 的既有合同，
   四个代表场景（prefix 恢复/stale writer 拒/配对失败零发布/导出坏资源零下载）全部有具名证明
   （dedup-ledger.md 第一、二节）。
2. **分支级核验**：19 个范围源文件（卡面族名对应全部真实源码，含 open-actions/workspace-persistence/
   handle-store/author-disk-baseline/load-play-project）三口径 v8 覆盖率：仅家族 46 文件
   （`coverage-family.json`）、全仓 564 文件/4429 测试全绿（`coverage-fullsuite.json`）。
   家族口径 158 个真实 0 计数臂逐类归位：具名既有测试已证的 throw/条件另一侧、消息格式子臂、
   良性回退子臂、防御层（kimi 波/cov85 卡同裁定）、v8 臂序伪影（ledger 第三节分类表）。
3. **候选解剖**：两个深挖候选——首存 0 字节 save-state 占位恢复（journal L516 真分支在
   `resolves interrupted marker publication pending-before` 单测下恰命中 1 次，`[1,57]`）、
   世界精灵资源 ZIP 导出（blank 项目自带 `sprite.generated.starter`，transfer-validation 导出正控
   已整链走通）——均已有证明，不新增。

### 反控申报

本轮零新增断言，无反控注入点。饱和结论的证据=排重账+三口径覆盖率+候选解剖；Codex 复核若指认
任一行号为真实业务缺口，返工按缺口补合同并补齐绿→指定业务红→恢复绿/恰一业务 AssertionError/
执行集/三态 hash/清理证明的完整反控（README「反控申报」节）。

### fresh 执行与质量门（本卡范围）

- 定向+相邻 52 文件 **823/823 全绿**（`directed-fresh.json`：file×fullName×status；复现
  `node docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/run-evidence.mjs`）。
- 全仓（排除两项 main 既有红，见下）4429/4429 全绿；`pnpm --filter @type-pal/editor typecheck` 0 error；
  全仓 `pnpm lint` 3385 files 0/0/0；`node scripts/docs/check.mjs` PASS（本卡 evidence 导航行已登记）；
  `git diff --check` 干净。
- 改动面：仅本证据目录（6 文件）+ 卡面本记录 + evidence/README 导航行；产品/旧测/共享配置/
  baseline/真实 `projects/pal` 零改动。

### main 既有红登记（非本卡引入，worktree 与主 worktree 同提交双验）

- `project-reference.pal.test.ts`：22663 ≠ 22666（PAL 数据漂移 vs 硬编码计数；在干净 main@53bf97e01
  单跑同样红；不属本卡范围，未动）。
- `src/ui/design-system/*` adoption 门在覆盖率负载下 30s 超时漂移（GLM wave L 已登记的已知项）。
- vitest 在存在失败测试时不写 coverage 报告——附录口径因此排除上述两项后取证。

### 未闭合风险 / 移交 Codex

1. `branch-inventory.json`/`coverage-fullsuite.json` 的 0 计数臂未逐臂写独立证明（分类表覆盖代表项
   与分类原则）；Codex 可按行号指认，任何被判真实缺口的臂按反控申报节返工。
2. 产品观察（非缺陷）：`validateProjectZipEntries` 对 `kind:'sprite'` 只做通用 bytes/sha256 校验
   （保存侧 preflight 会整体解码 sprite）——导出=快照、保存=写入门的深度不对称可自洽；如需统一
   深度请裁决，本卡不动产品。
3. 全仓既有 drift（evidence/README、tasks/index 的 after-SHA）沿用 data-battle 卡登记，留 Codex
   集中清理。

## Draft: 设计与风险

### 设计结论

按 project admission/serialization、author save receipt/recovery、history atomicity、copy/export 四族分别排重；测试 fixture 由当前 loader/serializer 和临时 FSA/IDB 生成。反控仅修改产品文件唯一锚点，任何源变动都必须重采对应针，恢复后核 zero dirty/zero staged artifact。

### 已知风险

- 风险: 持久化测试很容易只断言返回值，遗漏磁盘内容、身份或清理残留。
  - 缓解: 每条合同至少包含一个真实 IO 结果和一个拒绝/恢复/历史业务 oracle，并保留精确路径/bytes/hash。
- 风险: 巨大现有测试文件可能让 GLM 重复已有合同。
  - 缓解: 先生成旧 fullName×caller×input×oracle ledger；若一族已饱和，只写 existing-proof，不新增包装测试。

## 下一位 Agent 提示词（覆盖卡内旧提示词）

无下一位 Agent 提示词，等待 Codex 独立验收（验收入口：本卡 r1 交付记录 +
`docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/` 全部 6 文件；复跑
`node docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/run-evidence.mjs`）。
Codex 若按 `branch-inventory.json`/`coverage-fullsuite.json` 行号指认出真实业务缺口，开返工指令
由 GLM 按「反控申报」节补合同与三态反控。

## Codex 独立验收与收口（2026-10-05）

- 独立复跑：directed fresh 52 文件、823/823 全绿；重新执行饱和档案脚本后结果一致。
- 独立质量门：Editor typecheck 通过；集成全仓 lint 3413 files、0/0/0；docs check 0 issues；git diff --check 通过。
- 结论：五族逐 fullName×caller×input×oracle 排重足以证明 existing-proof，本卡不新增弱测；归档为 done。
