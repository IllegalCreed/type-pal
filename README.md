# Type PAL

《仙剑奇侠传》的浏览器 TypeScript 实现，以及围绕现代内容格式构建的 Reforge 运行时、可视化编辑器和 PAL 内容迁移工具。

- 第一阶段在线试玩：<https://pal.illegalscreed.cn/>
- 当前开发主线：**第二阶段 Reforge（新运行时 + 内容编辑器 + 迁移器）**
- 本页状态快照：**2026-09-05**；实时进度以能力地图和任务看板为准。
- 完整原版游戏数据不在仓库中；运行 PAL 内容需要自行准备合法取得的原版数据。现有 demo / 回归 fixture 含少量入库的 PAL 派生素材，不代表版权清理或用户种子已经完成。

## 仓库里有什么

| 应用 | 包 | 用途 | 本地端口 |
|---|---|---|---:|
| 第一阶段运行时 | [`@type-pal/game`](packages/game/) | 忠实还原版浏览器游戏；已上线，当前作为冻结运行时和行为/UX 参考。 | 6005 |
| Reforge | [`@type-pal/reforge`](packages/reforge/) | 读取现代内容工程的新运行时，负责场景、脚本、战斗、存档、音频和预览。 | 6050 / 6051 |
| 编辑器 | [`@type-pal/editor`](packages/editor/) | 可视化编辑地图、场景、剧情、角色、物品、战斗、资源和项目设置。 | 6010 / 6011 |

## 项目路线

项目分三阶段推进，第一阶段与第二阶段的工程目标和判断标准不能混用：

1. **第一阶段 · 忠实还原（v1.0.0 已上线）**
   以原版数据和实际行为为首要事实来源，参考 sdlpal 与一阶段考证，在 TypeScript 中重建游戏。`@type-pal/game` 当前冻结，保留为已发布产品、一阶段知识库和第二阶段 UX 参考。
2. **第二阶段 · Reforge（活跃开发）**
   从现代内容契约出发重写运行时和编辑器，让作者能创建、编辑和运行自有内容工程，并补齐自包含分发地基。PAL 是试炼场、迁移样本和第一份内容包，不是新架构的实现模板；无需源码仓库的独立可玩包仍是本阶段收口项，尚未完成。
3. **第三阶段 · 产品化（规划中）**
   按发行范围替换版权资源，再建设官网、离线桌面发行、用户系统、在线工程托管与本地化工作台。MMO 和深度玩法属于更远期设想，不是第三阶段当前承诺。

开始工作前请先选对阶段：

| 需要了解什么 | 权威入口 |
|---|---|
| 第一阶段状态与机制 | [`docs/phase1/README.md`](docs/phase1/README.md)、[`docs/phase1/game-mechanics.md`](docs/phase1/game-mechanics.md) |
| 第二阶段开工边界 | [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md) |
| 第二阶段当前完成度 | [`docs/phase2/capability-map.md`](docs/phase2/capability-map.md) |
| 第二阶段产品路线 | [`docs/phase2/roadmap.md`](docs/phase2/roadmap.md) |
| 第三阶段规划 | [`docs/phase3/README.md`](docs/phase3/README.md) |
| 正在进行的任务 | [`docs/ops/board.md`](docs/ops/board.md) |
| 多 Agent 协作规则 | [`AGENTS.md`](AGENTS.md) |

能力格数量、任务状态和 canonical 格式版本会持续变化；根 README 不复制这些活账，以上述状态文档和迁移器说明为准。

## 当前开发状态

第二阶段已经不再是概念验证：Reforge 可以运行自包含的现代内容工程，编辑器已经具备场景、地图、剧情、
角色、物品、战斗、资源和工程设置等主要工作台，以及本地工程打开/保存、撤销/重做、引用诊断、试玩和
统一设计系统。PAL 全量迁移使用事务发布与三方合并；开发期运行时、编辑器、工程和存档只接受当前
canonical 版本。

当前正在补齐的是“能编辑”之后的完整创作闭环：统一工程引用边、删除保护和场景生命周期已经完成，下一项是商店生命周期。
商店闭环后先开展第一、第二阶段全仓代码审计并处理 E2E 阻断问题，再依次进入薄 E2E 基线、窄版意图式脚本能力、战斗专项与完整通关 E2E、编辑器综合工作流、录制适配，
最后再做服务器版本化预制工程和独立可玩包。准确顺序见
[`docs/phase2/capability-map.md`](docs/phase2/capability-map.md)；正在执行的单卡见
[`docs/ops/board.md`](docs/ops/board.md)。

