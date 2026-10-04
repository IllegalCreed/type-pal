# TEST-GLM-REFORGE-RUNTIME-SESSION-1 — runtime input and frame-session contracts

Status: review
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / runtime session
Branch: `codex/glm-reforge-runtime-session-r1`
Visual Verification Timing: dev-functional

## 目标

核验 Reforge runtime input、frame session 和 project-view 边界的真实公开合同，覆盖输入仲裁、帧推进、取消和 world-view 替换；不以覆盖率或例数作为本卡指标。

## 独占范围

只允许新增 `packages/reforge` 本卡测试、typed fixture 和证据：

- `runtime-input-router.ts`：忙时输入锁、重复/迟到输入、取消后输入丢弃、合法输入的唯一提交；
- `runtime-frame-session.ts`：frame tick、暂停/恢复、完成/取消、迟到回执和重入不重复执行；
- `runtime-project-view.ts` / `world-motion-runtime.ts`：公开 view snapshot、实体离场、scene token 失效和恢复；
- 只走现有公开 coordinator/runner caller，不触碰 private state 或 debug 观察口。

先对照现有 `runtime-input-router.test.ts`、`runtime-frame-session.test.ts`、`runtime-project-view*.test.ts`、`world-motion-runtime*.test.ts` 和已归档 Reforge host-lifecycle 卡排重。

## 硬约束与交付

- 每条合同记录 source:line、公开 caller、合法 typed 输入、业务 oracle、唯一 fullName。
- 禁止修改产品、旧测、配置、baseline、真实数据；禁止私有反射、业务核心 mock、强转、skip、ignore、扩大 timeout。
- 反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/四态 hash、clean-tree 和 mkdtemp 清理证明。
- 交付 identity/family ledger、existing-proof/blocked 账、定向/相邻/typecheck/lint/docs/diff 结果；覆盖率只进入整体 main 账。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Coding Owner / 隔离分支: GLM / `codex/glm-reforge-runtime-session-r1`
- build 准入: Codex build allowed
- GLM 交付回执: r1 已推;Codex counter(typecheck 基线归属);r2 归属核实+重验;
  Codex 裁决授权一行修正;r3 修正+全套重验已推(2026-10-04)
- Codex 独立验收: pending(r3 候选待复验;typecheck counter 已按授权闭合)
- done 准入: blocked

## Codex 验收 counter 与归属核实(r2,2026-10-04)

**counter 原文要点**:15/15 测试、5/5 反控、lint/docs 已过,但 typecheck 失败:
`pal-script-successor-governance.test.ts` 仍引用不存在的
`docs/testing/script-governance/successor-repairs.json`;要求基于当前 origin/main
核对归属,本分支拓扑导致则最小修正,main 既有则在卡内记录 counter、不得 ignore/豁免
掩盖。

**核对方法(一手复现)**:`git worktree add --detach` 纯净检出当前
`origin/main` `6a5675efade246f0332fa9333b0729532a5545d8`(本卡零文件在场),
`pnpm install --frozen-lockfile` 后 `pnpm --filter @type-pal/reforge run typecheck`
→ **exit 2,唯一错误即同址同文 TS2307**。临时工作树已复现后移除。

**根因链(git 一手锚点)**:
- `379304503`(2026-10-03)加入该测试(blob `2fcd7943`),当时 JSON 在旧路径
  (blob `d64b1107`)真实存在,import 合法;
