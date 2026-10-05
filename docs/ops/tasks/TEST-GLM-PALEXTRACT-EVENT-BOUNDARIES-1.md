# TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 — event codec and resource parser boundary audit

Status: build
Phase: phase1
Capability: pal-extract / event codec and resource parser boundaries
Coding Owner: GLM
Reviewer: Codex（独立验收）
Contributor: GLM
Branch: `codex/glm-palextract-event-boundaries-r1`
Visual Verification Timing: N/A

## 目标

对 `pal-extract` 中事件反汇编/重编译/切片/注释及少量资源解析边界做一次逐分支审计，只补仍有真实业务判别力且能从公开 typed 输入到达的合同。重点是 round-trip 字节不变量、label/operand 语义、跨 scene/global 可达性和坏输入 fail-loud；不为了抬 coverage 触碰真实原始资源或 CLI 进程入口。

## 范围

- 范围内：`src/events/annotate.ts`、`disasm.ts`、`recompile.ts`、`slice.ts`、`roundtrip.ts`；`src/resources/scene.ts`、`src/resources/parsers/player-roles.ts` 的公开 parser 边界。
- 必读既有证明：Kimi R1 的 `annotate/disasm/roundtrip/slice` 测试与 ledger、R06/R04 runtime-resource 测试、`scene.test.ts`、`player-roles` boundary/parser 测试；逐 fullName×caller×input×oracle 排重。
- 明确不做：`src/cli.ts`、`scripts/extract-videos.ts` 以及任何真实 `data/raw`/`data/extracted` 写入。已有证据证明 spawn 子进程执行不归因 V8 coverage；不得用进程内 import、真实提取或改配置伪造覆盖。
- 不改产品、旧测试、配置、baseline、真实数据、共享文档；禁止强转、skip、ignore、扩 timeout、恒真断言和 raw 非法输入冒充业务合同。

## 验收条件

- 先交逐分支 ledger：每个候选标 `NEW / existing-proof / unreachable / blocked / product-counter`，附 source:line、公开 caller、合法 typed 输入、业务 oracle、旧 fullName 差异。
- 只保留真实新合同，例如：具名 opcode raw fallback 的合法 operand 形态、recompile unsupported op 的明确边界、scene 末段/越界对象、player-roles 合法 chunk/名称缺省；已被 Kimi/R06/R04 证明的邻位轴不得换数字重测。
- 任何新增测试必须有真实业务 oracle；反控为绿→指定业务红→恢复绿，恰一 AssertionError，保留 JSON/raw/exit/执行集/原始-变异-恢复 hash/临时树清理。
- 定向/相邻测试、pal-extract typecheck、全仓 `pnpm lint` 0/0/0、docs check、`git diff --check` 通过。覆盖率和新增例数不是本卡门槛。
- 若审计后无合法新合同，提交饱和档案并明确不新增测试，不得为了数字造例。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、本卡、coverage85-kimi-extract-migrate-r1 证据及所有 Kimi/R06/R04 event/resource 测试。
只在 codex/glm-palextract-event-boundaries-r1 工作。先做 src/events/annotate.ts、disasm.ts、recompile.ts、slice.ts、roundtrip.ts、resources/scene.ts、parsers/player-roles.ts 的 source:line×公开caller×合法输入×业务oracle×fullName 排重账。
重点审计 round-trip 字节、label/operand、global/scene BFS、末场景/缺对象、合法 parser chunk/name 边界；CLI.ts、extract-videos.ts 和真实 data/raw/extracted 提取入口已有子进程零覆盖归因，禁止用真实写盘或进程内 import 凑覆盖。
只写本卡测试、合法 fixture、证据与回执；禁止产品/旧测/config/baseline/真实数据改动，禁止强转、skip、ignore、扩 timeout、恒真断言。新增针必须绿→指定业务红→恢复绿、恰一业务 AssertionError、完整执行集/hash/清理证明；无新合同就交饱和档案。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。覆盖率/例数不是完成条件，不得标 done，等待 Codex 独立验收。
```