第二阶段暂不处理真实时间/天气、随机笔刷、时间旅行调试、无障碍设置、完整对话/演出专用工作台及
版权资源批量替换；这些已经明确移交第三阶段，不应从旧文档或历史任务误判为当前欠项。

## 快速开始

需要本地安装 Node.js、pnpm 和 Git。

### 无需本地原版数据：运行 demo 或创建空白工程

[`projects/demo/`](projects/demo/) 的运行依赖已随工程自包含，因此不需要本地 `data/raw/`；其中仍含少量 PAL 派生示例素材：

```sh
pnpm install

# Reforge 自动载入自包含 demo
pnpm --filter @type-pal/reforge dev      # http://localhost:6050

# 编辑器启动页；可新建空白工程或打开本地当前格式工程，不会自动载入 demo
pnpm --filter @type-pal/editor dev:demo  # http://localhost:6011
```

### 使用 PAL 开发工程

先把原版数据放入 [`data/raw/`](data/raw/)，文件清单见 [`data/raw/README.md`](data/raw/README.md)。原始文件、提取结果和迁移后的二进制资产不会全部进入 Git，因此 fresh clone 必须完成提取和工程物化：

```sh
pnpm install
pnpm extract
pnpm --filter @type-pal/migrate migrate:content --write
```

之后按需要启动一个应用：

```sh
pnpm --filter @type-pal/editor dev      # 编辑器 + PAL，http://localhost:6010
pnpm --filter @type-pal/reforge dev:pal # Reforge + PAL，http://localhost:6051
pnpm --filter @type-pal/game dev        # 第一阶段运行时，https://localhost:6005
```

迁移命令默认 dry-run；只有显式传入 `--write` 才会事务性更新 `projects/pal`。迁移与资源物化细节见 [`packages/migrate/README.md`](packages/migrate/README.md)。

第一阶段 dev 使用本地自签 HTTPS 证书，浏览器首次访问 6005 时需要手动确认。

## 编辑器工作区模式

| 模式 | 入口 | 保存语义 |
|---|---|---|
| PAL 开发基线 | `http://localhost:6010/` | 首次保存必须手动选择并通过校验的真实 `projects/pal` 目录；绑定后才允许正式回写。 |
| 评审 / 沙盒 | `http://localhost:6010/?ui_samples=1` | 首次保存到新建 / 空目录；之后可保存和重开，但绝不回写 `projects/pal`。 |
| 独立启动页 | `http://localhost:6011/` | `dev:demo` 只使用独立端口，不会自动载入 `projects/demo`；可新建空白工程、打开本地当前格式工程或从 PAL 开发快照创建副本。 |

`projects/pal` 目前是持续变化的**开发快照**，不是稳定的用户初始种子。不要把评审沙盒中的修改误当成 PAL 基线改动。

## Reforge 开发调试

开发构建可在 URL 加 `?debug` 打开调试面板：

```text
http://localhost:6051/?debug
```

面板提供控制台、检视器、触发器、战斗构建器、图层和运行态位置控制权信息。按 `Esc` 隐藏，按反引号
重新打开；该工具只存在于开发构建，不进入生产包。完整说明见
[`docs/phase2/dev-tools.md`](docs/phase2/dev-tools.md)。

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
- `projects/demo` 和 [`projects/e2e-own/`](projects/e2e-own/) 无需本地 `data/raw/` 即可运行，分别用于内置 demo 与最小内容链路回归；两者目前仍含少量 PAL 派生素材。

## 常用命令

```sh
# 全仓门禁
pnpm check          # 完整维护者门禁；迁移器完整测试需要本地 PAL 提取数据
pnpm typecheck      # 全 workspace TypeScript 检查
pnpm test           # 全 workspace 测试；其中 migrate PAL 项需要本地提取数据
pnpm lint           # biome check .

# 格式化
pnpm format         # 只格式化相对 HEAD 的已改文件
pnpm format:all     # 格式化整个仓库

# PAL 数据与当前内容工程
pnpm extract
pnpm bake                                                # 单独重建可再生资产
pnpm --filter @type-pal/migrate migrate:content          # dry-run
pnpm --filter @type-pal/migrate migrate:content --write  # 发布到 projects/pal

# 单包验证示例
pnpm --filter @type-pal/editor check
pnpm --filter @type-pal/editor audit:design-system
pnpm --filter @type-pal/reforge check
pnpm --filter @type-pal/migrate test:fast
pnpm --filter @type-pal/migrate test:pal                  # 需要本地 PAL 数据的较重验证
```

