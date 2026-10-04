# CODE-QUALITY-3g - pal-extract CLI IO 与失败边界

Status: draft
Phase: phase1 pal-extract
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `abb759ceb`

## 目标与范围

逐段核验 `packages/pal-extract/src/cli.ts` 的 raw 输入、输出清理、写盘、异常降级和 round-trip 失败策略；只有有直接 caller/oracle 证据的问题才修复，保持 data/raw、data/extracted 生成物格式和事件数字真值。

- 范围内：CLI 总装入口、文件/目录安全 guard、写盘原子性/失败传播、可选资源降级、全量 round-trip 自检。
- 范围外：已收 Q1–Q3f 的 codec/事件/PNG/symbols 子批、迁移器、runtime/UI、E2E。
- 明确不做：不在 `data/extracted` 或 `projects/pal` 手工补丁；不把覆盖率缺口直接当生产缺陷；不改变资源格式。

## 前提真值门

- Primary/第一阶段：`CLAUDE.md:31-38` 提取物可重生成、原始数据为真；`reference/sdlpal` 只解释读取方式。
- 当前入口证据：`cli.ts:188-206` 清理 guard/共享输入；`:260-290` round-trip/事件写盘；`:299-890` 表、图像、音频、地图、sprite、manifest 全量写盘。
- before → after：`CLI 失败/清理/降级语义分散且候选未核 -> 每个边界有直接 caller、反例和保留理由`
- 最强替代解释：现有 try/catch 是 PAL 原始资源的合法未压缩/空槽降级；若真实 raw 或现有测试证明依赖，保留并登记，不擅改。

## 上下文锚点

- `AGENTS.md` 单 Owner、生成物上游、零诊断和测试质量规则。
- `packages/pal-extract/src/cli.ts` 全量生产 caller；`resources/*` 与 shared codec ledger 条目。
- 不得重新引入：无 guard 的递归删除、输出目录越界、异常吞掉后写伪造 manifest、旧版本 fallback。

## 验收条件

- 逐段文件清点写入账本；未知候选留 review/blocked，不凭静态行数删除。
- 若修代码：定向/相邻、pal-extract 全包、全仓 check、support-mode ratchet、protected fast、lint；若纯审计：记录直接证据与已跑全包/全仓门，不标生产问题已修。
- 视觉/E2E：N/A（纯 CLI/IO；剧情视觉延后）。

## 当前模式推进记录

- Codex 前提核验：verified（范围明确；symbols 子批已收，其余 CLI 仍待证）。
- build 准入：blocked；先完成分段 caller/失败策略 census，发现问题后再单独准入实现。
- 独立验收：pending。

## 交接日志

- 2026-10-05 Codex：CLI 已直接读过并完成 symbols 子批；账本将其余总装 IO/失败策略保留 review。Next: 分段核验清理、写盘、降级与 manifest 的真实调用域。

## 下一位 Agent 提示词

无；当前由 Codex 继续诊断，未获 build 准入前不得修改实现文件或标记 done。
