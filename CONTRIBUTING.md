# 参与贡献 / Contributing

[简体中文](README.md) | [English](README.en.md)

## English

This is an unofficial fan project. Do not add original game data files (MKF archives, RPG saves, executables, or other commercial assets) to Git. The full original data stays on your machine under `data/raw/`.

Before non-trivial work, read [`AGENTS.md`](AGENTS.md). Phase 1 (faithful recreation) follows [`CLAUDE.md`](CLAUDE.md). Phase 2 (Reforge) follows [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md). The two rule sets are not interchangeable.

Local tools: Node.js 22, pnpm, and Git.

```sh
pnpm install
pnpm check:docs    # link, index, task-status, and current-version checks; no PAL data
pnpm lint          # Biome, zero diagnostics
pnpm typecheck
pnpm test          # migrate PAL cases need a local extract
pnpm check         # full maintainer gate; the migrator’s full tests need local PAL data
```

The sections below are the maintainer notes that used to lead the root README. They are in Chinese.

## 参与前

- 先读根 README 的许可与声明。不要把原版游戏数据提交进 Git。
- 非小改先读 [`AGENTS.md`](AGENTS.md)。当前模式是分派、执行、独立验收。
- 动手前先判断阶段。第一阶段看 [`CLAUDE.md`](CLAUDE.md)，第二阶段看 [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md)。
- 访客向的项目介绍在 [`README.md`](README.md) / [`README.en.md`](README.en.md)。

## 当前开发状态

以下文字从根 README 移入，核对日期仍是 **2026-09-27**。实时进度以能力地图、任务看板和机器可读覆盖率基线为准。

第二阶段已具备可运行自包含内容工程的 Reforge，以及场景、地图、剧情、角色、物品、战斗、资源和
工程设置等编辑器工作台。本地工程打开/保存、撤销/重做、引用诊断、试玩和独立战斗模拟器已落地。
PAL 迁移使用事务发布与三方合并；开发期运行时、编辑器、工程和存档只接受当前 canonical 版本。

第一、第二阶段首轮代码审计见[审计总报告](docs/ops/audits/pre-e2e/summary.md)，确认问题按独立任务修复；
不能把审计完成当成所有缺陷已修复。全仓[13 批结构治理](docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md)
和[零诊断质量门](docs/testing/archive/legacy/batches/quality-zero/README.md)已收口，第一阶段仍可在保真前提下继续修缺陷。
双引擎 [001 开场 E2E](docs/testing/e2e/stages/001-opening/report.md)已经有独立可运行的流程、真实存档检查点和关键 NPC 稀疏时序；
这不是完整剧情通关、完整视觉/音轨验收或可直接用于宣传的录像链。

全生产源码的 Vitest/V8 fast/full 覆盖率和只升不降门禁已建立；口径见
[`docs/testing/coverage.md`](docs/testing/archive/legacy/quality/quality-gates/coverage.md)，最新入库 fast 数字以
[`scripts/coverage/baseline.fast.json`](scripts/coverage/baseline.fast.json)为准。覆盖率不替代业务断言与 E2E。
`pnpm check:docs` 检查本地链接、索引、任务状态和现行合同版本；完整文档导航见[文档首页](docs/README.md)。

接下来继续 R4 分段 E2E 与必要缺陷修复，再按[路线图](docs/phase2/roadmap.md)处理窄版意图式脚本、
完整剧情/战斗专项、编辑器综合工作流、录制适配，以及最后的预制工程与独立可玩包。
正在执行的单卡以[任务看板](docs/ops/board.md)为准。

第二阶段暂不处理真实时间/天气、随机笔刷、时间旅行调试、无障碍设置、完整对话/演出专用工作台及
版权资源批量替换；2026-09-28追加的构件化地图重建/拆房迁移也归第三阶段。这些不应从旧文档或历史任务误判为当前欠项。

## 编辑器工作区模式

| 模式 | 入口 | 保存语义 |
|---|---|---|
| PAL 开发基线 | `http://localhost:6010/` | 首次保存必须手动选择并通过校验的真实 `projects/pal` 目录；绑定后才允许正式回写。 |
| 评审 / 沙盒 | `http://localhost:6010/?ui_samples=1` | 首次保存到新建 / 空目录；之后可保存和重开，但绝不回写 `projects/pal`。 |
| 独立启动页 | `http://localhost:6011/` | `dev:demo` 只使用独立端口，不会自动载入 `projects/demo`；可新建空白工程、打开本地当前格式工程或从 PAL 开发快照创建副本。 |

