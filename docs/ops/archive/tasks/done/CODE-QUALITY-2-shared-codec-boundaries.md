# CODE-QUALITY-2 - shared MKF / RNG codec 边界治理

Status: done
Phase: phase1 shared codec
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `65dbeba3f`（Q1 已收口候选）

> 当前模式按 [`AGENTS.md`](../../../../../AGENTS.md) 执行。Q1 已归档；本卡只处理 shared 的 MKF/RNG 纯解码边界，
> 不接管 coverage、E2E、迁移生成物或其它包的实现。

## 目标

让 shared MKF 与 RNG 纯解码器在非法容器 offset、截断 payload、surface 越界输入上 fail-closed，保持现有合法
PAL 资源字节结果和空 chunk / YJ2 失败跳过合同不变。

## 范围

- 范围内：`packages/shared/src/mkf.ts`、`packages/shared/src/rng.ts` 及同域 tests；必要时更新机器清单摘要。
- 范围外：`pal-extract`/game caller、原始资源、生成产物、schema/save、用户可见 UI、RLE/YJ2 算法正常路径。
- 明确不做：把原版损坏数据重新解释为合法；改变 `decodeRngFrames` 对空 sub-chunk/YJ2 失败的既有跳过政策；用 timeout/ignore/any 掩盖异常。

## 前提真值门

### 一句话工程前提

MKF/RNG 解码器只接受能够在声明边界内完成的容器和 delta 指令；非法输入必须明确失败，不能让 `subarray` 静默截断或让
`Uint8Array` 对越界写入无声吞掉错误。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_MKFReadChunk` 按 offset 读取，RNG `PAL_RNGBlitToSurface` 按 opcode 推进 surface；原版未给损坏归档恢复合同 | `reference/sdlpal/palcommon.c`；`reference/sdlpal/rngplay.c:139-369` |
| 第一阶段 | shared `openMkf/readChunk` 被 extractor/game 共同消费；`rngBlitDelta` 直接修改 320×200 surface | `packages/shared/src/mkf.ts:10-43`、`packages/shared/src/rng.ts:37-143`；`packages/pal-extract/src/cli.ts:168-170,418-447`；`packages/game/src/shell/rng-player.ts:96-111` |
| 本任务目标 | 合法 offset、opcode 和 surface 结果逐字节不变；非法表/指令在读取或写入前抛出带位置的 Error | 现有 `mkf.boundaries.test.ts`、`rng.boundaries.test.ts`；新增失败合同见本卡验收 |

### 反证与替代解释

- 最强替代解释：PAL 资源可能依赖容器末尾坏 offset 或跨 surface 的历史宽容行为；若真实 raw 资源需要该行为，不能直接收紧。
- 可证伪观察：主树 raw MKF 合法样本在新增检查后任一 chunk digest、RNG 帧像素或 frame index 改变；或现有合法 synthetic vector 被拒绝。
- 已排查替代根因：问题只在 shared codec cursor/offset 解释，不改 runtime 命令分类、提取映射或测试模型；本卡不改生成内容。

### 用户可见偏离

- 是否主动偏离已核真值：N/A（仅拒绝无法完成的非法输入）
- `before -> after`：`损坏容器可能静默截断/越界写 -> 在边界处显式失败`
- 用户裁决：N/A

## 上下文锚点

- `AGENTS.md:11-25,66-84`：单 Owner、零诊断、证据先于方案。
- `CLAUDE.md:25-29,31-38`：第一阶段 codec 以原版数据为真值，纯重构/失败修复分开，不能手改生成物。
- `docs/ops/audits/code-quality-governance.md`：Q2 shared codecs/types 路线与 Q1 收口证据。
- `packages/shared/src/mkf.ts:12-43`、`packages/shared/src/rng.ts:37-143`：生产实现和状态所有权。
- 相关 caller：`packages/pal-extract/src/cli.ts`、`packages/game/src/shell/rng-player.ts`、`packages/game/src/assets/rng-blob-snapshot.test.ts`。

## 验收条件

- MKF：头表截断、offset 表超出 buffer、offset 乱序、chunk start/end 越界均有精确失败；合法空 chunk 与子数组输入保持。
- RNG：每个 opcode 的合法结果保持；缺操作数、缺 literal、skip/write 超出 surface 均抛出；end opcode 仍忽略尾随 payload。
- 测试：shared 全包/typecheck；受影响 game/pal-extract 相邻测试；完整 `pnpm check`、`pnpm coverage:ratchet`、受保护 fast、`pnpm lint`。
- 视觉：N/A。

## 当前模式推进记录

- Codex 范围/前提核验：verified（直接证据与可证伪观察如上）
- Coding Owner / 隔离树：Codex / `/Users/zhangxu/illegal/type-pal-code-quality`
- 修改白名单：`packages/shared/src/mkf.ts`、`packages/shared/src/rng.ts`、同域 tests、此卡、看板/索引、必要 coverage baseline。
- build 准入：Codex build allowed；若合法 raw 资源反证失败语义需要宽容，立即回 draft/blocked。
- 独立验收：pending

## Build / Review / Done

- 实现摘要：MKF 在 offset table 截断、offset 越界或倒序时 fail-closed；非整数 chunk index 明确拒绝。RNG 在每个变长/定长 opcode 读取和写入前检查 payload 与 surface 边界，合法 opcode 结果不变。
- 验证证据：shared 127/127 + typecheck；game RNG/sprite snapshot 18/18；pal-extract RNG/MKF 17/17；真实 raw MKF 15 个文件、2,373 chunks 全部可读，RNG 1,464 帧全量解码；Biome 定向零诊断。
- Codex 独立复核：accept（完整 check、ratchet、protected fast、lint 和真实 raw 对拍均通过）
- 用户验收：N/A（无可见行为选择）
- done 准入：Codex done allowed

## 交接日志

- 2026-10-04 Codex：Q1 完成后读取 shared MKF/RNG 实现、primary source 和所有生产 callers；确认 readChunk 与 rngBlitDelta 存在有界失败缺口。Next: 实现窄边界检查并跑定向回归。
- 2026-10-04 Codex：完成 MKF/RNG 边界实现；真实 raw MKF 15 个文件、2,373 chunks 与 RNG 1,464 帧对拍通过，影响 caller 的 game/pal-extract 相邻测试通过。Next: review 前跑完整质量门。
- 2026-10-04 Codex：完整 `pnpm check`、`pnpm lint`、`pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 全部通过；shared 127/127、game/pal-extract 相邻测试全绿。Q2 完成，Q3 phase1 extract/game 保留为下一窄批。

## 下一位 Agent 提示词

无；本批由 Codex 继续实现与独立验收。
