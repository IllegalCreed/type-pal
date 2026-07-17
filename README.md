# type-pal

经典中文 2D 回合制 RPG《仙剑奇侠传》的浏览器版 TypeScript 原生重写 + 现代化内容编辑器。

**在线试玩:** <https://pal.illegalscreed.cn/>

这个仓库不走"把 sdlpal 的 C 引擎用 Emscripten 编译成 WASM"的路线,而是把
[`reference/sdlpal/`](reference/sdlpal/) 作为行为规格,在 TypeScript 里重建资源提取、
事件脚本、场景、战斗、菜单、存档、音频和演出系统。

## 两个阶段

项目分两套世界观,**严禁混用**(详见根 [`CLAUDE.md`](CLAUDE.md) 顶部的判断流程):

- **第一阶段 · 忠实还原(已上线 v1.0.0)** —— 以 sdlpal / 原版为真值,在 TS 里逐系统复刻原版。
  核心系统已整体落地,当前重心是对照 sdlpal 源码和真实游戏表现做保真收口。
- **第二阶段 · Reforge 重制(活跃开发中)** —— 现代化引擎 + 在线可视化内容编辑器,目标是让用户
  能用它创建新内容、新游戏包,甚至制作一款全新的游戏。原版仙剑降级为"试炼场 + 第一份内容包 +
  迁移器练手对象"。北极星和能力地图见 [`docs/phase2/roadmap.md`](docs/phase2/roadmap.md)。
- **第三阶段 · MMO + 深度玩法** —— 远期设想,暂存 [`docs/phase3/`](docs/phase3/),当前不碰。

> 拿不准当前在做哪一阶段时,先按改动落在 `reforge` / `content` / `editor` / `migrate` / `docs/phase2`
> 还是 `game` / `pal-extract` 判断,或回 `CLAUDE.md` 顶部。

## 第一阶段:忠实还原运行时

游戏本体已上线 <https://pal.illegalscreed.cn/>。权威状态表:

| 文档 | 内容 |
|---|---|
| [`docs/phase1/status/feature-status.md`](docs/phase1/status/feature-status.md) | 玩家可感知功能状态:启动、场景、剧情、战斗、菜单、音频等。 |
| [`docs/phase1/status/opcode-status.md`](docs/phase1/status/opcode-status.md) | 事件 / 战斗脚本 opcode 全集,当前口径为 164 个已知 opcode。 |
| [`docs/phase1/status/resource-status.md`](docs/phase1/status/resource-status.md) | MKF、WORD、M.MSG、音乐、视频等资源逐 chunk 提取覆盖。 |
| [`docs/phase1/status/item-status.md`](docs/phase1/status/item-status.md) | 235 个物品的用途、脚本、装备 / 投掷 / 特殊玩法状态。 |
| [`docs/phase1/status/magic-status.md`](docs/phase1/status/magic-status.md) | 102 个仙术、敌方法术、召唤、合击、特殊法术状态。 |
| [`docs/phase1/game-mechanics.md`](docs/phase1/game-mechanics.md) | 战斗底层机制真值,包含伤害、暴击、隐藏经验、五灵抗性、出手顺序等。 |

## 第二阶段:Reforge 现代化引擎 + 编辑器

第二阶段的目标是 **一个现代化、先进、合理的引擎 + 一个编辑器,用户能用它创建新内容、新游戏包,
甚至制作一款全新的游戏(素材剧情全替换)。**

能力地图(8 领域 57 格)追踪引擎 + 编辑器的双端完成度,一格 done = 引擎能跑 AND 编辑器能编:

- **世界/场景(W1-W7)**: 单一 ProjectMapV2 地图管线(223 张 PAL 地图无损迁移)、N 层视觉 + 独立碰撞 +
  每格实例高度、图层/高度导航尺、命名传送落点闭环
- **实体(E1-E9)**: 精灵/触发区四形态创建闭环、NPC 行为模板、可拾取物、商店/当铺
- **角色(C1-C7)**: 属性/精灵/装备(结构化效果链)/头像立绘/技能/队伍管理/成长升级
- **叙事(N1-N8)**: 结构化对话(cue+rows)、事件触发、共享脚本库、过场 RNG/视频
- **战斗(B1-B10)**: 回合战核心、战场呈现、敌人 AI、状态/毒系、合体技、召唤、野外遇敌
- **元层(X0-X7)**: 存档/读档、音频基建、标题屏/入场呈现事务、入口点/开局、工程生命周期
- **迁移器(MG1-MG2)**: 全量迁移 + 增量三方合并
- **资产/分发(A1-A7)**: 工程自包含克隆、zip 导出、资源闭包地基(音乐注册表首切片 done)

权威能力地图和恢复条件: [`docs/phase2/capability-map.md`](docs/phase2/capability-map.md)。
开工铁律: [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md)。