- `4548a895b1ef23e3fd0cd051d9208194be0366ce`(2026-10-04,"docs: finish testing
  layout cleanup",origin/main 祖先)以 R100 把整目录连同该 JSON 移入
  `docs/testing/archive/legacy/batches/script-governance/`,未同步测试 import;
- 测试 blob 自 `379304503` 至 origin/main tip `6a5675efa` 未变;新 tip 提交
  (`6a5675efa` docs governance)不涉 reforge。

**结论**:main 既有缺陷,非本分支拓扑——本卡 diff(`origin/main..HEAD`)不含该
测试与两个 JSON 路径中的任何一个(ls-tree/双向核对),rebase 零冲突。

**处置**:卡面硬约束"禁止修改旧测"在白名单内无该文件 → 本卡不修;未加
ignore/exclude/`@ts-expect-error`/规则降级。单列留 Codex 一行修正(测试 import 改指
archive 路径,或恢复 JSON 原路径);该修复落 main 后本分支 typecheck 即零错误
(本卡文件贡献 0 错误,`grep runtime-session-1|rs1-` 计数为 0)。

**r2 重验(基 `6a5675efa`,换基 rebase 后证据全量重生成)**:定向 15/15;相邻 12
文件 151 绿;全量 reforge 8700/8700(唯一红文件仍是上述基线 import 失败,0 测试
收集);typecheck 全包恰 1 错=基线项,本卡 0 错;全仓 lint 0/0/0(3287 文件);
`pnpm check:docs` 含新增 phase-lore governance 全 PASS;`git diff --check` 干净;
反控 5/5 PASS 重跑确认。

## Counter 闭合(r3,2026-10-04,Codex 裁决授权的一行修正)

**Codex r3 裁决要点**:候选 9a4113f36 的 15/15、5/5、lint/docs 已过;typecheck 失败
即上述 stale import;当前 canonical 文件在
`docs/testing/archive/legacy/batches/script-governance/successor-repairs.json`;
授权"只做最小测试/文档路径修正,不得改产品逻辑、旧测试行为、配置、baseline 或加入
ignore/豁免",并要求重跑 typecheck/定向/lint/docs/diff 后推送新 SHA。

**修正前核对(最新 `origin/main` `0eb936cf34d64bdb4dca1bae84b7843114694734`)**:
该测试 blob 仍为 `2fcd7943`(stale import 未变);canonical JSON 仅存在于 archive
路径且 blob `d64b1107` 与 `379304503` 当年旧路径下的同一 blob(R100 重命名,
内容逐字节一致)→ 改路径即恢复原始行为,非行为变更。`git grep` 全仓仅此一个文件
引用旧目录,一行修正即闭合。

**精确 diff**(恰一行,`packages/reforge/src/pal-script-successor-governance.test.ts:11`):
import 路径 `../../../docs/testing/script-governance/successor-repairs.json` →
`../../../docs/testing/archive/legacy/batches/script-governance/successor-repairs.json`。
未改断言/夹具/配置/baseline,未加 ignore/豁免/规则降级。

**r3 重验(基 `0eb936cf3`,board 冲突按新 main 解后)**:
- `pnpm --filter @type-pal/reforge run typecheck` **exit 0,零错误**;
- 该测试文件自身 31/31 绿(此前 0 收集 → 行为恢复证明:同一 JSON blob、同一测试
  blob,仅路径还原);
- 定向 4 文件 15/15;相邻 12 文件 151 绿;
- 全量 reforge **333/333 文件、8731/8731 测试全绿**(8700 + 恢复加载的 31);
- 全仓 lint 0/0/0(3295 文件);`pnpm check:docs` 与 testing docs PASS;
  `git diff --check` 干净;反控三账在 r3 tip 重生成复跑 5/5 PASS。

## GLM 交付回执(r3,2026-10-04,counter 已按授权闭合,待 Codex 复验)

- 基 `origin/main` `0eb936cf3`(r2 曾基 `6a5675efa`,r1 基 `45d890e4c`,开卡基
  `a2857c123`;四目标源文件与本卡测试在各基间零变化);分支三提交:本卡测试
  `063e8e9a9` + 证据 + r3 一行修正提交(见分支 tip);除 Codex 授权的该一行 import
  路径修正外,产品/旧测/配置/baseline/真实数据零改动。
- **15 条合同 / 4 个专属测试文件**(`*.runtime-session-1.test.ts`):
  - 输入仲裁(1):菜单层完整按键集合原样送达,路由器不预滤、不旁路二次派发。
  - 帧推进/暂停恢复(2):混合截止时间等待到期子集逆向结算(0ms + `>=` 边界、未到期
    不连带);恢复后淡入从 gameplay 时间推进。
  - 取消/迟到回执/scene token(8):在途走位中止来源署名消息 + 注册表清理;预中止
    信号四入口全拒;在途单步中止零续点;同目标重复注册替换接管(同源 + auto 跨类);
    实体 authority 接管清步态/侧避锁;单步 attempted 后与追逐取消后的迟到回执静默;
    scene token 注册时快照 + teardown 失效(含取消先于 authority 释放回执)。
  - world-view 替换(4):hostile onLose 命令体剥离;canonical 缺席实体刷新跳过;
    scratch 可选腿深拷贝;runtimeProjectView 整体替换面。
- 排重账/非合同账/受阻账与四文件既有 62 测试映射见
  [证据 README](../evidence/TEST-GLM-REFORGE-RUNTIME-SESSION-1/README.md);
  候选"对话层方向键""商店吞 F5/F9"按同 caller/同 oracle 判重复不建;
  completePartyMove 旧槽守卫因 settled 幂等墙无公开 oracle 不建;teardown 钩子顺序
  独立合同的变异面在 motion-runtime-wiring.ts(白名单外)已并入 token 合同断言。
- **三账**:identity 15 条、family ledger 15 条(biome 定稿再生成逐字节一致)、
  mutation counterproof **5/5 PASS**(每注入四态 sha256 + console/json raw + 执行集
  分账 + clean-tree + mkdtemp 清理;均以唯一业务 AssertionError 变红)。
- **验证(r3 基重跑,数字见上方 Counter 闭合节)**:定向 15/15;相邻 12 文件 151 绿;
  全量 reforge 333/333 文件、8731/8731 测试;typecheck **exit 0 零错误**;全仓
  lint 0/0/0(3295 文件);check:docs(含 phase-lore governance)PASS;
  `git diff --check` 干净。
- **基线缺陷处置沿革**:r1 披露 → r2 一手归属核实(main 既有,非本卡拓扑,见
  counter 记录)→ r3 按 Codex 裁决授权完成一行 import 路径修正并全量重验。全程未加
  ignore/豁免/规则降级。
- 覆盖率未测、不作为完成条件;未标 done。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-RUNTIME-SESSION-1 的独立验收方（Codex），这是 r3 复验。
先读 docs/ops/tasks/TEST-GLM-REFORGE-RUNTIME-SESSION-1.md 的「Codex 验收 counter
与归属核实」与「Counter 闭合(r3)」节，以及
docs/ops/evidence/TEST-GLM-REFORGE-RUNTIME-SESSION-1/README.md。
候选分支 codex/glm-reforge-runtime-session-r1（基 0eb936cf3；本卡测试 063e8e9a9 +
证据提交 + r3 一行修正提交，见分支 tip）。
r3 修正复核：git diff origin/main..HEAD -- packages/reforge/src/pal-script-successor-governance.test.ts
应恰为一行 import 路径变更（旧目录 → docs/testing/archive/legacy/batches/
script-governance/successor-repairs.json，blob d64b1107 与当年旧路径逐字节一致），
断言/夹具/配置零改动；归属链锚点 379304503 / 4548a895b / blob 2fcd7943 见卡。
门禁复验：pnpm --filter @type-pal/reforge run typecheck（应 exit 0）、该测试自身
31/31、定向 4 文件 15/15、全量 reforge 333 文件 8731 测试、
node packages/reforge/scripts/rs1-identity-status.mjs、rs1-family-ledger.mjs
（再生成零 diff）、rs1-mutation-counterproof.mjs（5 注入全 PASS 且源恢复）、
pnpm lint、pnpm check:docs、git diff --check。
裁决 accept/counter/rework；未验收前不合 main、不标 done。
```
