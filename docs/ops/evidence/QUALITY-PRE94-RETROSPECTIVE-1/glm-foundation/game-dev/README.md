# game-dev(state-dump + dev-panel)八维复审批 —— game 包收口批

- 批次:pre-94 foundation 模块 11 批 29(game 包终批)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 62+ 提交)
- Coding Owner:GLM;两文件全文读毕(state-dump 117 / dev-panel 2342)
- 整改类型:纯注释 1 处,零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | dev-panel.ts applySceneJump docblock | "tile PNG / palette 留首屏(已知 visual 错;M5 升)"半过时 — tile 部分已被 T17 实现(sceneFetcher 取该场景 tileset blob + onSceneChanged 切 currentSceneId 路由);palette 部分仍真(scene-system.loadScene 全文无 palette 写,已核) | 拆分陈述:tile 已按 scene 路由(T17);palette 仍留首屏 + 原因与已知差异 |

## 零整改面

- **state-dump.ts**:字段对齐 sdlpal tp_dump_state.c 声明、leader wFrame 与 present 同逻辑说明准确。
- **dev-panel.ts 其余 2338 行**:BOSS_ROSTER story-grounded 三方校验考证(精灵名≠剧情名修正史/七神龙补全/user 指正条目)、彩依飞走 pan-op 锚定位论证、applyFixture 边界同步链(2.5/2.55/2.6 三层 hydrate/exp 同步)、t37 过场自动战 1:1 复刻(0x75[5,6,5]→roles[4,5,4] 真值)、法术测试 rgwName 3/4 对调 ⚠、picker generation fence、全道具 id0 观音符不 skip 修正史 — 全部准确。

## 验证

- body-invariance:dev-panel.ts printedSha256 一致 → [body-invariance.json](body-invariance.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净(dev-panel 无独立测试文件,行为由 game 全包测试覆盖,typecheck 为本批定向门)

## 模块收口

**game 包生产源码全部收口**(assets 5 + core 46 + present 29 + shell 22 + analytics 4 + tools 17 + dev 2 = 125 文件,b1-b29 累计)。下一站:content → migrate → reforge → editor 四包 → 94-102 返工。
