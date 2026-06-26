# type-pal

经典中文 2D 回合制 RPG 的浏览器版 TypeScript 原生重写。

**在线试玩:** <https://pal.illegalscreed.cn/>

这个仓库不走“把 sdlpal 的 C 引擎用 Emscripten 编译成 WASM”的路线,而是把
[`reference/sdlpal/`](reference/sdlpal/) 作为行为规格,在 TypeScript 里重建资源提取、
事件脚本、场景、战斗、菜单、存档、音频和演出系统。

- **忠实移植优先(第一阶段)**:在网页里尽量还原原版行为、时序和数据语义。
- **参考而非 fork**:sdlpal C 源只作为真值参考;运行时代码是 TS 原生实现。
- **个人自用**:项目不提供原版数据,也不面向公开发布。

## 两个阶段

项目分两套世界观,**严禁混用**(详见根 [`CLAUDE.md`](CLAUDE.md) 顶部的判断流程):

- **第一阶段 · 忠实还原(项目主体,已上线 v1.0.0)** —— 以 sdlpal / 原版为真值,在 TS 里逐系统复刻原版。本 README 下文(状态表、移植原则)讲的都是这一阶段。
- **第二阶段 · Reforge 重制(早期、活跃)** —— 全新引擎 + 内容编辑器 + 自有内容,**不对齐旧引擎 / 原版行为,架构优先**;第一阶段的「真值锚 / 双引擎对照」方法论在此**整体作废**。当前在第一刀:[`packages/reforge`](packages/reforge/) 的 Canvas 2D「鬼界民居」demo。开工铁律见 [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md),总纲见 [`docs/phase2/00-roadmap.md`](docs/phase2/00-roadmap.md)。
- **第三阶段 · MMO + 深度玩法** —— 远期设想,暂存 [`docs/phase3/`](docs/phase3/),当前不碰。

> 拿不准当前在做哪一阶段时,先按改动落在 `reforge` / `content` / `docs/phase2` 还是 `game` 判断,或回 `CLAUDE.md` 顶部。

## 第一阶段当前状态(2026-06-27)

核心系统已经整体落地,当前重心是**对照 sdlpal 源码和真实游戏表现做保真收口**。README
只写导航和快照;具体完成度以 `docs/` 里的真值表为准。

游戏本体之外还有两个玩家向外围系统:**生产工具面板**(左上悬浮、非模态,6 tab——战斗只读
信息 / 场景小地图 / 系统设置(快存快读、音量、分辨率、5 存档位各自导入导出) / 历史对话 /
速通计时器 / 快捷键速查),以及 **离线预缓存**(生产环境注册 Service Worker,两段加载进度 +
可玩门,首次加载后可离线游玩)。

权威状态表:

| 文档 | 内容 |
|---|---|
| [`docs/feature-status.md`](docs/feature-status.md) | 玩家可感知功能状态:启动、场景、剧情、战斗、菜单、音频等。 |
| [`docs/opcode-status.md`](docs/opcode-status.md) | 事件 / 战斗脚本 opcode 全集,当前口径为 164 个已知 opcode。 |
| [`docs/resource-status.md`](docs/resource-status.md) | MKF、WORD、M.MSG、音乐、视频等资源逐 chunk 提取覆盖。 |
| [`docs/item-status.md`](docs/item-status.md) | 235 个物品的用途、脚本、装备 / 投掷 / 特殊玩法状态。 |
| [`docs/magic-status.md`](docs/magic-status.md) | 102 个仙术、敌方法术、召唤、合击、特殊法术状态。 |
| [`docs/cutscene-status.md`](docs/cutscene-status.md) | 507 段自动演出的风险分级和逐场景清单。 |
| [`docs/game-mechanics.md`](docs/game-mechanics.md) | 战斗底层机制真值,包含伤害、暴击、隐藏经验、五灵抗性、出手顺序等。 |

近期审计收口:

- 2026-06-07 第一轮全子系统差异审计:
  [`docs/plans/2026-06-07-sdlpal-diff-audit.md`](docs/plans/2026-06-07-sdlpal-diff-audit.md)。
  70 条候选、64 条确认差异,已全部逐条修复。
- 2026-06-10 第二轮执行路径级深挖:
  [`docs/plans/2026-06-10-sdlpal-deep-audit.md`](docs/plans/2026-06-10-sdlpal-deep-audit.md)。
  81 条候选,9 high + 32 medium + 33 low 已修,5 条按工程判断有意保留并记录理由。

仍最值得实机继续验的方向:

