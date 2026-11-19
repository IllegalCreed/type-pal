# MIGRATION-MAP-SOURCE-WORD-DOMAIN-1 — PAL 提取地图的原始字范围

Status: blocked
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

厘清供应链读取 PAL 提取地图 JSON 时对单个半格原始字的接受域。分别保留格式内无符号字的解码、残差审计与地图作者格式合同。

## 范围

实际 Migrate 地图转换、只读审计和 PAL 发布的同一来源字输入。

## 前提与证据

| 维度 | 事实 | 直接证据 |
|---|---|---|
| 原版与提取源 | 一个半格保存一个 32 位无符号字，底层、覆盖层、碰撞与高度各读原位。 | `reference/sdlpal/map.c:234–257,293–298,339–352`；`packages/pal-extract/src/resources/map.ts:35–52` |
| 第一阶段 | 原始位由提取器按 u32 读取，运行时把下、上两个字视作不同半格。 | `packages/shared/src/resources.ts:1–21`；`packages/game/src/present/draw-tilemap.ts:101–134` |
| 当前二阶段 | 供应和只读地图命令解析 JSON 后都走地图审计。转换和审计先截断到 u32，导致原始超范围值双方一起截断。 | `packages/migrate/src/pal-source-io.ts:47–59`；`packages/migrate/scripts/audit-project-maps.mts:8–23`；`packages/migrate/src/project-map-converter.ts:35–46,103–115`；`packages/migrate/src/project-map-audit.ts:73–86,123–134` |
| 本卡目标 | 在地图转换前验证外部来源字，指出受影响的地图、行列及半格。 | 真实审计的一红一绿和直接返回值回执 |

最强替代解释是提取器保证合法，所以不可能影响读取的地图。只读诊断输入将合法 JSON 数字 4294967296 传入实用审计，输出瓦片 0，原字和语义差异两项同为 0。最大合法字 4294967295 仍正确报告残差位。普通原盘提取能否产生这类损坏输入未证实。

## 验收

候选拒绝不属于 0 至 4294967295 的整数输入，保留整个合法范围、从真实入口传播错误。确认变更层级后补拒绝、合法边界和邻近发布反例，先红后绿。只在用户批准后进入产品 build。源 JSON 和 ProjectMap V4 的格式沿用现行[地图存储规范](../../phase2/specs/content-schema.md#地图组合与图像资源分层)。

## 状态与交接

2026-11-20 从 `dc745c12704370975645c0992cf477c4bc8d1da3` 的实际调用复现。定向红例的指定断言失败，合法最大值正控通过。运行原件与复验用例保存在治理窗口证据中。原始字的接受行为维持现行合同，拟议范围校验待裁决。
