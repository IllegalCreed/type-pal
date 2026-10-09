# Type PAL

[简体中文](README.md) | [English](README.en.md)

用 TypeScript 从零写成的浏览器版《仙剑奇侠传》（1995，亦称 PAL）：第一阶段可以在线玩到结局，第二阶段在做新运行时和可视化编辑器。

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-pal.illegalscreed.cn-c45c26)](https://pal.illegalscreed.cn/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178c6)](https://www.typescriptlang.org/)

**[▶ 在线试玩](https://pal.illegalscreed.cn/)**

![从改地图到试玩：地图编辑、场景编辑、NPC 脚本，再到编辑器内试玩](docs/screenshots/editor-to-play.gif)

改地图、改场景、写 NPC 脚本，然后在编辑器里试玩。

<table>
<tr>
<td width="50%"><img src="docs/screenshots/gameplay-dialogue.png" alt="余杭客栈对话" width="100%"><br>第一阶段 · 余杭客栈对话</td>
<td width="50%"><img src="docs/screenshots/gameplay-battle.png" alt="回合制战斗" width="100%"><br>第一阶段 · 回合战斗</td>
</tr>
<tr>
<td><img src="docs/screenshots/tools-panel.png" alt="开发者工具面板" width="100%"><br>第一阶段 · 场景、坐标与剧本工具</td>
<td><img src="docs/screenshots/tools-speedrun-timer.png" alt="速通计时" width="100%"><br>第一阶段 · 速通计时</td>
</tr>
<tr>
<td><img src="docs/screenshots/editor-map-suzhou.png" alt="苏州城地图" width="100%"><br>第二阶段 · 苏州城地图</td>
<td><img src="docs/screenshots/editor-character.png" alt="角色属性" width="100%"><br>第二阶段 · 角色属性</td>
</tr>
<tr>
<td><img src="docs/screenshots/editor-battle-simulator.png" alt="战斗模拟器" width="100%"><br>第二阶段 · 战斗模拟器</td>
<td><img src="docs/screenshots/editor-references.png" alt="引用诊断" width="100%"><br>第二阶段 · 引用诊断</td>
</tr>
<tr>
<td><img src="docs/screenshots/editor-play-preview.png" alt="编辑器内试玩" width="100%"><br>第二阶段 · 编辑器内试玩</td>
<td></td>
</tr>
</table>

## 它是什么

| 阶段 | 状态 | 内容 |
|---|---|---|
| 第一阶段 · 忠实复刻 | [v1.0.0](https://github.com/IllegalCreed/type-pal/releases/tag/v1.0.0) 已上线 | 浏览器运行时 [`@type-pal/game`](packages/game)。主线可以端到端玩通：打败拜月教主，结局演出正确。这个版本标记的是「首次完整可通关」，不是「无 bug 稳定版」。 |
| 第二阶段 · Reforge | 正在开发 | 新运行时 [`@type-pal/reforge`](packages/reforge)、React 可视化编辑器 [`@type-pal/editor`](packages/editor)、离线迁移器 [`@type-pal/migrate`](packages/migrate)。 |
| 第三阶段 · 产品化 | 规划中 | 按发行范围替换版权资源，并规划官网、离线桌面发行等。见 [`docs/phase3/README.md`](docs/phase3/README.md)。 |

第一阶段已经做到的，来自 [v1.0.0 发布说明](https://github.com/IllegalCreed/type-pal/releases/tag/v1.0.0) 和仓库里的实现说明：

- 用 [`@type-pal/pal-extract`](packages/pal-extract) 从原版 MKF 归档解包数据表、精灵和事件字节码。YJ1 解压对应参考树里的 `yj1.c`（见 [`reference/README.md`](reference/README.md)）。
- TypeScript 事件字节码解释器驱动对话、过场、场景切换和战斗触发。
- 320×200 索引色软件帧缓冲：位图存调色板下标，blit 时上色。
- 回合制战斗：行动队列、伤害公式、法术、状态、敌方 AI、动画时间线。
- 原版 MIDI 在浏览器里用 SpessaSynth 合成。音色库是 TimGM6mb，许可见下文。

第二阶段已经落地的部分（细节以 [能力地图](docs/phase2/capability-map.md) 和 [任务看板](docs/ops/board.md) 为准）：

- 编辑场景、地图、剧情、角色、物品、战斗、资源和工程设置。
- 本地工程打开/保存、撤销/重做、引用诊断、试玩，以及独立战斗模拟器。
- PAL 内容用事务发布和三方合并迁进当前内容工程。
- 不依赖源码仓库的独立可玩包仍是本阶段收口项，尚未完成。

## 和 sdlpal 的 WebAssembly 移植有什么不同

[`reference/sdlpal/`](reference/sdlpal) 是 [sdlpal](https://github.com/sdlpal/sdlpal) 的 C 源码副本，只作引擎逻辑的参考规格，在本仓库里不编译、不运行。解包、脚本虚拟机、320×200 调色板渲染、战斗系统和编辑器都是 TypeScript 实现。原版数据和行为是第一阶段的首要事实来源；sdlpal 是参考实现。

## 快速开始

需要 Node.js 22、pnpm 和 Git。

不准备原版数据时，可以跑自包含 demo，或在编辑器里新建空白工程。demo 的运行依赖已随工程入库，其中仍有少量 PAL 派生示例素材：

```sh
pnpm install

# Reforge 自动载入自包含 demo
pnpm --filter @type-pal/reforge dev      # http://localhost:6050

# 编辑器启动页；可新建空白工程或打开本地当前格式工程，不会自动载入 demo
pnpm --filter @type-pal/editor dev:demo  # http://localhost:6011
```

跑完整 PAL 内容时，把合法取得的原版数据放进 [`data/raw/`](data/raw)（文件清单见 [`data/raw/README.md`](data/raw/README.md)），再提取并迁移：

```sh
pnpm install
pnpm extract
pnpm --filter @type-pal/migrate migrate:content --write
```

然后按需要启动：

```sh
pnpm --filter @type-pal/editor dev      # 编辑器 + PAL，http://localhost:6010
pnpm --filter @type-pal/reforge dev:pal # Reforge + PAL，http://localhost:6051
pnpm --filter @type-pal/game dev        # 第一阶段运行时，https://localhost:6005
```

迁移命令默认 dry-run；只有 `--write` 会更新 `projects/pal`。第一阶段 dev 使用本地自签 HTTPS，浏览器第一次打开 6005 需要手动确认证书。更多命令、调试入口和开发边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 仓库里有什么

| 应用 | 包 | 用途 | 本地端口 |
|---|---|---|---:|
| 第一阶段运行时 | [`@type-pal/game`](packages/game) | 已上线的忠实还原版浏览器游戏，也是第二阶段的行为/UX 参考。 | 6005 |
| Reforge | [`@type-pal/reforge`](packages/reforge) | 读取现代内容工程的新运行时。 | 6050 / 6051 |
| 编辑器 | [`@type-pal/editor`](packages/editor) | 可视化编辑地图、场景、剧情、角色、物品、战斗、资源和项目设置。 | 6010 / 6011 |

其余包：[`packages/shared`](packages/shared)（共享类型与解码）、[`packages/pal-extract`](packages/pal-extract)（离线提取）、[`packages/content`](packages/content)（第二阶段内容契约）、[`packages/migrate`](packages/migrate)（离线迁移）。文档入口是 [`docs/README.md`](docs/README.md)。

## 进度看哪里

能力格、任务状态和内容格式版本会变，本页不复制这些活账。

| 需要了解什么 | 入口 |
|---|---|
| 第一阶段 | [`docs/phase1/README.md`](docs/phase1/README.md) |
| 第二阶段开工边界 | [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md) |
| 第二阶段完成度 | [`docs/phase2/capability-map.md`](docs/phase2/capability-map.md) |
| 第二阶段路线 | [`docs/phase2/roadmap.md`](docs/phase2/roadmap.md) |
| 第三阶段规划 | [`docs/phase3/README.md`](docs/phase3/README.md) |
| 正在做的任务 | [`docs/ops/board.md`](docs/ops/board.md) |

## 开发方式

这个仓库是和维护者一起工作的 AI 编程助手写出来的。协作规则在 [`AGENTS.md`](AGENTS.md)：任务卡、同一份实现文件同一时间只有一个编码负责人、独立验收。当前是分派 / 执行 / 独立验收；文件里还留着更早的三方会签记录，那些记录不自动变成新任务的门禁。

## 许可与声明

**非官方同人项目。** 与大宇、软星以及《仙剑奇侠传》的权利人无关，未获官方授权或认可。原版资源与在线试玩仅供学习交流；权利人如有要求，将立即下架。请支持正版。

权利问题或下架请求，请在本仓库开 [GitHub Issue](https://github.com/IllegalCreed/type-pal/issues/new/choose)。

- 本仓库为这个项目编写的代码，按 [GNU General Public License v3.0](LICENSE) 授权，与参考实现 sdlpal 的 GPLv3 一致。
- 完整原版游戏数据不在 Git 里。在线试玩是托管构建；在本机跑完整 PAL 内容，需要自己准备合法取得的原版数据。
- 已入库的 demo、回归 fixture，以及 Reforge 默认界面里的一部分贴图，含少量 PAL 派生素材。它们不是已经完成版权清理、可以独立发行的资源，也不会因为代码采用 GPL 就变成可以再授权的原版美术。来源说明见 [`PROVENANCE.md`](packages/reforge/src/engine-chrome/assets/PROVENANCE.md)。
- 第三方组件保留各自的许可。仓库根上的 GPL-3.0 不改写这些许可。

### 第三方许可

| 来源 | 许可 | 说明 |
|---|---|---|
| [`reference/sdlpal/`](reference/sdlpal) | GPL-3.0（[`LICENSE`](reference/sdlpal/LICENSE)） | 上游源码副本，只作参考。 |
| `reference/sdlpal/timidity/` | [`COPYING`](reference/sdlpal/timidity/COPYING) 是 Artistic License；同目录 README 写明上游允许在 GPL、LGPL、Artistic 中选择 | 只在参考树里，不参与本仓库的构建。 |
| `reference/sdlpal/adplug/` | [`NOTES/COPYING`](reference/sdlpal/adplug/NOTES/COPYING) 为 LGPL-2.1 | 说明文字写的是随附的旧版 LGPL OPL 模拟器。同一份说明提到的、限制商业再分发的较新 MAME 许可版本，不是这份副本所附的那一版。 |
| `reference/sdlpal/overlay/` | CC BY 4.0（[`COPYING`](reference/sdlpal/overlay/COPYING)） | libretro 叠层素材，只在参考树里。 |
| GNU Unifont | OFL-1.1，或 GPL-2.0-or-later 加字体嵌入例外 | 见 [`PROVENANCE.md`](packages/reforge/src/engine-chrome/assets/PROVENANCE.md)、[`OFL-1.1.txt`](packages/reforge/src/engine-chrome/assets/licenses/OFL-1.1.txt)、[`COPYING`](packages/reforge/src/engine-chrome/assets/licenses/COPYING)。 |
| TimGM6mb 音色库 | 仓库内说明写的是 GPL-2，并链接 GPL version 2 文本，没有 “or later” | [`packages/game/public/soundfont-LICENSE.txt`](packages/game/public/soundfont-LICENSE.txt) 与 Reforge 里的同文副本。音色库仍按该说明分发，根目录 GPL-3.0 不把它改成 GPL-3.0。 |

## 维护者

命令、调试入口、数据流和开发边界在 [CONTRIBUTING.md](CONTRIBUTING.md)。多 Agent 协议在 [`AGENTS.md`](AGENTS.md)。