## 快速开始

需要先把原版数据文件放进 [`data/raw/`](data/raw/)。该目录不会进 git;文件清单和注意事项见
[`data/raw/README.md`](data/raw/README.md)。

```sh
pnpm install
pnpm extract          # 从原版数据生成 data/extracted/
pnpm --filter @type-pal/game dev        # 第一阶段:浏览器运行时 (port 6005)
pnpm --filter @type-pal/editor dev      # 第二阶段:可视化编辑器 (port 6010)
```

## 常用命令

```sh
pnpm check          # 全 workspace typecheck + unit/regression tests + lint
pnpm test           # 全 workspace tests
pnpm typecheck      # 全 workspace TypeScript 检查
pnpm lint           # biome check
pnpm format         # biome format --write .
pnpm extract        # 从 data/raw/ 重新生成 data/extracted/

# 第一阶段
pnpm --filter @type-pal/game dev        # 浏览器运行时 (port 6005)
pnpm --filter @type-pal/game build      # 生产构建
pnpm --filter @type-pal/game test       # ~2300 项单测/回归

# 第二阶段
pnpm --filter @type-pal/editor dev      # 编辑器 (port 6010, PAL 工程)
pnpm --filter @type-pal/editor dev:demo # 编辑器 (port 6011, demo 工程)
pnpm --filter @type-pal/editor test     # 编辑器单测
pnpm --filter @type-pal/reforge test    # 引擎单测

# 迁移器
pnpm --filter @type-pal/migrate run migrate:content   # PAL 迁移 dry-run
pnpm --filter @type-pal/migrate run audit:maps        # 地图体积/往返审计

# 部署
./scripts/deploy.sh app    # 部署游戏壳到生产服务器
```

## 包结构

| 包 | 阶段 | 作用 |
|---|---|---|
| [`packages/shared`](packages/shared/) | 一 | 共享类型和数据结构:资源、事件命令、输入、数据表等。 |
| [`packages/pal-extract`](packages/pal-extract/) | 一 | 资源提取 CLI:把原版 MKF / 文本 / 音频 / 视频转换成 JSON、PNG、WAV/OGG/MP4 等网页资源。 |
| [`packages/game`](packages/game/) | 一 | Vite 浏览器运行时:场景、战斗、事件 VM、菜单、存档、音频、演出、canvas 表现层,以及工具面板和离线预缓存(Service Worker)。 |
| [`packages/content`](packages/content/) | 二 | 第二阶段内容数据模型、schema 校验、资产 catalog/引用收集器、对话解码器。 |
| [`packages/reforge`](packages/reforge/) | 二 | Reforge 新引擎:Canvas 2D 渲染、碰撞、脚本运行时、音频、场景切换、资产解析器。 |
| [`packages/editor`](packages/editor/) | 二 | 在线可视化内容编辑器:八模块导航、场景/地图/角色/物品/战斗/资源/工程工作台、Command/undo、FSA 工程生命周期。 |
| [`packages/migrate`](packages/migrate/) | 二 | 迁移器:PAL 原版内容 → 第二阶段 schema 的全量迁移 + MG2 增量三方合并。 |

关键目录:

| 路径 | 内容 |
|---|---|
| [`docs/`](docs/README.md) | 文档总入口,按阶段分文件夹。 |
| [`docs/phase1/`](docs/phase1/README.md) | 第一阶段文档:状态表、架构决策、工程经验、历史计划。 |
| [`docs/phase2/`](docs/phase2/README.md) | 第二阶段:铁律、路线图、能力地图、内容 schema、编辑器/资产/对话 spec。 |
| [`docs/ops/`](docs/ops/) | 多 Agent 协作:看板、任务卡、工作流。 |
| [`reference/sdlpal/`](reference/sdlpal/) | sdlpal 源码副本,作为行为、公式、数据格式和时序的规格来源。 |
| [`data/raw/`](data/raw/) | 原版数据输入目录,不入库。 |
| `data/extracted/` | `pal-extract` 生成的运行时资源,可再生。 |
| [`scripts/`](scripts/) | 部署、烘焙清单生成等辅助脚本。 |

## 开发原则

- 改 ported behavior 时优先对照 `reference/sdlpal/*.c`,尤其是 `script.c`、`fight.c`、
  `battle.c`、`scene.c`、`map.c`、`text.c`、`uigame.c`。
- `data/extracted/` 是生成物,不要手改;资源问题应修 `packages/pal-extract`。
- 第二阶段数据迁移缺陷必须先修上游(迁移器/提取器),再重新生成产物,不得手改 `projects/pal`。
- `pnpm check` 是主要门禁;视觉、音频、长剧情和真机路线问题还需要浏览器实测。
- 多 Agent 协作(三贤人系统:Codex/Opus/GLM)协议见 [`AGENTS.md`](AGENTS.md)。
