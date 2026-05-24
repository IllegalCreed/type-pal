# type-pal

一款经典 2D 回合制 RPG 的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把目标游戏(一款 1998 年发布的经典中文 2D 回合制 RPG)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后扩展场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 当前状态(2026-05-24)

**M3.5 完成** —— scene 切换 + 明雷怪 + L2 Playwright 视觉对拍(M1-M3.5 全功能覆盖)。
- `pnpm -F @type-pal/game dev[?skip-intro=1]`:M3.5 dev panel(`B` 键)picker = 3 battle fixture + **5 scene jump**(scene 1 客栈 + 仙灵岛入口/通道 1/通道 2/迷宫);仙灵岛通道 1 含 4 个 sprite 468 草妖明雷接触 NPC
- **scene 切换链路**:`SceneAssetsCache` lazy 加载(D33)+ `loadScene` 函数 + `applySceneAssetsToPresent` re-render wire(tilemap / tileImages / npcSprites / setSceneContext 全同步)+ dev panel `applySceneJump` 真调
- **明雷机制**:contact monster(triggerMode>=4)走入即触发 trigger,不阻挡;Confirm-search NPC(triggerMode 1-3)仍阻挡。对照 sdlpal `play.c::PAL_PartyWalk`
- **战斗 input wire**:mainMenu / magicMenu / itemMenu / targetSelect / Cancel 全实现,5 actions 端到端 input → battle 真跑(M3 stub 时期 limitation 移除)
- **L2 Playwright 视觉基准**:23 spec(scene + battle + menu + dev)L2 全跑通,baseline PNG 本机生成不入 git(版权)。battle baseline 用 **sdlpal-classic `--dump-battle` patch**(新加)为真原版基准,catch 出我方位置 / 渲染 bug
- **sdlpal classic patch 总集**:4 个 — PAL_CLASSIC define / `--dump-map` / `--battle-harness` / **`--dump-battle`**(M3.5 新);全部活在 `pnpm e2e`
- **修了多个 M2/M3 残留**:`render-tilemap.ts` ±1 fence + sub-row offset(然后 port 到 `draw-tilemap.ts`);RLE decode 保留 opaque mask + PNG alpha 通道编码(tile + sprite,scene 16 dense 暴露 + 人物半透明);PLAYER_POSITIONS 按 sdlpal `g_rgPlayerPos[3][3][2]` 真值;ENEMY_POSITIONS 改读 ENEMYPOS table(DATA.MKF chunk 13)
- 460+ 单测 + 2 skipped + 30 L2 + 1 L2 skip(a9 contact→battle 端到端等 M5 scene events lazy load)

下一步:**M5/M6/M7**(系统补全 / 体验补全 / 通关验证),见 [`docs/03-development-plan.md`](docs/03-development-plan.md)。

**M3 Phase 1 完成**(2026-05-23) —— 战斗系统骨架 + D29 双基准 + 5 actions 全集 + dev 入口。

**M2 完成**(2026-05-23) —— 运行时垂直切片打通(scene 1 探索 + NPC 触发对话)。详见 03 plan。

**M1 完成**(2026-05-23) —— `pal-extract` 端到端打通,`pnpm extract` 一次性产出 `data/extracted/`(全量 295 scenes / 235 items / 102 spells / 153 enemies + scene 1 视觉资源)。详见 03 plan。

## 仓库结构

- `docs/` —— 设计文档(**从这里开始读**)
  - `01-feasibility.md` 背景与可行性
  - `02-architecture.md` 架构设计
  - `03-development-plan.md` 开发计划 / 里程碑
  - `04-decisions.md` 决策记录(D1–D21)
  - `05-events-schema.md` events.json 格式设计
  - `06-testing.md` 测试策略
- `reference/sdlpal/` —— sdlpal 源码,作为引擎逻辑参考(见 `reference/README.md`)
- `data/raw/` —— 放原版数据文件的地方(见 `data/raw/README.md`)

## 开发(本地)

```sh
# 一次性
brew install pnpm        # 若未装
brew install make sdl3   # sdlpal 差分测试用,见 docs/06-testing.md

# 项目本身
pnpm install
pnpm check               # 全部包的 typecheck + 测试(407+ 单测)
pnpm extract             # 跑 pal-extract 一次性产出 data/extracted/
pnpm --filter @type-pal/game dev  # 起网页游戏的 Vite 开发服务器

# sdlpal 双 build(差分测试 oracle)
bash scripts/build-sdlpal.sh          # 默认 build(M1 已用)
bash scripts/build-sdlpal-classic.sh  # PAL_CLASSIC 1995/1998 原版战斗 build(M3 D30)

# D29 双基准(M3 加,可选;baseline 不存在测试 skip + warn)
bash scripts/extract-tilemap-baseline.sh  # tilemap PNG baseline
bash scripts/extract-battle-baseline.sh   # 5 个 battle fixture 数值 baseline
```

