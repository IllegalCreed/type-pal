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
- GLM 交付回执: r1 已推;Codex counter(typecheck 基线归属);r2 归属核实+重验已推(2026-10-04)
- Codex 独立验收: counter 中(typecheck 失败已核实为 main 既有缺陷,见下方 counter 记录;等 Codex 对基线修复与本卡候选的裁决)
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

## GLM 交付回执(r2,2026-10-04,响应 Codex typecheck counter,待再验收)

- 基 `origin/main` `6a5675efa`(r1 曾基于 `45d890e4c`,r2 换基 rebase 重放;开卡基
  `a2857c123`;四目标源文件与既有测试在各基间零变化,证据在 r2 基全量重生成);分支
  两提交:测试 `e1d568535` + 证据(见分支 tip);产品/旧测/配置/baseline/真实数据
  零改动。typecheck 基线归属核实见上方 counter 记录(main 既有,非本卡拓扑)。
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
- **验证(r2 基重跑)**:定向 15/15;相邻 12 文件 151 绿;全量 reforge 8700/8700
  (基线 8685+15);typecheck 本卡文件零错误(全包恰 1 错=基线 TS2307,归属见
  counter 记录);全仓 lint 0/0/0(3287 文件);check:docs(含 phase-lore
  governance)PASS;`git diff --check` 干净。
- **基线缺陷披露(非本卡引入)**:`origin/main` 自 `4548a895b` 起
  `pal-script-successor-governance.test.ts` import 已移档的
  `successor-repairs.json` → TS2307 + vitest 收集失败(全量唯一红文件,0 测试)。
  r1 已披露、r2 按 Codex 指令完成一手归属核实(纯净 origin/main 复现 + blob 链),
  结论 main 既有,详见上方 counter 记录;涉旧测修复,留 Codex 处置,本卡未触碰、
  未加任何 ignore/豁免。
- 覆盖率未测、不作为完成条件;未标 done。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-REFORGE-RUNTIME-SESSION-1 的独立验收方（Codex），这是 r2 复验。
先读 docs/ops/tasks/TEST-GLM-REFORGE-RUNTIME-SESSION-1.md 的「Codex 验收 counter
与归属核实」节与 docs/ops/evidence/TEST-GLM-REFORGE-RUNTIME-SESSION-1/README.md。
候选分支 codex/glm-reforge-runtime-session-r1（基 6a5675efa，测试提交 e1d568535 +
证据提交，见分支 tip）。
typecheck counter 的归属核实复核：可按卡内方法重放——git worktree add --detach
<dir> origin/main 后 pnpm install --frozen-lockfile && pnpm --filter @type-pal/reforge
run typecheck，应 exit 2 且唯一 TS2307 同址同文（零本卡文件）；根因链锚点
379304503 / 4548a895b / blob 2fcd7943、d64b1107 见卡。若认可归属 main：本卡候选
其余门禁复验用 rs1-identity-status / rs1-family-ledger（再生成零 diff）/
rs1-mutation-counterproof（5 注入全 PASS 且源恢复）、定向 4 文件与全量 reforge、
pnpm lint、pnpm check:docs、git diff --check；基线一行修正（import 改指
docs/testing/archive/legacy/batches/script-governance/successor-repairs.json 或恢复
原路径）由你在 main 侧落地，落地后本分支 rebase 即 typecheck 零错误。
裁决 accept/counter/rework；未验收前不合 main、不标 done。
```
