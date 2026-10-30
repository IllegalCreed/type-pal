# CODE2 MKF 两文件复审（glm-foundation 批 1）

Status: review（候选待 Codex 据证验收；不改中央 ledger 状态）
Owner: GLM（Coding Owner）；基点 `63735f72fb12f6ca27bb3a3443418dd808b101cf`（origin/codex/code-quality-3y，fetch 后锁定）
范围：`packages/shared/src/mkf.ts`、`packages/shared/src/mkf.boundaries.test.ts`。开工核对：看板无他人 MKF Owner、四个已登记 worktree 无该路径未提交修改。

## 短回执

- **改动**：仅注释 4 处（mkf.ts 3 + boundaries 头部引用 1），零实现/fixture/断言/标题变化。body-invariance：两文件去注释打印 AST 与基点字节一致（titles 13/13 不变）。
- **验证**：定向 `mkf.boundaries + rng.test + rng.boundaries` 3 文件 34/34（0 fail/skip/pending，dual reporter 原件 [directed.json](directed.json)）；scoped biome 0/0/0；`git diff --check` 干净；scoped docs check 见下。未跑全仓/coverage/protected（按 foundation 准入）。
- **pal-extract 相邻未跑**（登记）：worktree 软链的包级依赖解析回主树（pnpm 相对符号链接），跨包相邻会测到主树旧 shared；本批注释级变更由 body-invariance + shared 内定向覆盖。后续需要 extract 相邻的批次先做 worktree 离线安装或修链接。

## 八维结论

| 维 | mkf.ts（55→73 行） | mkf.boundaries.test.ts（101 行） |
|---|---|---|
| A | 边界完备：<4/%4/count<0/表截断/单调/界内/readChunk 整数与范围全部显式失败；u32 头下 count 天然有界（firstOffset≤byteLength）；无状态、输出 plane 新建或借用视图。计数公式与 sdlpal `(first−4)>>2` 逐字一致（本批核 palcommon.c:855-886/916-936）；TS 为 fail-loud 加固（sdlpal 信任式），CODE2 期 raw 2,373 chunks 全通过记录支持不误伤原盘。无新直接缺陷。 | 11 例逐例核输入/oracle：手算 offsets 独立 oracle；负例单轴（<4、%4、0、表截断）；子数组 byteOffset 合同；NaN/0.5/±越界同错误模板成组断言（同族合同，合规）。空 chunk 长度 0 合同在。 |
| B | 本批修复 3 处：①模块头补"与 sdlpal 差异"（信任式 vs fail-loud，原盘可通过）②`Mkf` 两字段补语义（buffer 借用不修改；offsets 已验证单调界内）③`readChunk` 补借用视图/索引守卫/offset 合同归属 docblock（原先该知识只在测试头）。 | 头部 `mkf.ts:1-5` 行号引用随实现注释增加漂移 → 改"mkf.ts 模块头"（去脆弱行号）。L100"不绕过真实入口伪造 Mkf"与实现侧新 docblock 呼应，保留。 |
| C | 纯函数；offsets 唯一写入 Owner=openMkf，readChunk/chunkCount 只读 ✓。 | 按入口分 describe；fixture 局部；无全局状态。 |
| D | 唯一实现经 barrel + extract `io/mkf` re-export 复用（本批核 caller：cli.ts 14 处 openMkf/readChunk 族、parsers/{player-roles,rix,items,sounds}、io/sss、shared/rng 子档、game tileset-blob 仅注释引用）；无重复知识。 | mkMkf fixture 为 test-only 构造器，与 pal-extract io/mkf.test.ts 手造 fixture 分属两树入口合同，保留。 |
| E | 可测性无障碍。 | L60-73 一例含 outside+descending 两断言（同"表非法整体拒绝"合同族、各自独立 fixture），保留不拆：拆分身份扰动成本 > 收益；登记为可选精度候选。其余逐例原子。 |
| F | 命名/控制流清楚。 | 同。 |
| G | 无死代码/死导出（chunkCount/readChunk/openMkf 全有生产 caller）；i=0 重读 offsets[0] 保持循环统一，非冗余问题。 | 每 helper 在用。 |
| H | 纯字节、确定性 ✓。 | 直接可构造反例 ✓。 |

## 问题与登记

- 无新的已证缺陷/结构问题。观察（登记不动）：①L60-73 双轴一例（见 E 行）②pal-extract `io/mkf.test.ts` 与本文件在 count/readChunk 基本轴上跨树重复（不同入口合同，保留；归 O-4 类跨文件排重候选）。
- ledger 建议（Codex 裁定）：`mkf.ts`/`mkf.boundaries.test.ts` 维持既有登记（CODE-QUALITY-2 历史核验 + 本批 B 维补齐），不因本批升 closed。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 63735f72f..HEAD -- packages/shared/src/mkf.ts packages/shared/src/mkf.boundaries.test.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 63735f72fb12f6ca27bb3a3443418dd808b101cf packages/shared/src/mkf.ts packages/shared/src/mkf.boundaries.test.ts
cd "$WT/packages/shared" && ../../node_modules/.bin/vitest run src/mkf.boundaries.test.ts src/rng.test.ts src/rng.boundaries.test.ts
```

失效条件：mkf.ts/boundaries 实现或断言变化 → body-invariance/34 身份重出；worktree 基点后 3y 对这两文件有新提交 → rebase 重证；vitest/biome/ts 版本变化 → 证明重跑。


## Codex阶段1接收说明（2026-10-18）

有限文案/身份保持证据已接收，非整文件或整卡八维accept；作者历史原文与native保持。集成注释纠正、证据适用范围及旧撤回状态校正见[阶段终验](../codex-stage1.json)。仅原生JSON支持计数/身份；本批未附的console/scoped静态原始输出保留作者自报层级，不写成独立零诊断。
