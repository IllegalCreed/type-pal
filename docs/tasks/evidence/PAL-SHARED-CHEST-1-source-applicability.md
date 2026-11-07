# 普通宝箱共享后的运行时来源核验

Status: recorded
Owner: Codex
Last reviewed: 2026-11-07
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

来源基点固定为已刊 010 的 `8f6c0033d7351454608f9507067db9dd75dc9c90`。普通宝箱共享的产品提交为 `7fc107553c418c01c6c3e09cb094e573d9d273ca`。用 Git 原件逐字比较 `packages/reforge/src/main.ts`。变更在脚本宿主的导入及自动姿态目标解析，以下四个构造接线范围位置相同，内容相同。

## 来源与输入

| 来源 | SHA-256 |
| --- | --- |
| 固定 010 的完整 main.ts | `ed8224efc4537a60b4a6c8a570ccbed78216604448b6b267024cc2a238f02654` |
| 普通宝箱产品提交的完整 main.ts | `da7ffb6591f607b1950a179c61b2a5d4e0eaa34873f2ed78a699ed3cd39cb42c` |

每段哈希包含声明范围的结尾换行。直接读取固定 Git 文件可复算旧、新两段。

| 稳定 ID 与原行范围 | 锚点 | 段 SHA-256 |
| --- | --- | --- |
| `runtime-active-scene` 407–414 | `const activeScene = new ActiveScene` | `bdc40244fcbd8fbf7ccce65780ba5680225b29b5dfb9b15c0775382450634bdc` |
| `runtime-active-scene` 448–455 | `const cameraSession = new WorldCamera` | `6982fefb35f2d0db8ab8bc11958be1d3d90527a0c4230eccbff17f4f1e3c19b6` |
| `runtime-battle-host` 1242–1261 | `const battleHost = new BattleHost` | `ea81fb2a7b7959ee91d03048c228b8d7def9e1e33e3e043941a8d7f1d10dff8e` |
| `runtime-world-owners` 434–445 | `const motion = new WorldMotionRuntime` | `25aecf8b2d4da3dfb10369d3a718fbdaa41407260f979a8ac55123ac22080abf` |

## 断言与业务 oracle

- 活动场景仍由 `bootGame` 接入 ActiveScene 与 WorldCamera。合法输入为场景准备计划、实时边界回调和运行器的取消信号。资源发布、边界更新、旧等待清理与预取消相机判据各沿原来源。[活动场景报告](../../testing/domains/runtime/scene/active-scene/report.md)
- 战斗宿主仍使用原主壳端口。合法战斗发起输入与该场战斗身份决定准备后读取的实时状态和世界收尾。来源复核针对端口及既有取消与同 continuation 的判据。[战斗宿主报告](../../testing/domains/runtime/battle/battle-host/report.md)
- 移动运行器仍由主壳注入场景与队伍状态。合法场景会话、实体权威和坐标输入驱动提交、接触及继续执行的顺序。生命周期与绘制的所有权、帧和锚点判据沿各自来源。[世界运行时报告](../../testing/domains/runtime/world/world-runtime/report.md)

## 结果

现行三份 report、三份 evidence 和 catalog 对应项同步这四条来源的完整文件指纹。每组历史追加一次，并记录该组完整的旧引用。行范围、原作者角色、业务判据和其它源引用以固定 010 原件逐值校验。新桥接先验证旧发布，再用固定来源及当前字节独立核对这次摘要更新，版本、候选、状态、执行、附件、claim 和原 history 均由逆向比较保护。

## 限制与复核

本回执提供构造接线和配对文档的来源适用性。各自历史 runtime 记录维持原版本与执行身份，普通宝箱的本次游戏与编辑器验收使用本任务的独立原件。若该范围、实际 caller 或业务判据再变化，按固定原件重新核验。