视觉、音频、浏览器文件系统、长剧情和完整游玩路线不能只靠单元测试判断，仍需按相应任务的浏览器 / E2E 验收记录执行。

## Workspace 结构

| 包 | 作用 |
|---|---|
| [`packages/shared`](packages/shared/) | 底层 PAL 数据、资源类型和解码能力；由提取器、旧运行时以及部分二阶段工具复用。 |
| [`packages/pal-extract`](packages/pal-extract/) | 把原版输入离线提取为 `data/extracted/` 中的结构化数据和网页可用资源。 |
| [`packages/game`](packages/game/) | 第一阶段 Vite 浏览器运行时。 |
| [`packages/content`](packages/content/) | 第二阶段 canonical 内容契约、校验、typed 引用规则和纯数据逻辑。 |
| [`packages/reforge`](packages/reforge/) | 第二阶段运行时与编辑器预览能力。 |
| [`packages/editor`](packages/editor/) | React 可视化编辑器、本地工程工作流、统一设计系统、撤销/重做、诊断和试玩入口。 |
| [`packages/migrate`](packages/migrate/) | 从提取数据生成并事务发布当前 `projects/pal` 的离线迁移器，负责增量三方合并与重迁零计划验证。运行时和编辑器不依赖它。 |

| 工程 | 作用 |
|---|---|
| [`projects/demo`](projects/demo/) | 入库的自包含示例工程；无需本地原版数据，但仍含少量 PAL 派生素材。 |
| [`projects/e2e-own`](projects/e2e-own/) | 最小内容链路回归 fixture，覆盖地图、瓦片、碰撞与角色；无需本地原版数据，但并非完全自有素材。 |
| [`projects/pal`](projects/pal/) | 从 PAL 数据生成并持续编辑的开发工程；不是稳定发行种子。 |

其他入口：

| 路径 | 内容 |
|---|---|
| [`docs/`](docs/) | 分阶段设计、状态、审计与验收文档。 |
| [`docs/ops/tasks/`](docs/ops/tasks/) | 带证据和三方签字的任务卡。 |
| [`reference/sdlpal/`](reference/sdlpal/) | sdlpal 源码副本；是一阶段的重要参考实现，不替代原版实际行为这一首要事实来源。 |
| [`scripts/`](scripts/) | 仓库维护与辅助脚本；部分命令仅供维护者使用。 |

## 开发边界

- **先判断阶段。** 第一阶段关注忠实还原；第二阶段关注现代、解耦、可创作的 canonical 架构，同时复用一阶段已经验证的机制与 UX 知识。
- **开发期 current-only。** 正式上线前，编辑器、Reforge、PAL 工程和开发期存档只支持当前 canonical 版本；旧版本由 Git 保存，不在产品代码里长期保留 upgrader、fallback 或双读写。
- **生成真源优先。** 提取或迁移缺陷修上游并重新生成，不能把 `data/extracted/` 或 `projects/pal` 的局部手改当成最终修复。
- **工程必须自包含。** 新内容工程不应在运行时偷偷读取仓库级 `data/extracted/` 或其他工程的资源。
- **提交前跑合适的门禁。** `pnpm check` 是全仓基线；功能性界面、音频和完整路线还要补最小浏览器或 E2E 证据。
- **协作状态落库。** 任务状态、设计裁决、签字和交接以 [`docs/ops/`](docs/ops/) 为准，不把聊天记录当唯一真相。

## 资产说明

本仓库不包含可替代正版游戏的完整原版数据。`data/raw/`、`data/extracted/` 及 `projects/pal` 中被忽略的派生二进制资源都应在本地按上述流程生成；运行完整 PAL 内容时，请仅使用自己合法取得的数据并遵守适用条款。

仓库当前的 demo 和回归 fixture 为开发测试入库了少量 PAL 派生素材。这些素材不应被理解为已经完成版权清理、可独立发行，或已经成为面向用户的稳定初始种子。