- 长剧情演出:对白分页、走位停顿、淡屏时长、镜头和音画同步。
- 战斗表现:召唤、合击、变身、特殊法术动画、伤害数字时机、援护表现。
- 大世界长路线:队友跟随、明雷追击、对象隐藏 / 离屏复活、跨场景状态。
- 音频听验:BGM / CD / SFX 触发点已接,最终音色、音量和曲目正确性还要靠耳朵确认。

> `docs/plans/` 是历史档案,不代表当前状态。查现状先读上面的状态表和
> [`docs/plans/README.md`](docs/plans/README.md)。

## 快速开始

需要先把原版数据文件放进 [`data/raw/`](data/raw/)。该目录不会进 git;文件清单和注意事项见
[`data/raw/README.md`](data/raw/README.md)。

```sh
pnpm install
pnpm extract
pnpm --filter @type-pal/game dev
```

`pnpm extract` 会生成 `data/extracted/`;`packages/game/public/extracted` 是指向它的软链,游戏运行时通过
`/extracted/...` 读取资源。

## 常用命令

```sh
pnpm check          # 全 workspace typecheck + unit/regression tests
pnpm test           # 全 workspace tests
pnpm typecheck      # 全 workspace TypeScript 检查
pnpm lint           # biome check,不包含在 pnpm check 中
pnpm format         # biome format --write .
pnpm extract        # 从 data/raw/ 重新生成 data/extracted/

pnpm --filter @type-pal/game dev      # 第一阶段:浏览器运行时
pnpm --filter @type-pal/game build
pnpm --filter @type-pal/game e2e
pnpm --filter @type-pal/reforge dev   # 第二阶段:Reforge 新引擎 demo

pnpm --filter @type-pal/game exec vitest run src/core/battle/__tests__/battle-system.test.ts
pnpm --filter @type-pal/game exec vitest run -t "test case name"
```

差分测试用的 sdlpal oracle:

```sh
brew install make sdl3
bash scripts/build-sdlpal.sh
bash scripts/build-sdlpal-classic.sh

bash scripts/extract-tilemap-baseline.sh
bash scripts/extract-battle-baseline.sh
```

## 包结构

| 包 | 阶段 | 作用 |
|---|---|---|
| [`packages/shared`](packages/shared/) | 一 | 共享类型和数据结构:资源、事件命令、输入、数据表等。 |
| [`packages/pal-extract`](packages/pal-extract/) | 一 | 资源提取 CLI:把原版 MKF / 文本 / 音频 / 视频转换成 JSON、PNG、WAV/OGG/MP4 等网页资源。 |
| [`packages/game`](packages/game/) | 一 | Vite 浏览器运行时:场景、战斗、事件 VM、菜单、存档、音频、演出、canvas 表现层,以及工具面板和离线预缓存(Service Worker)。 |
| [`packages/reforge`](packages/reforge/) | 二 | Reforge 新引擎(Canvas 2D,全新重写);当前是切片 1「鬼界民居」demo(移动 / 碰撞 / 对话)。 |
| [`packages/content`](packages/content/) | 二 | 第二阶段自有内容数据(早期,雏形)。 |

关键目录:

| 路径 | 内容 |
|---|---|
| [`docs/`](docs/) | 第一阶段架构、决策、测试策略、状态表(和 [`engineering-notes.md`](docs/engineering-notes.md) 踩坑沉淀)。新读者从这里开始。 |
| [`docs/phase2/`](docs/phase2/) | 第二阶段(Reforge)文档:铁律、路线图、内容 schema、切片 spec。 |
| [`docs/plans/`](docs/plans/) | 历史里程碑、审计报告和实施计划;现状需回到状态表核实。 |
| [`reference/sdlpal/`](reference/sdlpal/) | sdlpal 源码副本,作为行为、公式、数据格式和时序的规格来源。 |
| [`data/raw/`](data/raw/) | 原版数据输入目录,不入库。 |
| `data/extracted/` | `pal-extract` 生成的运行时资源,可再生。 |
| [`scripts/`](scripts/) | sdlpal build、baseline 提取等辅助脚本。 |

## 移植原则

- 改 ported behavior 时优先对照 `reference/sdlpal/*.c`,尤其是 `script.c`、`fight.c`、
  `battle.c`、`scene.c`、`map.c`、`text.c`、`uigame.c`。
- `data/extracted/` 是生成物,不要手改;资源问题应修 `packages/pal-extract`。
- `pnpm check` 是主要门禁;视觉、音频、长剧情和真机路线问题还需要浏览器 / 原版实测。
- 完成度描述不要写百分比,以状态表里的 `claimed` / `verified` / `partial` / `todo` 为准。