`projects/pal` 目前是持续变化的**开发快照**，不是稳定的用户初始种子。不要把评审沙盒中的修改误当成 PAL 基线改动。

## Reforge 开发调试

### 编辑器战斗模拟器（首批已验收）

一级菜单 **战斗模拟器** 提供“试打方案 / 我方预设 / 敌方预设 / 背包预设”。方案可直接配置，也可复用预设；
命名配置随项目保存，本场临时调整不反写原定义。先保存作者改动，再从方案“开始试打”，或由技能、敌队、敌人原入口带入对象。
实际运行Reforge战斗；我方1～3人、敌方5槽，停止/重新试打不保留战斗消耗或奖励，独立入口不读写正常存档。
范围、验证及限制见[实施记录](docs/testing/archive/legacy/runtime/battle/battle-simulator-implementation.md)，最终状态以[归档任务卡](docs/ops/archive/tasks/done/EDITOR-SKILL-TRIAL-1-isolated-battle.md)为准。

### 普通开发调试面板

开发构建可在 URL 加 `?debug` 打开调试面板：

```text
http://localhost:6051/?debug
```

面板提供控制台、检视器、触发器、战斗构建器、图层和运行态位置控制权信息。按 `Esc` 隐藏，按反引号
重新打开；该工具只存在于开发构建，不进入生产包。完整说明见
[`docs/phase2/guides/debug-tools.md`](docs/phase2/guides/debug-tools.md)。

## 数据流

```text
data/raw
  └─ @type-pal/pal-extract ─> data/extracted
                                ├─> @type-pal/game
                                └─> @type-pal/migrate ─> projects/pal
                                                          ├─> @type-pal/editor
                                                          └─> @type-pal/reforge

projects/demo ────────────────────────────────────────────> editor / reforge
```

- `data/raw/` 是用户提供的原版输入，不入库。
- `data/extracted/` 是 `pal-extract` 的可再生输出，不手工修改。
- `@type-pal/migrate` 是第一阶段提取数据进入第二阶段内容工程的唯一离线桥。
- `projects/pal` 的迁移分区出现问题时，先修提取器、迁移器或 overlay，再重新发布；不要只给生成结果打补丁。
- `projects/demo` 和 [`projects/e2e-own/`](projects/e2e-own) 无需本地 `data/raw/` 即可运行，分别用于内置 demo 与最小内容链路回归；两者目前仍含少量 PAL 派生素材。

## 常用命令

```sh
# 全仓门禁
pnpm check          # 完整维护者门禁；迁移器完整测试需要本地 PAL 提取数据
pnpm typecheck      # 全 workspace TypeScript 检查
pnpm test           # 全 workspace 测试；其中 migrate PAL 项需要本地提取数据
pnpm lint           # 全仓 Biome 零诊断门；error/warning/info 均不可留存
pnpm check:docs     # 文档链接、索引、任务状态与现行版本；无需 PAL 素材
pnpm coverage:fast  # 全生产源码 V8 覆盖率 + 每包/全仓只升不降门禁
pnpm coverage:full  # 在 fast 基础上加入 PAL 真数据 Vitest 测试
pnpm coverage:ratchet # 维护者在完整验证后只升不降地更新 fast 基线
pnpm test:e2e-tools # 无游戏资产/浏览器的 E2E 执行器合同测试

# 格式化
pnpm format         # 只格式化相对 HEAD 的已改文件
pnpm format:all     # 格式化整个仓库

# PAL 数据与当前内容工程
pnpm extract
pnpm --filter @type-pal/migrate migrate:content          # dry-run
pnpm --filter @type-pal/migrate migrate:content --write  # 发布到 projects/pal

# 维护者：从 data/extracted 重建 reforge engine-chrome 默认 UI（不写 projects/pal）
pnpm bake

# 单包验证示例
pnpm --filter @type-pal/editor check
pnpm --filter @type-pal/editor audit:design-system
pnpm --filter @type-pal/reforge check
pnpm --filter @type-pal/migrate test:fast
pnpm --filter @type-pal/migrate test:pal                  # 需要本地 PAL 数据的较重验证
```

