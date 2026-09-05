# reference/sdlpal

这是 [sdlpal](https://github.com/sdlpal/sdlpal) 的源码副本(浅克隆,已去掉 `.git` 和子模块),作为本项目的**引擎逻辑参考规格**。

- 许可证:GPLv3(见 `sdlpal/LICENSE`)。
- 它**不是**要被编译或运行的;我们只读它,理解原版引擎的逻辑,然后用 TS 重写。
- **真值层级（对齐根 CLAUDE.md）**：`data/raw/` 的大宇原始数据（MKF/RPG/EXE）是最终真值；
  sdlpal 是**参考实现，不是原版本身**——当 sdlpal 可能偏离原版、或运行时行为无法从提取数据推导时，
  以原始数据与真实 `PAL.EXE` 观察为准，不得把 C 源码冒充原版结论。战斗公式、opcode 语义、
  MKF 格式的日常查证仍以这份 C 源码为首选参考。

## 关键文件地图

用 TS 重写时,照下面这些文件:

| 文件 | 作用 | 对应我们的 |
|---|---|---|
| `script.c` | 字节码解释器(opcode VM) | 事件系统 + pal-extract 的反汇编器 |
| `battle.c` `fight.c` | 战斗系统、伤害公式 | 战斗系统 |
| `scene.c` | 场景(地图 + 精灵 + 事件) | 场景系统 |
| `map.c` | 瓦片地图 | 场景系统 / 地图渲染 |
| `play.c` | 探索主循环、行走、NPC 交互 | 场景系统 / 主循环 |
| `game.c` `global.c` | 游戏状态、全局数据表 | GameState |
| `ui.c` `uigame.c` `uibattle.c` `itemmenu.c` `magicmenu.c` | UI / 菜单 | 表现层 UI |
| `res.c` | 资源加载(MKF) | pal-extract |
| `yj1.c` | YJ1 解压算法 | pal-extract |
| `palette.c` `video.c` | 调色板、渲染 | 表现层渲染 |
| `text.c` `font.c` | 文字、字库 | pal-extract / 文字渲染 |
| `input.c` | 输入 | 外壳层输入 |
| `audio.c` `sound.c` `rixplay.cpp` `midi.c` | 音频 | 音频转换 / 外壳层 |
| `ending.c` | 结局 | 事件系统 |
| `aviplay.c` | AVI 过场播放 | 视频转换 / 外壳层 |
| `global.h` `common.h` | 核心数据结构定义 | 各处类型定义 |

`sdlpal/docs/` 里有 sdlpal 自己的文档。

## 如何恢复 / 更新

```sh
git clone --depth 1 https://github.com/sdlpal/sdlpal.git reference/sdlpal
rm -rf reference/sdlpal/.git
```
