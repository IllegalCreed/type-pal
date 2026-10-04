# CODE-QUALITY-3d - pal-extract indexed PNG 输入边界

Status: done
Phase: phase1 pal-extract
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `ea0ba6c97`

## 目标与范围

`encodeIndexedPng` 对尺寸、pixels 和 opaque 输入建立显式合同：非法/截断输入失败，完整合法帧 PNG 字节和 alpha 语义不变。

- 范围内：`packages/pal-extract/src/resources/sprite.ts`、同域边界测试、治理账本/本卡。
- 范围外：PNG 编码库、调色板/像素语义、`data/extracted`、runtime/UI、其它 parser。

## 前提真值门

- 一句话前提：PNG 编码循环写入 `width * height` 个像素；pixels/opaque 缺位不应被 `Uint8Array` 的 undefined→0 强制转换静默吞掉。
- 直接证据：`packages/pal-extract/src/resources/sprite.ts:26-42`；生产 callers `cli.ts:619,851`、`parsers/rng-frames.ts:33`、`parsers/ball.ts:42`、`parsers/rgm.ts:48`；相邻 `sprite.glm-runtime-resource.test.ts`。
- 当前二阶段：N/A；仅第一阶段提取器纯编码边界。
- before → after：`短/非法 PNG 输入静默补零 -> 入口显式抛错；合法输出不变`。
- 反证：任一真实 raw PNG digest 或合法 indexed/alpha fixture 改变即 rework；不以生成物重写掩盖。

## 上下文锚点

- `CLAUDE.md:31-38`：提取链修上游、生成物不可单点修改。
- `packages/shared/src/rle.ts`：opaque=0 与 palette-0 的分离合同。
- 不得重新引入：无界尺寸分配、透明 mask 静默补零、改变 PNG 的 indexed RGB/alpha 形态。

## 验收条件

- 功能：非正整数/零尺寸、pixels 短、opaque 短显式失败；完整输入保持现有 PNG/alpha。
- 测试：定向边界、pal-extract 全包、全仓 check、official ratchet、protected fast、lint；CODE-QUALITY-3c 的 runner 证据独立登记。
- 视觉/E2E：N/A（编码字节/alpha 合同，无 UI 形态变化）。

## 当前模式推进记录

- Codex 前提核验：verified；修改白名单仅 sprite.ts、专属边界测试与治理文档。
- build 准入：Codex build allowed。
- 独立验收：accept；实现、定向、全仓 check、support-mode ratchet、protected fast、lint 均通过；editor runner 差额由 CODE-QUALITY-3c 闭合。

## Build / Review

- 实现：尺寸、pixels、opaque 入口合同显式失败；合法 indexed RGB/alpha 不变。
- 定向：sprite 边界 + runtime resource + sprite 基础 9/9；pal-extract 全包 69 files / 419 tests；typecheck 通过。
- 反控：临时移除 guard 后 malformed tests 失败；生产文件已恢复。
- 全仓：`pnpm check` 通过（pal-extract 419、editor 605/4844、migrate 95/723、lint 3197 文件零诊断）。
- Coverage：Q3d 单包达到 1044/1507 statements、441/563 branches、922/1332 lines；support-mode ratchet/protected fast 已通过，未降门槛。
- Review：Codex 确认实现范围和 caller 保真；accept。

## 交接日志

- 2026-10-05 Codex：直接读取 encoder 与全部生产 callers，确认短输入会静默补零且没有合法 caller 依赖；Next: 增加独立 malformed 反例并实现最小入口校验。
- 2026-10-05 Codex：实现 guard 与专属边界测试，负控失败；全仓 check/lint 通过。Q3d 留 review/rework，等待 CODE-QUALITY-3c 的 coverage runner 门，不把单包提升冒充全仓 ratchet/protected closure。
- 2026-10-05 Codex：Q3c 闭合后重跑 support-mode ratchet/protected fast，Q3d 质量门通过；PNG 合法输出/alpha 合同保持。Next: 归档 Q3d。

## 下一位 Agent 提示词

无；本批由 Codex 继续实现与独立验收。