已落地的开场 E2E 可在具备 Chrome 和本地 PAL 资产的环境中运行 `pnpm e2e:001:both`；
它自建隔离服务、分别运行两引擎并生成检查点，不使用已打开的 6005/6051 开发页。
有/无窗口模式和目前覆盖边界见[001 执行说明](docs/testing/e2e/stages/001-opening/report.md)。

视觉、音频、浏览器文件系统、长剧情和完整游玩路线不能只靠单元测试判断，仍需按相应任务的浏览器 / E2E 验收记录执行。
覆盖率口径、基线更新规则和长期目标见 [`docs/testing/coverage.md`](docs/testing/archive/legacy/quality/quality-gates/coverage.md)。

## Workspace 结构

| 包 | 作用 |
|---|---|
| [`packages/shared`](packages/shared) | 底层 PAL 数据、资源类型和解码能力；由提取器、旧运行时以及部分二阶段工具复用。 |
| [`packages/pal-extract`](packages/pal-extract) | 把原版输入离线提取为 `data/extracted/` 中的结构化数据和网页可用资源。 |
| [`packages/game`](packages/game) | 第一阶段 Vite 浏览器运行时。 |
| [`packages/content`](packages/content) | 第二阶段 canonical 内容契约、校验、typed 引用规则和纯数据逻辑。 |
| [`packages/reforge`](packages/reforge) | 第二阶段运行时与编辑器预览能力。 |
| [`packages/editor`](packages/editor) | React 可视化编辑器、本地工程工作流、统一设计系统、撤销/重做、诊断和试玩入口。 |
| [`packages/migrate`](packages/migrate) | 从提取数据生成并事务发布当前 `projects/pal` 的离线迁移器，负责增量三方合并与重迁零计划验证。运行时和编辑器不依赖它。 |

| 工程 | 作用 |
|---|---|
| [`projects/demo`](projects/demo) | 入库的自包含示例工程；无需本地原版数据，但仍含少量 PAL 派生素材。 |
| [`projects/e2e-own`](projects/e2e-own) | 最小内容链路回归 fixture，覆盖地图、瓦片、碰撞与角色；无需本地原版数据，但并非完全自有素材。 |
| [`projects/pal`](projects/pal) | 从 PAL 数据生成并持续编辑的开发工程；不是稳定发行种子。 |

其他入口：

| 路径 | 内容 |
|---|---|
| [`docs/`](docs) | 分阶段设计、状态、审计与验收文档。 |
| [`docs/ops/tasks/`](docs/ops/tasks) | 活动任务卡、证据与交接；当前由 Codex 分派并独立验收，历史三方签字原样保留。 |
| [`reference/sdlpal/`](reference/sdlpal) | sdlpal 源码副本；是一阶段的重要参考实现，不替代原版实际行为这一首要事实来源。 |
| [`scripts/`](scripts) | 仓库维护与辅助脚本；部分命令仅供维护者使用。 |

## 开发边界

- **先判断阶段。** 第一阶段关注忠实还原；第二阶段关注现代、解耦、可创作的 canonical 架构，同时复用一阶段已经验证的机制与 UX 知识。
- **开发期 current-only。** 正式上线前，编辑器、Reforge、PAL 工程和开发期存档只支持当前 canonical 版本；旧版本由 Git 保存，不在产品代码里长期保留 upgrader、fallback 或双读写。
- **生成真源优先。** 提取或迁移缺陷修上游并重新生成，不能把 `data/extracted/` 或 `projects/pal` 的局部手改当成最终修复。
- **工程必须自包含。** 新内容工程不应在运行时偷偷读取仓库级 `data/extracted/` 或其他工程的资源。
- **提交前跑合适的门禁。** `pnpm check` 是全仓基线；功能性界面、音频和完整路线还要补最小浏览器或 E2E 证据。
- **协作状态落库。** 任务状态、设计裁决、验收和交接以 [`docs/ops/`](docs/ops) 为准；当前分派/验收模式以 [`AGENTS.md`](AGENTS.md) 为准，不把历史三签要求当成新任务门禁。

## 资产说明

本仓库不包含可替代正版游戏的完整原版数据。`data/raw/`、`data/extracted/` 及 `projects/pal` 中被忽略的派生二进制资源都应在本地按上述流程生成；运行完整 PAL 内容时，请仅使用自己合法取得的数据并遵守适用条款。

仓库当前的 demo 和回归 fixture 为开发测试入库了少量 PAL 派生素材。这些素材不应被理解为已经完成版权清理、可独立发行，或已经成为面向用户的稳定初始种子。
